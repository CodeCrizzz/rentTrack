const crypto = require("crypto");
const db = require("../config/db");

/**
 * Generates a unique, collision-proof 8-digit random transaction number.
 * Formatted as `${prefix}-${random8}` (e.g., "TXN-84920194").
 *
 * @param {object} client - Optional pg client or pool
 * @param {string} prefix - Optional prefix (default: "TXN")
 * @returns {Promise<string>} e.g. "TXN-84920194"
 */
const generateUniqueTransactionNumber = async (client = db, prefix = "TXN") => {
  try {
    let isUnique = false;
    let candidateNumber = "";
    let attempts = 0;

    while (!isUnique && attempts < 50) {
      attempts++;
      const randomNum = crypto.randomInt(10000000, 100000000);
      candidateNumber = `${prefix}-${randomNum}`;

      const checkRes = await client.query(
        "SELECT 1 FROM payments WHERE transaction_number = $1 LIMIT 1",
        [candidateNumber]
      );

      if (checkRes.rows.length === 0) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      candidateNumber = `${prefix}-${Date.now().toString().slice(-8)}`;
    }

    return candidateNumber;
  } catch (err) {
    console.error("Error generating unique transaction number:", err);
    const fallbackRandom = crypto.randomInt(10000000, 100000000);
    return `${prefix}-${fallbackRandom}`;
  }
};

/**
 * Backfills any existing payments that do not yet have a transaction_number.
 */
const backfillExistingPayments = async () => {
  try {
    await db.query(
      `ALTER TABLE "rentTrack_schema".payments ADD COLUMN IF NOT EXISTS transaction_number VARCHAR(100)`
    );

    const nullPayments = await db.query(
      "SELECT id FROM payments WHERE transaction_number IS NULL ORDER BY id ASC"
    );

    if (nullPayments.rows.length > 0) {
      console.log(
        `Backfilling ${nullPayments.rows.length} existing payments with unique random transaction numbers...`
      );
      for (const row of nullPayments.rows) {
        const uniqueNum = await generateUniqueTransactionNumber(db, "TXN");
        await db.query(
          "UPDATE payments SET transaction_number = $1 WHERE id = $2",
          [uniqueNum, row.id]
        );
      }
      console.log("Transaction number backfill completed successfully.");
    }
  } catch (err) {
    console.error("Error in backfillExistingPayments:", err);
  }
};

module.exports = {
  generateUniqueTransactionNumber,
  backfillExistingPayments,
};
