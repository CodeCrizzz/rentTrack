/**
 * RentTrack CORS (Cross-Origin Resource Sharing) Configuration
 * Manages allowed origins, methods, headers, and security credentials.
 */

// Parse allowed origins from environment variable (comma-separated), with sensible development defaults
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || process.env.APP_URL || '';
const configuredOrigins = rawAllowedOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const defaultDevOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://localhost:5173'
];

// Combine configured origins with development defaults if not in production
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (configuredOrigins.length > 0 ? configuredOrigins : ['http://localhost:3000'])
    : Array.from(new Set([...defaultDevOrigins, ...configuredOrigins]));

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl, Postman, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        // Check if origin is explicitly in allowed list
        const isAllowed = allowedOrigins.includes(origin);

        // Also allow matching preview/staging domains on Vercel or localhost in non-production
        const isLocalhost = process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

        if (isAllowed || isLocalhost) {
            callback(null, true);
        } else {
            console.warn(`[CORS BLOCKED] Request from unauthorized origin: ${origin}`);
            callback(new Error(`CORS Error: Origin ${origin} is not allowed by RentTrack policy.`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-HTTP-Method-Override'
    ],
    exposedHeaders: [
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
        'Content-Disposition'
    ],
    credentials: true, // Allow cookies and authorization headers across domains
    maxAge: 86400, // Preflight caching for 24 hours (reduces OPTIONS overhead)
    optionsSuccessStatus: 204
};

module.exports = {
    corsOptions,
    allowedOrigins
};
