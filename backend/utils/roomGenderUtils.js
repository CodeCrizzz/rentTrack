const db = require('../config/db');

let ensureColumnPromise = null;

function normalizeRoomGender(genderInput, occupantGenders = []) {
    if (genderInput && typeof genderInput === 'string') {
        const clean = genderInput.trim().toLowerCase();
        if (clean.includes('female') || clean === 'f') return 'Female Only';
        if (clean.includes('male') || clean === 'm') return 'Male Only';
    }

    if (Array.isArray(occupantGenders) && occupantGenders.length > 0) {
        const hasFemale = occupantGenders.some(
            (g) => typeof g === 'string' && ['female', 'f', 'female only'].includes(g.trim().toLowerCase())
        );
        if (hasFemale) return 'Female Only';

        const hasMale = occupantGenders.some(
            (g) => typeof g === 'string' && ['male', 'm', 'male only'].includes(g.trim().toLowerCase())
        );
        if (hasMale) return 'Male Only';
    }

    return 'Male Only';
}

async function ensureRoomGenderColumn() {
    if (ensureColumnPromise) {
        return ensureColumnPromise;
    }

    ensureColumnPromise = (async () => {
        try {
            await db.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS gender VARCHAR(30) DEFAULT 'Male Only'`);
            await db.query(`
                UPDATE rooms r
                SET gender = CASE
                    WHEN EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.room_id = r.id
                          AND u.role = 'tenant'
                          AND u.status != 'Moved Out'
                          AND LOWER(TRIM(COALESCE(u.gender, ''))) IN ('female', 'f', 'female only')
                    ) THEN 'Female Only'
                    WHEN EXISTS (
                        SELECT 1 FROM users u
                        WHERE u.room_id = r.id
                          AND u.role = 'tenant'
                          AND u.status != 'Moved Out'
                          AND LOWER(TRIM(COALESCE(u.gender, ''))) IN ('male', 'm', 'male only')
                    ) THEN 'Male Only'
                    WHEN LOWER(COALESCE(r.description, '') || ' ' || COALESCE(r.type, '')) LIKE '%female%'
                      OR LOWER(COALESCE(r.description, '') || ' ' || COALESCE(r.type, '')) LIKE '%women%'
                      OR LOWER(COALESCE(r.description, '') || ' ' || COALESCE(r.type, '')) LIKE '%ladies%'
                    THEN 'Female Only'
                    ELSE 'Male Only'
                END
                WHERE r.gender IS NULL OR TRIM(r.gender) = ''
            `);
        } catch (err) {
            ensureColumnPromise = null;
            console.error('Error ensuring rooms.gender column:', err.message);
        }
    })();

    return ensureColumnPromise;
}

module.exports = {
    normalizeRoomGender,
    ensureRoomGenderColumn,
};

