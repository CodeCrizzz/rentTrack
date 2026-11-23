const db = require('../config/db');

let ensureColumnPromise = null;

function normalizeRoomGender(genderInput, occupantGenders = []) {
    if (Array.isArray(occupantGenders) && occupantGenders.length > 0) {
        const hasFemale = occupantGenders.some(
            (g) => typeof g === 'string' && ['female', 'f', 'female only'].includes(g.trim().toLowerCase())
        );
        const hasMale = occupantGenders.some(
            (g) => typeof g === 'string' && ['male', 'm', 'male only'].includes(g.trim().toLowerCase())
        );
        if (hasFemale && !hasMale) return 'Female Only';
        if (hasMale && !hasFemale) return 'Male Only';
    }

    if (genderInput && typeof genderInput === 'string') {
        const clean = genderInput.trim().toLowerCase();
        if (clean.includes('female') || clean === 'f') return 'Female Only';
        if (clean.includes('male') || clean === 'm') return 'Male Only';
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
                SET gender = 'Female Only'
                WHERE EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.room_id = r.id
                      AND u.role = 'tenant'
                      AND u.status != 'Moved Out'
                      AND LOWER(TRIM(COALESCE(u.gender, ''))) IN ('female', 'f', 'female only')
                ) AND NOT EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.room_id = r.id
                      AND u.role = 'tenant'
                      AND u.status != 'Moved Out'
                      AND LOWER(TRIM(COALESCE(u.gender, ''))) IN ('male', 'm', 'male only')
                )
            `);
        } catch (err) {
            ensureColumnPromise = null;
            console.error('Error ensuring rooms.gender column:', err.message);
        }
    })();

    return ensureColumnPromise;
}

function validateTenantRoomGender(tenantGender, roomGender, occupantGenders = []) {
    const tGender = (tenantGender || '').trim().toLowerCase();
    const rGender = (roomGender || '').trim().toLowerCase();

    const isTenantMale = tGender === 'male' || tGender === 'm';
    const isTenantFemale = tGender === 'female' || tGender === 'f';

    const isRoomMale = rGender.includes('male') && !rGender.includes('female');
    const isRoomFemale = rGender.includes('female');

    if (isTenantMale && isRoomFemale) {
        return {
            valid: false,
            message: 'Cannot assign a male boarder to a Female Only room. Male and female boarders must be in separate rooms.'
        };
    }

    if (isTenantFemale && isRoomMale) {
        return {
            valid: false,
            message: 'Cannot assign a female boarder to a Male Only room. Male and female boarders must be in separate rooms.'
        };
    }

    if (Array.isArray(occupantGenders) && occupantGenders.length > 0) {
        for (const occG of occupantGenders) {
            const cleanOcc = (occG || '').trim().toLowerCase();
            const isOccMale = cleanOcc === 'male' || cleanOcc === 'm';
            const isOccFemale = cleanOcc === 'female' || cleanOcc === 'f';

            if (isTenantMale && isOccFemale) {
                return {
                    valid: false,
                    message: 'Cannot assign a male boarder to a room with female occupants. Male and female boarders must be in separate rooms.'
                };
            }
            if (isTenantFemale && isOccMale) {
                return {
                    valid: false,
                    message: 'Cannot assign a female boarder to a room with male occupants. Male and female boarders must be in separate rooms.'
                };
            }
        }
    }

    return { valid: true };
}

module.exports = {
    normalizeRoomGender,
    ensureRoomGenderColumn,
    validateTenantRoomGender,
};

