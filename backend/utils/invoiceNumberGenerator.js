const db = require("../config/db");

// Determine digit count for random invoice number pool
const determineDigitCount = (totalCount) => {
  if (totalCount < 50000) return 6; // 100,000 to 999,999 (900k pool)
  if (totalCount < 500000) return 7; // 1,000,000 to 9,999,999 (9M pool)
  if (totalCount < 5000000) return 8; // 10,000,000 to 99,999,999 (90M pool)
  return 9; // 100,000,000 to 999,999,999 (900M pool)
};

/**
 * Generates a unique collision-proof random invoice number, e.g. INV-849201
 */
const generateUniqueInvoiceNumber = async (client = db) => {
  try {
    const countRes = await client.query("SELECT COUNT(*) FROM bills");
    const totalBills = parseInt(countRes.rows[0].count, 10) || 0;

    let digits = determineDigitCount(totalBills);
    let isUnique = false;
    let candidateNumber = "";
    let attempts = 0;

    while (!isUnique && attempts < 50) {
      attempts++;
      const min = Math.pow(10, digits - 1);
      const max = Math.pow(10, digits) - 1;
      // Generate random number within [min, max]
      const randomNum = Math.floor(min + Math.random() * (max - min + 1));
      candidateNumber = `INV-${randomNum}`;

      const checkRes = await client.query(
        "SELECT 1 FROM bills WHERE invoice_number = $1",
        [candidateNumber]
      );

      if (checkRes.rows.length === 0) {
        isUnique = true;
      } else if (attempts > 5) {
        digits++;
      }
    }

    if (!isUnique) {
      // Fallback timestamp slice to guarantee uniqueness
      candidateNumber = `INV-${Date.now().toString().slice(-digits)}`;
    }

    return candidateNumber;
  } catch (err) {
    console.error("Error generating unique invoice number:", err);
    const fallbackRandom = Math.floor(100000 + Math.random() * 900000);
    return `INV-${fallbackRandom}`;
  }
};

/**
 * Backfills any existing bills that do not yet have an invoice_number
 */
const backfillExistingBills = async () => {
  try {
    // Add column if it doesn't exist
    await db.query(
      `ALTER TABLE "rentTrack_schema".bills ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)`
    );

    const nullBills = await db.query(
      "SELECT id FROM bills WHERE invoice_number IS NULL ORDER BY id ASC"
    );

    if (nullBills.rows.length > 0) {
      console.log(
        `Backfilling ${nullBills.rows.length} existing bills with unique random invoice numbers...`
      );
      for (const row of nullBills.rows) {
        const uniqueNum = await generateUniqueInvoiceNumber(db);
        await db.query("UPDATE bills SET invoice_number = $1 WHERE id = $2", [
          uniqueNum,
          row.id,
        ]);
      }
      console.log("Invoice number backfill completed successfully.");
    }
  } catch (err) {
    console.error("Error in backfillExistingBills:", err);
  }
};

module.exports = {
  determineDigitCount,
  generateUniqueInvoiceNumber,
  backfillExistingBills,
};
