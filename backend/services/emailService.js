const nodemailer = require('nodemailer');

let transporter = null;

// Initialize transporter
const getTransporter = async () => {
    if (transporter) return transporter;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const isGmail = (process.env.SMTP_HOST || '').includes('gmail') || (process.env.SMTP_USER || '').includes('@gmail.com');
        const port = parseInt(process.env.SMTP_PORT || (isGmail ? '465' : '587'));
        const secure = process.env.SMTP_SECURE === 'true' || port === 465;

        if (isGmail && (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.gmail.com')) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log(`Using Gmail service (${process.env.SMTP_USER}) for email notifications.`);
        } else {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port,
                secure,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log(`Using SMTP server (${process.env.SMTP_HOST || 'smtp.gmail.com'}:${port}) for email notifications.`);
        }
    } else {
        // Fallback in development: Create Ethereal test account or console logger
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log('Using Ethereal test mailer for email notifications.');
            console.log(`Test account: ${testAccount.user}`);
        } catch (err) {
            console.warn('Could not connect to Ethereal, falling back to mock transport:', err.message);
            transporter = {
                sendMail: async (mailOptions) => {
                    console.log('--- [MOCK EMAIL DISPATCHED] ---');
                    console.log(`To: ${mailOptions.to}`);
                    console.log(`Subject: ${mailOptions.subject}`);
                    return { messageId: `mock-${Date.now()}` };
                }
            };
        }
    }

    return transporter;
};

/**
 * Format currency to PHP
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(amount) || 0);
};

/**
 * Format date nicely
 */
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

/**
 * Send Payment Due Reminder Email
 */
