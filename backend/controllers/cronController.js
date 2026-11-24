const db = require("../config/db");
const { autoGenerateBills } = require("../utils/billingUtils");

// @desc    Run automatic billing cron job
// @route   POST /api/cron/billing
// @access  Cron
const runBillingCron = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log("Running automatic billing cron job (7 days before due date)...");
  try {
    const result = await autoGenerateBills(db);
    console.log(`Automatic billing cron completed. ${result.generatedCount} bill(s) generated.`);
    res.status(200).json({
      message: "Automatic billing cron job completed successfully.",
      billsGenerated: result.generatedCount,
      cyclesChecked: result.cyclesChecked,
    });
  } catch (error) {
    console.error("Error running automatic billing cron job:", error);
    res.status(500).json({ message: "Error running automatic billing cron job", error: error.message });
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
