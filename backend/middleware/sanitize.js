const xss = require('xss');

// Fields that should never be sanitized/modified (e.g., passwords where characters like <, > or & may be intentional)
const SENSITIVE_FIELDS = new Set([
    'password',
    'currentpassword',
    'newpassword',
    'confirmpassword',
    'token',
    'authorization',
    'gcashqrcode',
    'logourl'
]);

// Prototype pollution forbidden keys
const FORBIDDEN_KEYS = new Set([
    '__proto__',
    'constructor',
    'prototype'
]);

// Custom xss options: strip all tags completely from standard inputs, or neutralize dangerous tags
const xssOptions = {
    whiteList: {}, // Empty whitelist removes all HTML tags
    stripIgnoreTag: true, // Filter out all HTML tags not in whitelist
    stripIgnoreTagBody: ['script', 'style', 'xml', 'iframe'] // Completely remove script/style/iframe tags and their contents
};

const xssFilter = new xss.FilterXSS(xssOptions);

/**
 * Clean a single string:
 * 1. Remove null bytes (\0)
 * 2. Neutralize XSS/HTML tags
 * 3. Trim leading/trailing whitespace
 */
function cleanString(val, keyName = '') {
    if (typeof val !== 'string') return val;

    // Preserve passwords without alteration
    if (SENSITIVE_FIELDS.has(keyName.toLowerCase())) {
        return val;
    }

    // 1. Remove null bytes (\0)
    let cleaned = val.replace(/\0/g, '');

    // 2. Strip XSS and malicious scripts/tags
    cleaned = xssFilter.process(cleaned);

    // 3. Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * Recursively sanitize an object, array, or primitive
 */
function sanitizeValue(value, keyName = '') {
    if (value === null || value === undefined) {
        return value;
    }

    // Skip sensitive fields like passwords
    if (typeof keyName === 'string' && SENSITIVE_FIELDS.has(keyName.toLowerCase())) {
        return value;
    }

    if (typeof value === 'string') {
        return cleanString(value, keyName);
    }

    if (Array.isArray(value)) {
        return value.map((item, index) => sanitizeValue(item, `${keyName}[${index}]`));
    }

    if (typeof value === 'object') {
        const sanitizedObj = {};
        for (const [key, val] of Object.entries(value)) {
            // Guard against prototype pollution
            if (FORBIDDEN_KEYS.has(key)) {
                continue;
            }
            sanitizedObj[key] = sanitizeValue(val, key);
        }
        return sanitizedObj;
    }

    // Numbers, booleans, etc.
    return value;
}

/**
 * Express Middleware:
 * Automatically sanitizes req.body, req.query, and req.params
 */
function sanitizeInput(req, res, next) {
    try {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeValue(req.body);
        }

        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeValue(req.query);
        }

        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeValue(req.params);
        }

        next();
    } catch (error) {
        console.error('[SANITIZATION ERROR] Failed to sanitize request payload:', error);
        return res.status(400).json({
            message: 'Malformed or invalid request data detected.'
        });
    }
}

module.exports = {
    sanitizeInput,
    cleanString,
    sanitizeValue
};