const sendPaymentDueEmail = async ({
    to,
    tenantName,
    roomNumber,
    billingMonth,
    dueDate,
    balance,
    totalAmount,
    breakdown = {}
}) => {
    try {
        const mailClient = await getTransporter();
        const fromAddress = process.env.SMTP_FROM || '"RentTrack Billing" <billing@renttrack.com>';
        const formattedDue = formatDate(dueDate);
        const formattedBalance = formatCurrency(balance);
        const formattedTotal = formatCurrency(totalAmount);

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background: #0f172a; padding: 28px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .badge-due { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; letter-spacing: 0.5px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .highlight-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .highlight-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #64748b; }
    .highlight-row:last-child { margin-bottom: 0; }
    .highlight-row strong { color: #0f172a; }
    .total-row { border-top: 1px dashed #cbd5e1; margin-top: 14px; padding-top: 14px; font-size: 15px; font-weight: 700; color: #0f172a; display: flex; justify-content: space-between; }
    .total-amount { color: #0284c7; font-size: 18px; font-weight: 800; }
    .cta-btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin-top: 8px; text-align: center; }
    .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RentTrack Management</h1>
      <p>Official Rental Billing Notification</p>
    </div>
    <div class="content">
      <div class="badge-due">Payment Due Today</div>
      <div class="greeting">Hello, ${tenantName}!</div>
      <p class="message">
        This is a friendly reminder that your monthly rent invoice for <strong>${billingMonth}</strong> is due today, <strong>${formattedDue}</strong>. Please ensure your payment is settled on time.
      </p>

      <div class="highlight-card">
        <div class="highlight-row"><span>Assigned Room:</span> <strong>Room ${roomNumber || 'N/A'}</strong></div>
        <div class="highlight-row"><span>Billing Cycle:</span> <strong>${billingMonth}</strong></div>
        <div class="highlight-row"><span>Due Date:</span> <strong>${formattedDue}</strong></div>
        ${breakdown.rent ? `<div class="highlight-row"><span>Rent:</span> <span>${formatCurrency(breakdown.rent)}</span></div>` : ''}
        ${breakdown.water ? `<div class="highlight-row"><span>Water Charges:</span> <span>${formatCurrency(breakdown.water)}</span></div>` : ''}
        ${breakdown.electricity ? `<div class="highlight-row"><span>Electricity Charges:</span> <span>${formatCurrency(breakdown.electricity)}</span></div>` : ''}
        ${breakdown.other ? `<div class="highlight-row"><span>Other Fees:</span> <span>${formatCurrency(breakdown.other)}</span></div>` : ''}
        <div class="total-row">
          <span>Remaining Balance Due:</span>
          <span class="total-amount">${formattedBalance}</span>
        </div>
      </div>

      <p class="message">
        You can settle your bill directly via the Tenant Portal.
      </p>

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/tenant?tab=payments" class="cta-btn">View Invoice & Submit Payment</a>
      </div>
    </div>
    <div class="footer">
      <p>RentTrack Property Management System &bull; Automated Billing Service</p>
      <p>If you have already made this payment, please disregard this notice or check the portal for verification status.</p>
    </div>
  </div>
</body>
</html>
        `;

        const mailOptions = {
            from: fromAddress,
            to,
            subject: `Payment Reminder: Invoice for ${billingMonth} Due Today - RentTrack`,
            html,
        };

        const info = await mailClient.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Due reminder sent to ${to} (Message ID: ${info.messageId})`);
        if (nodemailer.getTestMessageUrl && info.messageId && !process.env.SMTP_HOST) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EMAIL PREVIEW] ${previewUrl}`);
        }
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send due reminder to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Payment Overdue Notice Email
 */
const sendPaymentOverdueEmail = async ({
    to,
    tenantName,
    roomNumber,
    billingMonth,
    dueDate,
    balance,
    totalAmount,
    breakdown = {}
}) => {
    try {
        const mailClient = await getTransporter();
        const fromAddress = process.env.SMTP_FROM || '"RentTrack Billing" <billing@renttrack.com>';
        const formattedDue = formatDate(dueDate);
        const formattedBalance = formatCurrency(balance);

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fecdd3; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.05); }
    .header { background: #881337; padding: 28px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #fecdd3; }
    .badge-overdue { display: inline-block; background: #ffe4e6; color: #e11d48; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; letter-spacing: 0.5px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .alert-box { background: #fff1f2; border-left: 4px solid #e11d48; padding: 16px; border-radius: 8px; margin-bottom: 24px; color: #9f1239; font-size: 13px; font-weight: 500; }
    .highlight-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .highlight-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #64748b; }
    .highlight-row:last-child { margin-bottom: 0; }
    .highlight-row strong { color: #0f172a; }
    .total-row { border-top: 1px dashed #cbd5e1; margin-top: 14px; padding-top: 14px; font-size: 15px; font-weight: 700; color: #0f172a; display: flex; justify-content: space-between; }
    .total-amount { color: #e11d48; font-size: 18px; font-weight: 800; }
    .cta-btn { display: inline-block; background: #e11d48; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin-top: 8px; text-align: center; }
    .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RentTrack Management</h1>
      <p>Urgent Notice: Overdue Rental Payment</p>
    </div>
    <div class="content">
      <div class="badge-overdue">Action Required &bull; Overdue</div>
      <div class="greeting">Dear ${tenantName},</div>
      
      <div class="alert-box">
        <strong>Notice:</strong> Your payment for <strong>${billingMonth}</strong> was due on <strong>${formattedDue}</strong> and remains unsettled.
      </div>

      <p class="message">
        Our records indicate that we have not received the required payment for your room rental. To avoid potential late penalties, service interruptions, or tenancy review, please settle your overdue balance immediately.
      </p>

      <div class="highlight-card">
        <div class="highlight-row"><span>Assigned Room:</span> <strong>Room ${roomNumber || 'N/A'}</strong></div>
        <div class="highlight-row"><span>Billing Cycle:</span> <strong>${billingMonth}</strong></div>
        <div class="highlight-row"><span>Original Due Date:</span> <strong>${formattedDue}</strong></div>
        ${breakdown.rent ? `<div class="highlight-row"><span>Rent:</span> <span>${formatCurrency(breakdown.rent)}</span></div>` : ''}
        ${breakdown.water ? `<div class="highlight-row"><span>Water Charges:</span> <span>${formatCurrency(breakdown.water)}</span></div>` : ''}
        ${breakdown.electricity ? `<div class="highlight-row"><span>Electricity Charges:</span> <span>${formatCurrency(breakdown.electricity)}</span></div>` : ''}
        ${breakdown.other ? `<div class="highlight-row"><span>Other Fees:</span> <span>${formatCurrency(breakdown.other)}</span></div>` : ''}
        <div class="total-row">
          <span>Overdue Balance:</span>
          <span class="total-amount">${formattedBalance}</span>
        </div>
      </div>

      <p class="message">
        Please access your portal today to settle your balance or contact administration if you need assistance.
      </p>

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/tenant?tab=payments" class="cta-btn">Pay Overdue Balance Now</a>
      </div>
    </div>
    <div class="footer">
      <p>RentTrack Property Management System &bull; Billing Compliance Department</p>
      <p>If you have already settled your payment, thank you for your cooperation.</p>
    </div>
  </div>
</body>
</html>
        `;

        const mailOptions = {
            from: fromAddress,
            to,
            subject: `URGENT: Payment Overdue Notice for ${billingMonth} - RentTrack`,
            html,
        };

        const info = await mailClient.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Overdue notice sent to ${to} (Message ID: ${info.messageId})`);
        if (nodemailer.getTestMessageUrl && info.messageId && !process.env.SMTP_HOST) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EMAIL PREVIEW] ${previewUrl}`);
        }
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send overdue notice to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send a payment receipt to an address chosen by the tenant.
 */
