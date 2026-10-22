const db = require("../config/db");

// @desc    Run automatic billing cron job
// @route   POST /api/cron/billing
// @access  Cron
const runBillingCron = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log("Running automatic billing cron job via Vercel Cron...");
  try {
    // Find all active tenants with an assigned room
    const activeTenantsQuery = `
            SELECT u.id as tenant_id, u.room_id, r.price as rent_amount
            FROM users u
            JOIN rooms r ON u.room_id = r.id
            WHERE u.role = 'tenant' AND u.status = 'Active' AND u.room_id IS NOT NULL
        `;
    const { rows: tenants } = await db.query(activeTenantsQuery);

    if (tenants.length === 0) {
      console.log("No active tenants found for automatic billing.");
      return res
        .status(200)
        .json({ message: "No active tenants found for automatic billing." });
    }

    const currentDate = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentMonthName = monthNames[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();
    const billingMonthStr = `${currentMonthName} ${currentYear}`;

    // Due date usually 5th of the month
    const dueDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      5,
    );

    for (const tenant of tenants) {
      // Check if a bill already exists for this tenant and this billing month
      const checkBillQuery = `
                SELECT id FROM bills WHERE tenant_id = $1 AND billing_month = $2
            `;
      const { rows: existingBills } = await db.query(checkBillQuery, [
        tenant.tenant_id,
        billingMonthStr,
      ]);

      if (existingBills.length === 0) {
        // Default amounts
        const waterCharges = 0;
        const electricityCharges = 0;
        const otherFees = 0;
        const totalAmount = tenant.rent_amount;
        const balance = totalAmount;
        const status = "Unpaid";
        const notes = "Auto-generated bill";

        const insertBillQuery = `
                    INSERT INTO bills (tenant_id, room_id, billing_month, due_date, rent_amount, water_charges, electricity_charges, other_fees, total_amount, balance, status, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `;
        const values = [
          tenant.tenant_id,
          tenant.room_id,
          billingMonthStr,
          dueDate,
          tenant.rent_amount,
          waterCharges,
          electricityCharges,
          otherFees,
          totalAmount,
          balance,
          status,
          notes,
        ];

        await db.query(insertBillQuery, values);
        console.log(
          `Auto-generated bill for tenant ${tenant.tenant_id} for ${billingMonthStr}.`,
        );
      } else {
        console.log(
          `Bill already exists for tenant ${tenant.tenant_id} for ${billingMonthStr}. Skipping.`,
        );
      }
    }
    console.log("Automatic billing cron job completed successfully.");
    res
      .status(200)
      .json({ message: "Automatic billing cron job completed successfully." });
  } catch (error) {
    console.error("Error running automatic billing cron job:", error);
    res
      .status(500)
      .json({ message: "Error running automatic billing cron job" });
  }
};

const { checkAndSendPaymentReminders } = require("../services/reminderService");

// @desc    Run payment due and overdue reminders cron job
// @route   POST /api/cron/reminders
// @access  Cron
const runReminderCron = async (req, res) => {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  console.log("Running payment reminder cron job on demand...");
  try {
    const summary = await checkAndSendPaymentReminders();
    res.status(200).json({
      message: "Payment reminder routine executed successfully",
      summary,
    });
  } catch (error) {
    console.error("Error running payment reminder cron job:", error);
    res.status(500).json({
      message: "Error running payment reminder cron job",
      error: error.message,
    });
  }
};

module.exports = {
  runBillingCron,
  runReminderCron,
};
