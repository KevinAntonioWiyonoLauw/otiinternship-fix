const nodemailer = require('nodemailer');
const logger = require('../logger');
const emailRepository = require('../repositories/emailRepo');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Initialize Nodemailer transporter with MailerSend SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailersend.net',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    // Jangan terlalu ketat dengan sertifikat TLS
    rejectUnauthorized: false
  }
});

// Verifikasi koneksi SMTP saat startup
transporter.verify()
  .then(() => {
    logger.info('SMTP connection established successfully');
  })
  .catch(error => {
    logger.error(`SMTP connection failed: ${error.message}`);
  });

// Common email template components
const headerTemplate = `
<div style="background-color: #fe7f00; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
  <h1 style="color: white; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-weight: 600;">OTI Internship</h1>
</div>
`;

const footerTemplate = `
<div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 20px;">
  <p style="color: #666; margin: 0; font-size: 12px; font-family: 'Segoe UI', Arial, sans-serif;">
    © ${new Date().getFullYear()} OTI Internship Program. All rights reserved.
  </p>
  <div style="margin-top: 10px;">
    <a href="#" style="margin: 0 10px; color: #fe7f00; text-decoration: none;">Contact Us</a>
    <a href="#" style="margin: 0 10px; color: #fe7f00; text-decoration: none;">Privacy Policy</a>
    <a href="#" style="margin: 0 10px; color: #fe7f00; text-decoration: none;">Terms of Service</a>
  </div>
</div>
`;

// Generic function to send email using Nodemailer
const sendEmail = async (to, subject, htmlContent, textContent, emailType, userId = null, token = null) => {
  const logData = {
    email: to,
    email_type: emailType,
    user_id: userId,
    token: token
  };

  await emailRepository.logEmailAttempt(logData);

  // Prepare email options
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'OTI Internship <noreply@oti.internship>',
    to: to,
    subject: subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    logger.info(`Sending ${emailType} email to ${to}`);
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    await emailRepository.updateEmailStatus(to, emailType, 'sent');
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error.message || 'Unknown error sending email';
    logger.error(`Failed to send ${emailType} email to ${to}: ${errorMessage}`, {
      errorDetails: error,
      recipientEmail: to,
      smtpHost: process.env.SMTP_HOST,
      smtpUser: process.env.SMTP_USER,
      stack: error.stack
    });
    
    // Cek tipe error yang umum
    if (errorMessage.includes('authentication')) {
      logger.error('SMTP Authentication failed. Please check SMTP_USER and SMTP_PASSWORD');
    } else if (errorMessage.includes('connection')) {
      logger.error('SMTP Connection failed. Please check SMTP_HOST and SMTP_PORT');
    }
    
    await emailRepository.updateEmailStatus(to, emailType, 'failed', errorMessage);
    return { success: false, error: errorMessage };
  }
};

// Send Reset Password Email
const sendResetPasswordEmail = async (data) => {
  const { email, reset_token, user_id } = data;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${reset_token}`;

  const subject = 'Reset Your OTI Internship Password';
  const textContent = `Please reset your password by clicking the following link: ${resetUrl}\n\nThis link will expire in 24 hours. If you did not request a password reset, please ignore this email.`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      ${headerTemplate}
      <div style="padding: 20px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your OTI Internship account associated with this email address.</p>
        <p>Click the button below to reset your password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #fe7f00; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </p>
        <p>If the button doesn't work, copy and paste the following link into your browser:</p>
        <p><a href="${resetUrl}" style="color: #fe7f00;">${resetUrl}</a></p>
        <p>This link will expire in 24 hours. If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Thanks,<br/>The OTI Internship Team</p>
      </div>
      ${footerTemplate}
    </div>
  `;

  return await sendEmail(email, subject, htmlContent, textContent, 'reset_password', user_id, reset_token);
};

