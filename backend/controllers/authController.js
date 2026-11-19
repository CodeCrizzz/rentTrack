const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = require('../middleware/authMiddleware');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { formatPhoneNumber } = require('../utils/phoneUtils');
const { revokeToken } = require('../utils/tokenBlacklist');
const { getPermissionsForRole } = require('../middleware/rbacMiddleware');

const resolveGoogleClientId = () => {
    const envVal = (process.env.GOOGLE_CLIENT_ID || '').trim();
    if (envVal) return envVal;
    try {
        const envPath = path.join(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
            const parsedVal = (parsed.GOOGLE_CLIENT_ID || '').trim();
            if (parsedVal) {
                process.env.GOOGLE_CLIENT_ID = parsedVal;
                return parsedVal;
            }
        }
    } catch (e) {
        // ignore fallback read errors
    }
    return '';
};

// @desc    Register a new user (Tenant only for public signups)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    const { name, email, password, role, phone, gender, address, firstName, lastName } = req.body;
    const resolvedName = (name && name.trim()) || [firstName, lastName].filter(Boolean).map(s => String(s).trim()).join(' ');

    if (!email || !resolvedName || !password) {
        return res.status(400).json({ 
            field: !resolvedName ? 'name' : (!email ? 'email' : 'password'),
            message: 'First name, last name, email, and password are required.' 
        });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const formattedPhone = phone ? formatPhoneNumber(phone) : null;
    const cleanPhoneDigits = phone ? String(phone).replace(/\D/g, '') : '';

    try {
        // 1. Check duplicate email (case-insensitive & trimmed)
        const emailCheck = await db.query(
            'SELECT id, name, status, role FROM users WHERE LOWER(TRIM(email)) = $1',
            [cleanEmail]
        );

        if (emailCheck.rows.length > 0) {
            const existing = emailCheck.rows[0];
            if (existing.status === 'Pending') {
                return res.status(409).json({
                    field: 'email',
                    status: existing.status,
                    message: 'An account registration with this email is already submitted and awaiting administrator approval.'
                });
            } else if (existing.status === 'Declined') {
                return res.status(409).json({
                    field: 'email',
                    status: existing.status,
                    message: 'An account application with this email was previously declined. Please contact the administrator for assistance.'
                });
            } else {
                return res.status(409).json({
                    field: 'email',
                    status: existing.status,
                    message: 'An account with this email address already exists. Please log in instead.'
                });
            }
        }

        // 2. Check duplicate phone number if provided
        if (formattedPhone && cleanPhoneDigits && cleanPhoneDigits.length >= 7) {
            const phoneCheck = await db.query(
                `SELECT id, name, status FROM users 
                 WHERE phone IS NOT NULL AND (
                     phone = $1 OR 
                     regexp_replace(phone, '\\D', '', 'g') = $2
                 )`,
                [formattedPhone, cleanPhoneDigits]
            );

            if (phoneCheck.rows.length > 0) {
                const existing = phoneCheck.rows[0];
                if (existing.status === 'Pending') {
                    return res.status(409).json({
                        field: 'phone',
                        status: existing.status,
                        message: 'An account registration using this mobile phone number is already pending administrator approval.'
                    });
                } else {
                    return res.status(409).json({
                        field: 'phone',
                        status: existing.status,
                        message: 'An account with this phone number is already registered. Please check your credentials or log in.'
                    });
                }
            }
        }

        // 3. Check duplicate resident full name (case-insensitive) for tenants
        if (resolvedName) {
            const nameCheck = await db.query(
                `SELECT id, status FROM users 
                 WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND role = 'tenant'`,
                [resolvedName]
            );

            if (nameCheck.rows.length > 0) {
                const existing = nameCheck.rows[0];
                if (existing.status === 'Pending') {
                    return res.status(409).json({
                        field: 'name',
                        status: existing.status,
                        message: `An account registration under the name "${resolvedName}" is already submitted and pending review.`
                    });
                } else if (existing.status === 'Active') {
                    return res.status(409).json({
                        field: 'name',
                        status: existing.status,
                        message: `A resident account under the name "${resolvedName}" is already registered. If this is your account, please log in or contact the office.`
                    });
                }
            }
        }

        // Hash password with bcrypt before storing (Principle of Defense in Depth)
        const hashedPassword = await hashPassword(password); 

        // Enforce Least Privilege: public registration is strictly for tenants with 'Pending' approval status
        const roleToSet = 'tenant';
        const statusToSet = 'Pending';

        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role, phone, gender, address, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, status',
            [resolvedName, cleanEmail, hashedPassword, roleToSet, formattedPhone, gender || 'Not Specified', address || null, statusToSet]
        );

        const registeredUser = newUser.rows[0];

        // Notify admin if offline when tenant submits an account for approval
        if (roleToSet === 'tenant' && statusToSet === 'Pending') {
            try {
                const adminNotificationService = require('../services/adminNotificationService');
                adminNotificationService.notifyAdminsIfOffline({
                    title: 'Account Approval Request',
                    message: `Tenant ${resolvedName} submitted an account registration and is waiting for your approval.`,
                    type: 'account_approval',
                    link: '/admin/tenants'
                });
            } catch (notifErr) {
                console.error('Error queuing offline registration notification:', notifErr.message);
            }
        }

        res.status(201).json({
            message: 'User registered successfully. Your account is pending administrator approval.',
            user: registeredUser
        });
    } catch (error) {
        console.error('Registration Error:', error);

        // Catch Postgres Unique Constraint Violation (Code 23505) gracefully
        if (error.code === '23505') {
            if (error.constraint === 'users_email_key' || (error.detail && error.detail.includes('email'))) {
                return res.status(409).json({
                    field: 'email',
                    message: 'An account with this email address already exists. Please log in instead.'
                });
            }
            return res.status(409).json({
                field: 'general',
                message: 'An account with these credentials already exists. Please verify your details or log in.'
            });
        }

        res.status(500).json({ message: 'Server error during registration' });
    }
};

