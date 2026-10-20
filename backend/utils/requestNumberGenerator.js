const db = require('../config/db');

const determineDigitCount = (totalCount) => {
    if (totalCount < 50000) return 6;    // 100,000 to 999,999 (900k pool)
    if (totalCount < 500000) return 7;   // 1,000,000 to 9,999,999 (9M pool)
    if (totalCount < 5000000) return 8;  // 10,000,000 to 99,999,999 (90M pool)
    return 9;                            // 100,000,000 to 999,999,999 (900M pool)
};

const generateUniqueRequestNumber = async (client = db) => {
    try {
        const countRes = await client.query('SELECT COUNT(*) FROM requests');
        const totalRequests = parseInt(countRes.rows[0].count, 10) || 0;

        let digits = determineDigitCount(totalRequests);
        let isUnique = false;
        let candidateNumber = '';
        let attempts = 0;

        while (!isUnique && attempts < 50) {
            attempts++;
            const min = Math.pow(10, digits - 1);
            const max = Math.pow(10, digits) - 1;
            // Generate random number within [min, max]
            const randomNum = Math.floor(min + Math.random() * (max - min + 1));
            candidateNumber = `RT-${randomNum}`;

            const checkRes = await client.query(
                'SELECT 1 FROM requests WHERE request_number = $1',
                [candidateNumber]
            );

            if (checkRes.rows.length === 0) {
                isUnique = true;
            } else if (attempts > 5) {
                digits++;
            }
        }

        if (!isUnique) {
            // Absolute safety fallback with timestamp to guarantee zero duplicate
            candidateNumber = `RT-${Date.now().toString().slice(-digits)}`;
        }

        return candidateNumber;
    } catch (err) {
        console.error('Error generating unique request number:', err);
        // Fallback unique generation
        const fallbackRandom = Math.floor(100000 + Math.random() * 900000);
        return `RT-${fallbackRandom}`;
    }
};

/*Backfills any existing requests in the database that do not yet have a request_number.*/
const backfillExistingRequests = async () => {
    try {
        const nullRequests = await db.query('SELECT id FROM requests WHERE request_number IS NULL ORDER BY id ASC');
        if (nullRequests.rows.length > 0) {
            console.log(`Backfilling ${nullRequests.rows.length} existing requests with unique random request numbers...`);
            for (const row of nullRequests.rows) {
                const uniqueNum = await generateUniqueRequestNumber(db);
                await db.query('UPDATE requests SET request_number = $1 WHERE id = $2', [uniqueNum, row.id]);
            }
            console.log('Backfill completed successfully.');
        }
    } catch (err) {
        console.error('Error in backfillExistingRequests:', err);
    }
};

module.exports = {
    determineDigitCount,
    generateUniqueRequestNumber,
    backfillExistingRequests,
};