// Send Meeting Reminder Email
const sendMeetingReminder = async (data) => {
  const { email, meeting_title, meeting_date, meeting_time, meeting_location, join_code, user_id } = data;
  
  // Use the provided meeting_date and meeting_time directly instead of parsing
  // This avoids the "Invalid Date" issue when the input formats aren't standard Date objects
  const formattedDate = meeting_date || 'Date not specified';
  const formattedTime = meeting_time || 'Time not specified';
  
  const subject = `Reminder: Upcoming Meeting - ${meeting_title}`;
  const textContent = `🗓️Hi,\n\nThis is a reminder for your upcoming meeting:\n
  Title: ${meeting_title}
  Date: ${formattedDate}
  Time: ${formattedTime}
  Location: ${meeting_location || 'Location not specified'}
  Join Code: ${join_code || 'No join code available'}
  
  Please be prepared and join on time.\n\nThanks,\nThe OTI Internship Team`;
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      ${headerTemplate}
      <div style="padding: 20px;">
        <h2 style="color: #333;">Meeting Reminder</h2>
        <p>Hello,</p>
        <p>This is a friendly reminder about your upcoming meeting:</p>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;"><strong>Title:</strong> ${meeting_title}</li>
          <li style="margin-bottom: 10px;"><strong>Date:</strong> ${formattedDate}</li>
          <li style="margin-bottom: 10px;"><strong>Time:</strong> ${formattedTime}</li>
          <li style="margin-bottom: 10px;"><strong>Location:</strong> ${meeting_location || 'Location not specified'}</li>
          <li style="margin-bottom: 10px;"><strong>Join Code:</strong> <span style="font-family: monospace; background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${join_code || 'No join code available'}</span></li>
        </ul>
        <p>Please be prepared and join on time.</p>
        <p>Thanks,<br/>The OTI Internship Team</p>
      </div>
      ${footerTemplate}
    </div>
  `;

  return await sendEmail(email, subject, htmlContent, textContent, 'meeting_reminder', user_id);
};

// Send Training Reminder Email
const sendTrainingReminder = async (data) => {
  const { email, training_title, training_date, training_time, training_location, user_id } = data;
  
  // Use the provided training_date and training_time directly instead of parsing
  // This avoids the "Invalid Date" issue when the input formats aren't standard Date objects
  const formattedDate = training_date || 'Date not specified';
  const formattedTime = training_time || 'Time not specified';
  
  const subject = `Reminder: Upcoming Training - ${training_title}`;
  const textContent = `Hi,\n\nThis is a reminder for your upcoming training session:\n
  Title: ${training_title}
  Date: ${formattedDate}
  Time: ${formattedTime}
  Location: ${training_location || 'Location not specified'}
  
  We look forward to seeing you there!\n\nThanks,\nThe OTI Internship Team`;
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      ${headerTemplate}
      <div style="padding: 20px;">
        <h2 style="color: #333;">Training Reminder</h2>
        <p>Hello,</p>
        <p>This is a friendly reminder about your upcoming training session:</p>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;"><strong>Title:</strong> ${training_title}</li>
          <li style="margin-bottom: 10px;"><strong>Date:</strong> ${formattedDate}</li>
          <li style="margin-bottom: 10px;"><strong>Time:</strong> ${formattedTime}</li>
          <li style="margin-bottom: 10px;"><strong>Location:</strong> ${training_location || 'Location not specified'}</li>
        </ul>
        <p>We look forward to seeing you there!</p>
        <p>Thanks,<br/>The OTI Internship Team</p>
      </div>
      ${footerTemplate}
    </div>
  `;

  return await sendEmail(email, subject, htmlContent, textContent, 'training_reminder', user_id);
};

