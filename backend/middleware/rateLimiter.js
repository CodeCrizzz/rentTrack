const { rateLimit } = require('express-rate-limit');

/**
 * General API Rate Limiter
 * Applied globally to all /api routes to prevent volumetric DoS / scraping.
 * Window: 15 minutes | Max: 300 requests per IP
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 300, // Limit each IP to 300 requests per `window`
    standardHeaders: 'draft-8', // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        message: 'Too many requests from this IP address. Please try again after 15 minutes.'
    }
});

/**
 * Strict Authentication Rate Limiter
 * Applied to /api/auth (Login & Registration) to prevent brute-force attacks,
 * credential stuffing, and bot registration floods.
 * Window: 15 minutes | Max: 10 requests per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // Limit each IP to 10 authentication requests per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Too many login or registration attempts. Please try again after 15 minutes for your security.'
    }
});

/**
 * Financial & Payment Submission Limiter
 * Applied to /api/tenant/payments to prevent payment submission flooding and duplicate submissions.
 * Window: 15 minutes | Max: 25 requests per IP
 */
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 25,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Too many payment submissions from this IP. Please wait a few moments before trying again.'
    }
});

/**
 * Maintenance & Support Ticket Limiter
 * Applied to /api/requests (ticket creation) to prevent ticket spam and storage flooding.
 * Window: 15 minutes | Max: 20 requests per IP
 */
const requestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Too many maintenance requests submitted in a short time. Please wait a few moments.'
    }
});

/**
 * Cron Trigger Limiter
 * Applied to manual cron endpoints (/api/cron) to avoid duplicate cron executions.
 * Window: 15 minutes | Max: 10 requests per IP
 */
const cronLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Cron trigger rate limit reached. Please wait before triggering manual cron jobs again.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    paymentLimiter,
    requestLimiter,
    cronLimiter
};
