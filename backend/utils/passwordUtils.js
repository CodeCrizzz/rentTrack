const bcrypt = require('bcrypt');

// Default bcrypt salt rounds (12 rounds provides strong resistance to GPU brute-force)
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

/**
 * Securely hash a plain text password using bcrypt
 * @param {string} plainPassword - Plain text password to hash
 * @param {number} [saltRounds] - Optional custom work factor
 * @returns {Promise<string>} - Bcrypt hashed password string
 */
const hashPassword = async (plainPassword, saltRounds = SALT_ROUNDS) => {
    if (!plainPassword || typeof plainPassword !== 'string') {
        throw new Error('A valid password string is required for hashing');
    }
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(plainPassword, salt);
};

/**
 * Compare a plain text password against a stored bcrypt hash or legacy hash
 * @param {string} plainPassword - Plain text candidate password
 * @param {string} hashedPassword - Stored bcrypt hash or legacy string from database
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
const comparePassword = async (plainPassword, hashedPassword) => {
    if (!plainPassword || !hashedPassword) {
        return false;
    }
    // Handle direct plain-text match for legacy/seed development accounts
    if (plainPassword === hashedPassword) {
        return true;
    }
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (err) {
        return false;
    }
};

module.exports = {
    hashPassword,
    comparePassword,
    bcrypt
};
