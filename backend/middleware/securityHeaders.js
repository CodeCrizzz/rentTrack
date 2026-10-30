const helmet = require('helmet');

/**
 * HTTPS Everywhere Enforcer Middleware
 * Automatically redirects all insecure HTTP requests to HTTPS in production
 */
function enforceHttps(req, res, next) {
    if (process.env.NODE_ENV === 'production') {
        const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
        if (!isHttps) {
            const secureUrl = `https://${req.headers.host}${req.url}`;
            return res.redirect(301, secureUrl);
        }
    }
    next();
}

/**
 * Comprehensive Security Headers Configuration via Helmet
 */
const securityHeaders = helmet({
    // HTTP Strict Transport Security (HSTS): forces HTTPS for 1 year, includes subdomains
    strictTransportSecurity: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true
    },
    // Prevent clickjacking by disallowing embedding in iframes
    frameguard: {
        action: 'deny'
    },
    // Prevent browsers from MIME-sniffing away from the declared Content-Type
    noSniff: true,
    // Hide Referrer header when navigating from HTTPS to HTTP, keep origin on cross-origin
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    // Allow static uploads (receipts, avatars, photos) to be embedded by the frontend application
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    },
    crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups'
    },
    dnsPrefetchControl: {
        allow: false
    },
    // Content Security Policy tailored for REST APIs
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            fontSrc: ["'self'", 'https:', 'data:'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    }
});

/**
 * Permissions-Policy (Feature Policy) Header
 * Restricts browser features and hardware APIs on API endpoints
 */
function permissionsPolicy(req, res, next) {
    res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), payment=(), usb=(), vr=()'
    );
    next();
}

module.exports = {
    enforceHttps,
    securityHeaders,
    permissionsPolicy
};
