const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = require('../middleware/authMiddleware');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { formatPhoneNumber } = require('../utils/phoneUtils');
const { revokeToken } = require('../utils/tokenBlacklist');
const { getPermissionsForRole } = require('../middleware/rbacMiddleware');

// @desc    Register a new user (Tenant only for public signups)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    const { name, email, password, role, phone, gender, address } = req.body;

    try {
        // Check if user already exists
        const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password with bcrypt before storing (Principle of Defense in Depth)
        const hashedPassword = await hashPassword(password); 

        // Enforce Least Privilege: public registration is strictly for tenants with 'Pending' approval status
        const roleToSet = 'tenant';
        const statusToSet = 'Pending';
        const formattedPhone = phone ? formatPhoneNumber(phone) : null;

        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role, phone, gender, address, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, status',
            [name, email, hashedPassword, roleToSet, formattedPhone, gender || 'Not Specified', address || null, statusToSet]
        );

        const registeredUser = newUser.rows[0];

        // Notify admin if offline when tenant submits an account for approval
        if (roleToSet === 'tenant' && statusToSet === 'Pending') {
            try {
                const adminNotificationService = require('../services/adminNotificationService');
                adminNotificationService.notifyAdminsIfOffline({
                    title: 'Account Approval Request',
                    message: `Tenant ${name} submitted an account registration and is waiting for your approval.`,
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
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate user & issue modern RFC 7519 compliant JWT
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // 1. Find the user by email
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
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
        if (user.status === 'Declined') {
            return res.status(403).json({ 
                code: 'ACCOUNT_DECLINED',
                message: 'Your account application was declined. Please contact the administrator.' 
            });
        }
        if (user.status === 'Pending') {
            return res.status(403).json({ 
                code: 'ACCOUNT_PENDING',
                message: 'Your account is pending administrator approval.' 
            });
        }
        if (user.status === 'Suspended' || user.status === 'Inactive') {
            return res.status(403).json({ 
                code: 'ACCOUNT_DISABLED',
                message: 'Your account is currently disabled or inactive. Please contact the administrator.' 
            });
        }

        // 5. Generate Modern JWT Token with RFC 7519 standard claims
        const sessionExpiry = process.env.JWT_EXPIRES_IN || (user.role === 'admin' || user.role === 'owner' ? '8h' : '24h');
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

        // Record active presence
        try {
            const presenceService = require('../services/presenceService');
            presenceService.recordActivity(user.id);
        } catch (e) {
            // non-blocking
        }

        const userPermissions = getPermissionsForRole(user.role);

        // 6. Return secure standardized payload
        res.status(200).json({
            message: 'Login successful',
            token,
            expiresIn: sessionExpiry,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                permissions: userPermissions
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
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

module.exports = { registerUser, loginUser, logoutUser };