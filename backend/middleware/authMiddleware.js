const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { isTokenRevoked } = require('../utils/tokenBlacklist');
const { getPermissionsForRole } = require('./rbacMiddleware');

// Read JWT configuration strictly from environment variables with secure defaults
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'renttrack-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'renttrack-app';

if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    } else {
        console.warn('[SECURITY WARNING] JWT_SECRET is not set in environment variables. Please configure JWT_SECRET in your .env file.');
    }
}

/**
 * Modern Authentication Guard:
 * 1. Validates standard RFC 7519 Bearer token and signature
 * 2. Enforces Token Revocation / Blacklist check (JTI)
 * 3. Verifies Issuer & Audience claims
 * 4. Performs real-time account status verification against database (disabling zombie sessions)
 * 5. Injects RBAC permissions matrix onto req.user for least-privilege downstream access
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (Format: "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'Not authorized, token missing' });
            }

            // Verify JWT signature & expiration
            const decoded = jwt.verify(token, JWT_SECRET);

            // Verify Issuer and Audience if present in the token claims
            if (decoded.iss && decoded.iss !== JWT_ISSUER) {
                return res.status(401).json({
                    code: 'INVALID_TOKEN_ISSUER',
                    message: 'Authentication failed: Invalid token issuer authority.'
                });
            }
            if (decoded.aud && decoded.aud !== JWT_AUDIENCE) {
                return res.status(401).json({
                    code: 'INVALID_TOKEN_AUDIENCE',
                    message: 'Authentication failed: Token not intended for this audience.'
                });
            }

            // Verify Token Revocation (Blacklist check for logged-out / invalidated sessions)
            if (decoded.jti && isTokenRevoked(decoded.jti)) {
                return res.status(401).json({
                    code: 'TOKEN_REVOKED',
                    message: 'Session has been invalidated or logged out. Please authenticate again.'
                });
            }

            const userId = decoded.id || decoded.sub;

            // Live Database Account Verification: ensure user exists and account status is active
            const userResult = await db.query(
                'SELECT id, name, email, role, status FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({
                    code: 'ACCOUNT_NOT_FOUND',
                    message: 'Authentication failed: User account no longer exists.'
                });
            }

            const dbUser = userResult.rows[0];

            // Account Lifecycle Enforcement (Prevent zombie sessions for inactive/deactivated users)
            if (dbUser.status === 'Declined' || dbUser.status === 'Suspended' || dbUser.status === 'Inactive') {
                return res.status(403).json({
                    code: 'ACCOUNT_DISABLED',
                    message: 'Access denied: Your account is currently inactive or suspended. Please contact management.'
                });
            }

            if (dbUser.role === 'tenant' && dbUser.status === 'Pending') {
                return res.status(403).json({
                    code: 'ACCOUNT_PENDING',
                    message: 'Access denied: Your account is pending administrator approval.'
                });
            }

            const effectiveRole = dbUser.role || decoded.role || 'tenant';

            // Standardized, enriched user context with Granular RBAC Permissions
            req.user = {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: effectiveRole,
                status: dbUser.status,
                permissions: getPermissionsForRole(effectiveRole)
            };

            // Attach token metadata for session management & logout revocation
            req.tokenJti = decoded.jti;
            req.tokenExp = decoded.exp;

            // Track active presence for tenants
            if (effectiveRole === 'tenant') {
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
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    code: 'SESSION_EXPIRED',
                    message: 'Your session has expired. Please log in again to continue.'
                });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    code: 'TOKEN_INVALID',
                    message: 'Not authorized: Invalid or malformed token.'
                });
            }
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = {
    protect,
    JWT_SECRET,
    JWT_ISSUER,
    JWT_AUDIENCE
};