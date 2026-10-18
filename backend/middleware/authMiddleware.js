const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Hardcoded secret key
const JWT_SECRET = '5321e75095e9352dbb158b89d10e75bac1c50ea5df2efbcd0ff4e03c3e5e9fc959f7cb4b556c08d011f88f03391c7f2b7b6552dbe396de149a8ac53b07bfc5ef';

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (Format: "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // Verify the token
            const decoded = jwt.verify(token, JWT_SECRET);

            const userId = decoded.id || decoded.sub;

            // Fetch user's role from the database if not explicitly present or if it is a Supabase JWT
            let role = decoded.role;
            if (!role || role === 'authenticated') {
                const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
                if (userResult.rows.length > 0) {
                    role = userResult.rows[0].role;
                } else {
                    role = 'tenant';
                }
            }

            // Attach the user ID and role to the request object
            req.user = {
                id: userId,
                role: role
            };

            // Track active presence for tenants
            if (role === 'tenant') {
                try {
                    const presenceService = require('../services/presenceService');
                    presenceService.recordActivity(userId);
                } catch (e) {
                    // non-blocking
                }
            }

            next();
        } catch (error) {
            console.error('JWT Verification Failed:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect, JWT_SECRET };