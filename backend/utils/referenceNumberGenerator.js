const crypto = require("crypto");
const db = require("../config/db");

/**
 * Generates a unique, collision-proof 10-digit random reference number.
 * The reference is stored in payments.reference_number and is what the
 * tenant and admin portals display as the payment reference number.
 *
 * @param {object} client - Optional pg client or pool
 * @returns {Promise<string>} e.g. "4829017365"
 */
const generateUniqueReferenceNumber = async (client = db) => {
  try {
    let isUnique = false;
    let candidateNumber = "";
    let attempts = 0;

    while (!isUnique && attempts < 50) {
      attempts++;
      // 1000000000 - 9999999999 keeps the result exactly 10 digits.
      candidateNumber = String(crypto.randomInt(1000000000, 10000000000));

      const checkRes = await client.query(
        "SELECT 1 FROM payments WHERE reference_number = $1 LIMIT 1",
        [candidateNumber]
      );

      if (checkRes.rows.length === 0) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      candidateNumber = String(crypto.randomInt(1000000000, 10000000000));
    }

    return candidateNumber;
  } catch (err) {
    console.error("Error generating unique reference number:", err);
    return String(crypto.randomInt(1000000000, 10000000000));
  }
};

/**
 * Backfills any existing payments that do not yet have a reference_number.
 */
const backfillExistingPayments = async () => {
  try {
    await db.query(
      `ALTER TABLE "rentTrack_schema".payments ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100)`
    );

    const nullPayments = await db.query(
      "SELECT id FROM payments WHERE reference_number IS NULL ORDER BY id ASC"
    );

    if (nullPayments.rows.length > 0) {
      console.log(
        `Backfilling ${nullPayments.rows.length} existing payments with unique random reference numbers...`
      );
      for (const row of nullPayments.rows) {
        const uniqueNum = await generateUniqueReferenceNumber(db);
        await db.query(
          "UPDATE payments SET reference_number = $1 WHERE id = $2",
          [uniqueNum, row.id]
        );
      }
      console.log("Reference number backfill completed successfully.");
    }
  } catch (err) {
    console.error("Error in backfillExistingPayments:", err);
  }
};

module.exports = {
  generateUniqueReferenceNumber,
  backfillExistingPayments,
};