const sendPaymentReceiptEmail = async ({
    to,
    tenantName,
    invoiceNumber,
    billingMonth,
    roomNumber,
    amountPaid,
    referenceNumber,
    paymentDate,
    paymentMethod
}) => {
    try {
        const mailClient = await getTransporter();
        const fromAddress = process.env.SMTP_FROM || '"RentTrack Billing" <billing@renttrack.com>';
        const formattedAmount = formatCurrency(amountPaid);
        const formattedDate = formatDate(paymentDate);

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background: #0f172a; padding: 26px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .badge { display: inline-block; background: #ccfbf1; color: #0f766e; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; letter-spacing: 0.5px; }
    .content { padding: 30px 32px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 10px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 22px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; font-size: 13px; color: #64748b; }
    .row:last-child { margin-bottom: 0; }
    .row strong { color: #0f172a; text-align: right; }
    .total { border-top: 1px dashed #cbd5e1; margin-top: 14px; padding-top: 14px; font-size: 15px; font-weight: 700; color: #0f172a; }
    .total-amount { color: #0f766e; font-size: 18px; font-weight: 800; }
    .footer { background: #f1f5f9; padding: 18px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RentTrack Management</h1>
      <p>Official Payment Receipt</p>
    </div>
    <div class="content">
      <div class="badge">Payment Verified</div>
      <div class="greeting">Hello, ${tenantName}!</div>
      <p class="message">
        This is your official receipt for the QR Ph payment of your <strong>${billingMonth}</strong> billing statement. Thank you for settling your account.
      </p>
      <div class="card">
        <div class="row"><span>Invoice Number:</span> <strong>${invoiceNumber || 'N/A'}</strong></div>
        <div class="row"><span>Billing Month:</span> <strong>${billingMonth || 'N/A'}</strong></div>
        <div class="row"><span>Room:</span> <strong>${roomNumber || 'N/A'}</strong></div>
        <div class="row"><span>Reference Number:</span> <strong>${referenceNumber || 'N/A'}</strong></div>
        <div class="row"><span>Payment Method:</span> <strong>${paymentMethod || 'E-Wallet (QR Ph)'}</strong></div>
        <div class="row"><span>Date Paid:</span> <strong>${formattedDate}</strong></div>
        <div class="row total"><span>Amount Paid:</span> <span class="total-amount">${formattedAmount}</span></div>
      </div>
    </div>
    <div class="footer">
      <p>RentTrack Property Management System &bull; This receipt was sent at your request through the Tenant Portal.</p>
    </div>
  </div>
</body>
</html>
        `;

        const info = await mailClient.sendMail({
            from: fromAddress,
            to,
            subject: `Payment Receipt - ${billingMonth || 'RentTrack'} - RentTrack`,
            html,
        });
        console.log(`[EMAIL SENT] Payment receipt sent to ${to} (Message ID: ${info.messageId})`);
        if (nodemailer.getTestMessageUrl && info.messageId && !process.env.SMTP_HOST) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EMAIL PREVIEW] ${previewUrl}`);
        }
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send receipt to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send Bill Statement Generated Notification Email to Tenant's Sign-Up Email
 */
const sendBillGeneratedEmail = async ({
    to,
    tenantName,
    roomNumber,
    invoiceNumber,
    billingMonth,
    dueDate,
    totalAmount,
    balance,
    breakdown = {},
    additionalCharges = []
}) => {
    try {
        if (!to || typeof to !== 'string' || !to.includes('@')) {
            console.warn('[sendBillGeneratedEmail] Invalid or missing recipient email:', to);
            return { success: false, error: 'Invalid recipient email' };
        }

        const mailClient = await getTransporter();
        const fromAddress = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"RentTrack Management" <${process.env.SMTP_USER}>` : '"RentTrack Billing" <billing@renttrack.com>');
        const formattedDue = formatDate(dueDate);
        const formattedTotal = formatCurrency(totalAmount);
        const formattedBalance = formatCurrency(balance);

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background: #0f172a; padding: 28px 32px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .badge-bill { display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px; letter-spacing: 0.5px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .highlight-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .highlight-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #64748b; }
    .highlight-row:last-child { margin-bottom: 0; }
    .highlight-row strong { color: #0f172a; }
    .total-row { border-top: 1px dashed #cbd5e1; margin-top: 14px; padding-top: 14px; font-size: 15px; font-weight: 700; color: #0f172a; display: flex; justify-content: space-between; }
    .total-amount { color: #0284c7; font-size: 18px; font-weight: 800; }
    .cta-btn { display: inline-block; background: #0284c7; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin-top: 8px; text-align: center; }
    .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RentTrack Management</h1>
      <p>Official Rental Billing Notification</p>
    </div>
    <div class="content">
      <div class="badge-bill">New Billing Statement</div>
      <div class="greeting">Hello, ${tenantName || 'Resident'}!</div>
      <p class="message">
        Your monthly rental statement for <strong>${billingMonth}</strong> has been generated and is now ready. Please review your billing breakdown below and ensure settlement on or before your due date, <strong>${formattedDue}</strong>.
      </p>

      <div class="highlight-card">
        <div class="highlight-row"><span>Invoice Number:</span> <strong>${invoiceNumber || 'N/A'}</strong></div>
        <div class="highlight-row"><span>Assigned Room:</span> <strong>Room ${roomNumber || 'N/A'}</strong></div>
        <div class="highlight-row"><span>Billing Month:</span> <strong>${billingMonth}</strong></div>
        <div class="highlight-row"><span>Due Date:</span> <strong>${formattedDue}</strong></div>
        ${breakdown.rent !== undefined ? `<div class="highlight-row"><span>Monthly Rent:</span> <span>${formatCurrency(breakdown.rent)}</span></div>` : ''}
        ${breakdown.water !== undefined ? `<div class="highlight-row"><span>Water Charges:</span> <span>${formatCurrency(breakdown.water)}</span></div>` : ''}
        ${breakdown.electricity !== undefined ? `<div class="highlight-row"><span>Electricity Charges:</span> <span>${formatCurrency(breakdown.electricity)}</span></div>` : ''}
        ${breakdown.other && Number(breakdown.other) > 0 ? `<div class="highlight-row"><span>Other Fees:</span> <span>${formatCurrency(breakdown.other)}</span></div>` : ''}
        ${Array.isArray(additionalCharges) && additionalCharges.length > 0 ? additionalCharges.map(c => `<div class="highlight-row"><span>${c.label}:</span> <span>${formatCurrency(c.amount)}</span></div>`).join('') : ''}
        <div class="total-row">
          <span>Total Amount Due:</span>
          <span class="total-amount">${formattedTotal}</span>
        </div>
      </div>

      <p class="message">
        You can view your full invoice breakdown and settle your bill directly through your Tenant Portal via online payment (GCash / QR Ph) or cash.
      </p>

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/tenant/bill_and_payment" class="cta-btn">View Statement &amp; Settle Bill</a>
      </div>
    </div>
    <div class="footer">
      <p>RentTrack Property Management System &bull; Automated Billing Department</p>
      <p>This statement notification was sent to <strong>${to}</strong> (your registered sign-up account email).</p>
    </div>
  </div>
</body>
</html>
        `;

        const mailOptions = {
            from: fromAddress,
            to,
            subject: `New Billing Statement: Invoice #${invoiceNumber || ''} for ${billingMonth} - RentTrack`,
            html,
        };

        const info = await mailClient.sendMail(mailOptions);
        console.log(`[EMAIL SENT] Bill statement notification sent to ${to} (Message ID: ${info.messageId})`);
        if (nodemailer.getTestMessageUrl && info.messageId && !process.env.SMTP_HOST && !process.env.SMTP_USER) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) console.log(`[EMAIL PREVIEW] ${previewUrl}`);
        }
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send bill statement notification to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPaymentDueEmail,
    sendPaymentOverdueEmail,
    sendPaymentReceiptEmail,
    sendBillGeneratedEmail,
};