// Send Batch Training Reminder Email
const sendBatchTrainingReminder = async (batchData) => {
  const { emails, training_title, training_date, training_time, training_location } = batchData;
  
  // Use the provided training_date and training_time directly instead of parsing
  // This avoids the "Invalid Date" issue when the input formats aren't standard Date objects
  const formattedDate = training_date || 'Date not specified';
  const formattedTime = training_time || 'Time not specified';

  const subject = `Reminder: Upcoming Training - ${training_title}`;
  const textContent = `Hi,\n\nThis is a reminder for your upcoming training session:\n
  Title: ${training_title}
  Date: ${formattedDate}
  Time: ${formattedTime}
  Location: ${training_location || 'Location not specified'}
  
  We look forward to seeing you there!\n\nThanks,\nThe OTI Internship Team`;
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      ${headerTemplate}
      <div style="padding: 20px;">
        <h2 style="color: #333;">Training Reminder</h2>
        <p>Hello,</p>
        <p>This is a friendly reminder about your upcoming training session:</p>
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;"><strong>Title:</strong> ${training_title}</li>
          <li style="margin-bottom: 10px;"><strong>Date:</strong> ${formattedDate}</li>
          <li style="margin-bottom: 10px;"><strong>Time:</strong> ${formattedTime}</li>
          <li style="margin-bottom: 10px;"><strong>Location:</strong> ${training_location || 'Location not specified'}</li>
        </ul>
        <p>We look forward to seeing you there!</p>
        <p>Thanks,<br/>The OTI Internship Team</p>
      </div>
      ${footerTemplate}
    </div>
  `;

  // Log attempt for the batch as a single entry
  await emailRepository.logEmailAttempt({ email: emails.join(','), email_type: 'batch_training_reminder' });

  try {
    logger.info(`Sending batch training reminder for "${training_title}" to ${emails.length} recipients.`);
    
    // Untuk batch email dengan Nodemailer, kita dapat menggunakan BCC
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'OTI Internship <noreply@oti.internship>',
      bcc: emails, // Gunakan BCC untuk mengirim ke banyak penerima secara tersembunyi
      subject: subject,
      text: textContent,
      html: htmlContent,
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Batch email sent successfully. Message ID: ${info.messageId}`);
    await emailRepository.updateEmailStatus(emails.join(','), 'batch_training_reminder', 'sent');
    return { success: true, count: emails.length, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error.message || 'Unknown error sending batch email';
    logger.error(`Failed to send batch training reminder: ${errorMessage}`);
    await emailRepository.updateEmailStatus(emails.join(','), 'batch_training_reminder', 'failed', errorMessage);
    return { success: false, error: errorMessage, count: 0 };
  }
};

// Retry pending emails
const retryPendingEmails = async () => {
  const pendingEmails = await emailRepository.getPendingEmails();
  let successCount = 0;
  let failedCount = 0;

  logger.info(`Retrying ${pendingEmails.length} pending emails.`);

  for (const emailLog of pendingEmails) {
    let result;
    const data = { // Reconstruct data based on email type
        email: emailLog.email,
        user_id: emailLog.userId,
        // Add other necessary fields based on emailLog.emailType
        // Example:
        reset_token: emailLog.emailType === 'reset_password' ? emailLog.token : undefined,
        // meeting_title, meeting_time, etc. for meeting_reminder
        // training_title, training_time, etc. for training_reminder
        // Note: Retrieving full context for retry might require storing more data in emailLog or fetching it
    };

    // Simplified retry logic - assumes necessary data is available or can be reconstructed
    // A more robust solution might involve storing the full original payload or fetching context
    logger.warn(`Attempting retry for ${emailLog.emailType} to ${emailLog.email}. Full context might be missing.`);

    try {
        switch (emailLog.emailType) {
            case 'reset_password':
                if (data.reset_token) { // Ensure token is available
                   result = await sendResetPasswordEmail(data);
                } else {
                   logger.error(`Cannot retry reset_password for ${emailLog.email}: Missing token.`);
                   result = { success: false };
                }
                break;
            case 'meeting_reminder':
                // Need to fetch meeting details based on user_id or stored context
                logger.warn(`Retry for meeting_reminder not fully implemented - requires context fetching.`);
                result = { success: false }; // Placeholder
                // result = await sendMeetingReminder(reconstructedData);
                break;
            case 'training_reminder':
                 // Need to fetch training details based on user_id or stored context
                logger.warn(`Retry for training_reminder not fully implemented - requires context fetching.`);
                result = { success: false }; // Placeholder
                // result = await sendTrainingReminder(reconstructedData);
                break;
            default:
                logger.warn(`Unknown email type for retry: ${emailLog.emailType}`);
                result = { success: false };
        }

        if (result.success) {
            successCount++;
            // Update status in repo is handled within the send functions now
        } else {
            failedCount++;
            // Update status in repo is handled within the send functions now
            // Optionally, implement max retry logic here or in the repository
            await emailRepository.incrementRetryCount(emailLog.id);
        }
    } catch(retryError) {
        logger.error(`Error during email retry for ${emailLog.email}: ${retryError.message}`);
        failedCount++;
        await emailRepository.updateEmailStatus(emailLog.email, emailLog.emailType, 'failed', retryError.message);
        await emailRepository.incrementRetryCount(emailLog.id);
    }
  }

  logger.info(`Email retry task finished: ${successCount} succeeded, ${failedCount} failed.`);
  return { success: successCount, failed: failedCount };
};

module.exports = {
  sendResetPasswordEmail,
  sendMeetingReminder,
  sendTrainingReminder,
  sendBatchTrainingReminder,
  retryPendingEmails,
  verifyEmailConnection: () => transporter.verify() // Add this for health checks
};