/**
 * Token Blacklist & Revocation Service
 * 
 * Provides in-memory token revocation management (blacklisting) with automatic TTL cleanup
 * for RFC 7519 JTI (JWT ID) claims upon user logout or session termination.
 */

const revokedTokens = new Map(); // Map of jti -> expiryTimestamp (milliseconds)

/**
 * Revoke a token by its unique JWT ID (jti)
 * @param {string} jti - The unique JWT ID claim
 * @param {number} [exp] - Standard epoch expiration timestamp in seconds
 */
const revokeToken = (jti, exp) => {
    if (!jti) return;
    // Default to 24h retention if exp is not specified
    const expiryMs = exp ? (exp * 1000) : (Date.now() + 24 * 60 * 60 * 1000);
    revokedTokens.set(jti, expiryMs);
};

/**
 * Check if a token has been revoked
 * @param {string} jti - The unique JWT ID claim
 * @returns {boolean} True if revoked, false otherwise
 */
const isTokenRevoked = (jti) => {
    if (!jti) return false;
    const expiryMs = revokedTokens.get(jti);
    if (!expiryMs) return false;

    // If the token has naturally expired past its TTL, clean it up immediately
    if (Date.now() > expiryMs) {
        revokedTokens.delete(jti);
        return false;
    }

    return true;
};

/**
 * Clear all revoked tokens (useful for test isolation)
 */
const clearRevocationList = () => {
    revokedTokens.clear();
};

/**
 * Periodic cleanup to prevent unbounded memory growth
 * Runs every 15 minutes and unrefs itself so it won't block server shutdown
 */
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [jti, expiryMs] of revokedTokens.entries()) {
        if (now > expiryMs) {
            revokedTokens.delete(jti);
        }
    }
}, 15 * 60 * 1000);

if (cleanupInterval.unref) {
    cleanupInterval.unref();
}

module.exports = {
    revokeToken,
    isTokenRevoked,
    clearRevocationList
};
