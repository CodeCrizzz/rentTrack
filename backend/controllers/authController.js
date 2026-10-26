const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const { formatPhoneNumber } = require('../utils/phoneUtils');

// @desc    Register a new user (Tenant or Admin)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    const { name, email, password, role, phone, gender, address } = req.body;

    try {
        //Check if user already exists
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password before storing
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt); 

        // Enforce role: public registration is strictly for tenants only
        const roleToSet = 'tenant';
        const statusToSet = 'Pending';
        const formattedPhone = phone ? formatPhoneNumber(phone) : null;

        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role, phone, gender, address, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, status',
            [name, email, hashedPassword, roleToSet, formattedPhone, gender || 'Not Specified', address || null, statusToSet]
        );

        const registeredUser = newUser.rows[0];

        // If a new tenant submitted an account for approval, notify admin only if admin is offline
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
            message: 'User registered successfully',
            user: registeredUser
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate user & get token
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

        // 2. Bcrypt password compare
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // 3. Role Validation: If the login request specifies a role (e.g., from Admin Login), verify it
        if (role && user.role !== role) {
            return res.status(403).json({ message: 'Invalid account' });
        }

        // 4. Check if tenant is approved and prevent access if not
        if (user.role === 'tenant') {
            if (user.status === 'Pending') {
                return res.status(403).json({ message: 'Your account is pending admin approval' });
            }
            if (user.status === 'Declined') {
                return res.status(403).json({ message: 'Your account application was declined' });
            }
        }

        // 3. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '30d' } 
        );

        // Record active presence
        try {
            const presenceService = require('../services/presenceService');
            presenceService.recordActivity(user.id);
        } catch (e) {
            // non-blocking
        }

        // 4. Send response back to Next.js
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Logout user & mark offline
// @route   POST /api/auth/logout
const logoutUser = async (req, res) => {
    try {
        if (req.user && req.user.id) {
            const presenceService = require('../services/presenceService');
            presenceService.markOffline(req.user.id);
        }
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
};

module.exports = { registerUser, loginUser, logoutUser };