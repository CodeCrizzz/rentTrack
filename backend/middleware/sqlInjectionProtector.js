/**
 * SQL Injection Protection Middleware
 * Inspects incoming request parameters, query strings, and body payloads
 * to intercept and block SQL injection vectors before they reach the application.
 */

// Bypass sensitive fields such as passwords where special characters are expected
const EXCLUDED_FIELDS = new Set([
    'password',
    'currentpassword',
    'newpassword',
    'confirmpassword',
    'token',
    'proofofpayment',
    'attachment',
    'gcashqrcode',
    'logourl'
]);

// Signatures of common SQL injection attack patterns
const SQLI_PATTERNS = [
    // 1. Tautologies (e.g., ' OR 1=1 --, ' OR '1'='1)
    /(['"])\s*(or|and)\s+[\w\d'"]+\s*=\s*[\w\d'"]+/i,
    /(['"])\s*(or|and)\s+true\b/i,
    
    // 2. UNION-based injection
    /\bunion\s+(all\s+)?select\b/i,

    // 3. Stacked queries / multi-statement execution (e.g. ; DROP TABLE users;)
    /;\s*(drop|delete|truncate|alter|create|grant|revoke)\s+(table|database|schema|user|role)?\b/i,

    // 4. Time-based blind injection (e.g., pg_sleep, WAITFOR DELAY)
    /\b(pg_sleep\s*\(\s*\d+\s*\)|waitfor\s+delay\s+['"]\d+)/i,

    // 5. System catalog / information schema probing
    /\b(information_schema\.(tables|columns|schemata)|pg_catalog\.(pg_tables|pg_user|pg_shadow))\b/i,

    // 6. SQL comment injection attempts attached to quotes (e.g. admin'-- or admin'/*)
    /(['"])\s*(--|\/\*)/i
];

/**
 * Check if a single string matches any SQL injection pattern
 */
function isPotentialSqlInjection(value) {
    if (typeof value !== 'string') return false;
    
    const trimmed = value.trim();
    if (!trimmed) return false;

    for (const pattern of SQLI_PATTERNS) {
        if (pattern.test(trimmed)) {
            return true;
        }
    }
    return false;
}

/**
 * Recursively inspect an object, array, or primitive for SQL injection
 */
function scanPayload(data, path = '') {
    if (!data || typeof data !== 'object') {
        if (typeof data === 'string' && isPotentialSqlInjection(data)) {
            return path;
        }
        return null;
    }

    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            const match = scanPayload(data[i], `${path}[${i}]`);
            if (match) return match;
        }
        return null;
    }

    for (const [key, value] of Object.entries(data)) {
        // Skip password and token fields
        if (EXCLUDED_FIELDS.has(key.toLowerCase())) {
            continue;
        }

        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'string') {
            if (isPotentialSqlInjection(value)) {
                return currentPath;
            }
        } else if (typeof value === 'object' && value !== null) {
            const match = scanPayload(value, currentPath);
            if (match) return match;
        }
    }

    return null;
}

/**
 * Express Middleware: Inspects req.query, req.params, and req.body
 */
function sqlInjectionProtector(req, res, next) {
    // 1. Scan Query Parameters
    if (req.query && typeof req.query === 'object') {
        const queryThreat = scanPayload(req.query, 'query');
        if (queryThreat) {
            console.warn(`[SECURITY ALERT] SQL Injection blocked in query string (${queryThreat}):`, req.query);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request: Malicious SQL injection sequence detected.'
            });
        }
    }

    // 2. Scan Route Parameters
    if (req.params && typeof req.params === 'object') {
        const paramThreat = scanPayload(req.params, 'params');
        if (paramThreat) {
            console.warn(`[SECURITY ALERT] SQL Injection blocked in route params (${paramThreat}):`, req.params);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request parameter: Malicious SQL injection sequence detected.'
            });
        }
    }

    // 3. Scan Request Body
    if (req.body && typeof req.body === 'object') {
        const bodyThreat = scanPayload(req.body, 'body');
        if (bodyThreat) {
            console.warn(`[SECURITY ALERT] SQL Injection blocked in request body (${bodyThreat}) from IP ${req.ip}`);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request body: Malicious SQL injection sequence detected.'
            });
        }
    }

    next();
}

module.exports = {
    sqlInjectionProtector,
    isPotentialSqlInjection,
    scanPayload
};