const getAccountStatusRejection = (status) => {
    if (status === 'Declined') {
        return {
            code: 'ACCOUNT_DECLINED',
            message: 'Your account application was declined. Please contact the administrator.'
        };
    }
    if (status === 'Pending') {
        return {
            code: 'ACCOUNT_PENDING',
            message: 'Your account is pending administrator approval.'
        };
    }
    if (status === 'Suspended' || status === 'Inactive') {
        return {
            code: 'ACCOUNT_DISABLED',
            message: 'Your account is currently disabled or inactive. Please contact the administrator.'
        };
    }
    return null;
};

const buildAuthSuccessPayload = (user, message, extraUserFields = {}) => {
    const sessionExpiry = process.env.JWT_EXPIRES_IN || (user.role === 'admin' ? '8h' : '24h');
    const jwtId = crypto.randomUUID();

    const token = jwt.sign(
        {
            id: user.id,
            sub: String(user.id),
            role: user.role,
            status: user.status,
            jti: jwtId
        },
        JWT_SECRET,
        {
            expiresIn: sessionExpiry,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        }
    );

    try {
        const presenceService = require('../services/presenceService');
        presenceService.recordActivity(user.id);
    } catch (e) {
        // non-blocking
    }

    const userPermissions = getPermissionsForRole(user.role);

    return {
        message,
        token,
        expiresIn: sessionExpiry,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            permissions: userPermissions,
            ...extraUserFields
        }
    };
};

// @desc    Authenticate user & issue modern RFC 7519 compliant JWT
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // 1. Find the user by email
        const result = await db.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [email || '']);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Account does not exist' });
        }

        const user = result.rows[0];

        // 2. Bcrypt constant-time password comparison
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // 3. Role Validation: If the login request specifies a role (e.g. from Admin portal), verify it
        if (role && user.role !== role) {
            return res.status(403).json({ message: 'Invalid credentials for this portal' });
        }

        // 4. Lifecycle & Status Validation (Account Access Control)
        const rejection = getAccountStatusRejection(user.status);
        if (rejection) {
            return res.status(403).json(rejection);
        }

        // 5. Generate Modern JWT Token with RFC 7519 standard claims
        res.status(200).json(buildAuthSuccessPayload(user, 'Login successful'));
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Expose configured Google OAuth Client ID to frontend
// @route   GET /api/auth/google/config
const getGoogleConfig = (req, res) => {
    const clientId = resolveGoogleClientId();
    res.status(200).json({ clientId });
};

// @desc    Authenticate with Google OAuth & issue modern RFC 7519 compliant JWT
// @route   POST /api/auth/google
const googleAuth = async (req, res) => {
    const { credential, id_token, access_token } = req.body;

    try {
        let googleUser = null;
        const configuredClientId = resolveGoogleClientId();

        // 1. Verify official Google ID token if provided
        const tokenToVerify = id_token || credential;
        if (tokenToVerify) {
            try {
                const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`;
                const verifyRes = await fetch(verifyUrl);
                if (verifyRes.ok) {
                    const data = await verifyRes.json();
                    const audienceMatches = !configuredClientId || data.aud === configuredClientId;
                    if (audienceMatches && data.email) {
                        googleUser = {
                            sub: data.sub,
                            email: data.email,
                            name: data.name || data.given_name || 'Google User',
                            picture: data.picture,
                            email_verified: data.email_verified === 'true' || data.email_verified === true
                        };
                    }
                }
            } catch (vErr) {
                console.error('[GoogleAuth] ID token verification error:', vErr.message);
            }
        }

        // 2. Verify official Google OAuth2 access token if provided
        if (!googleUser && access_token) {
            try {
                const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${access_token}` }
                });
                if (userinfoRes.ok) {
                    const data = await userinfoRes.json();
                    if (data.email) {
                        googleUser = {
                            sub: data.sub,
                            email: data.email,
                            name: data.name || 'Google User',
                            picture: data.picture,
                            email_verified: data.email_verified === true || data.email_verified === 'true'
                        };
                    }
                }
            } catch (aErr) {
                console.error('[GoogleAuth] Access token verification error:', aErr.message);
            }
        }

        if (!googleUser || !googleUser.email) {
            return res.status(401).json({
                message: 'Google authentication failed. Unable to verify official Google credentials.'
            });
        }

        const email = String(googleUser.email).trim().toLowerCase();
        const name = (googleUser.name || 'Google Resident').trim();

        // 4. Check if account already exists
        const userQuery = await db.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER($1)', [email]);

        let user;
        if (userQuery.rows.length > 0) {
            user = userQuery.rows[0];
            const rejection = getAccountStatusRejection(user.status);
            if (rejection) {
                return res.status(403).json(rejection);
            }
        } else {
            // Register new tenant via Google in Pending approval state
            const randomPassword = crypto.randomBytes(32).toString('hex');
            const hashedPassword = await hashPassword(randomPassword);
            const insertResult = await db.query(
                `INSERT INTO users (name, email, password, role, gender, status)
                 VALUES ($1, $2, $3, 'tenant', 'Not Specified', 'Pending')
                 RETURNING id, name, email, role, status`,
                [name, email, hashedPassword]
            );
            user = insertResult.rows[0];

            try {
                const adminNotificationService = require('../services/adminNotificationService');
                adminNotificationService.notifyAdminsIfOffline({
                    title: 'Account Approval Request',
                    message: `Tenant ${name} (${email}) signed up via Google and is pending approval.`,
                    type: 'account_approval',
                    link: '/admin/tenants'
                });
            } catch (notifErr) {
                console.error('[GoogleAuth] Notification error:', notifErr.message);
            }

            return res.status(403).json({
                code: 'ACCOUNT_PENDING',
                message: 'Your account application was submitted via Google and is pending administrator approval.'
            });
        }

        res.status(200).json(
            buildAuthSuccessPayload(user, 'Google login successful', {
                picture: googleUser.picture || null
            })
        );
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Server error during Google authentication' });
    }
};

// @desc    Logout user, revoke active session token & mark offline
// @route   POST /api/auth/logout
const logoutUser = async (req, res) => {
    try {
        // Modern Auth Token Revocation: Invalidate current token by JTI
        if (req.tokenJti) {
            revokeToken(req.tokenJti, req.tokenExp);
        }

        if (req.user && req.user.id) {
            const presenceService = require('../services/presenceService');
            presenceService.markOffline(req.user.id);
        }

        res.status(200).json({ 
            success: true,
            message: 'Logged out successfully. Session revoked.' 
        });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
};

module.exports = { registerUser, loginUser, googleAuth, getGoogleConfig, logoutUser };