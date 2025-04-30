const { PrismaClient } = require('@prisma/client');
const logger = require('../logger');

const prisma = new PrismaClient();

/**
 * Log email sending attempt in database
 * @param {Object} emailData - The email data
 * @param {string} status - Sending status (sent/failed)
 * @param {string} errorMessage - Error message if any
 */
const logEmailSent = async (emailData, status, errorMessage = null) => {
  try {
    const { email, email_type, token, user_id } = emailData;
    
    const result = await prisma.emailLog.create({
      data: {
        email,
        emailType: email_type,
        token,
        userId: user_id,
        status,
        errorMessage
      }
    });
    
    logger.debug(`Email log created: ID=${result.id}, Status=${status}`);
    return result;
  } catch (error) {
    logger.error(`Error logging email: ${error.message}`);
    // Continue execution even if logging fails
    return null;
  }
};

/**
 * Get email logs by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of email logs
 */
const getEmailLogsByUser = async (userId) => {
  try {
    return await prisma.emailLog.findMany({
      where: {
        userId
      },
      orderBy: {
        sentAt: 'desc'
      }
    });
  } catch (error) {
    logger.error(`Error getting email logs for user ${userId}: ${error.message}`);
    throw error;
  }
};

/**
 * Count pending emails that need to be retried
 * @returns {Promise<number>} Count of pending emails
 */
const countPendingEmails = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const count = await prisma.emailLog.count({
      where: {
        status: 'failed',
        sentAt: {
          gt: twentyFourHoursAgo
        }
      }
    });
    
    return count;
  } catch (error) {
    logger.error(`Error counting pending emails: ${error.message}`);
    return 0; // Return 0 on error to avoid further process
  }
};

/**
 * Clean up old email logs
 * @param {number} days - Days to keep logs
 * @returns {Promise<number>} Number of deleted records
 */
const cleanupOldEmailLogs = async (days = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await prisma.emailLog.deleteMany({
      where: {
        sentAt: {
          lt: cutoffDate
        }
      }
    });
    
    const deletedCount = result.count;
    
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old email logs older than ${days} days`);
    }
    
    return deletedCount;
  } catch (error) {
    logger.error(`Error cleaning up old email logs: ${error.message}`);
    return 0;
  }
};

// Log initial attempt before sending
const logEmailAttempt = async (data) => {
  try {
    await prisma.emailLog.create({
      data: {
        email: data.email,
        emailType: data.email_type,
        status: 'queued',
        token: data.token || null,
        userId: data.user_id || null,
        sentAt: new Date()
      }
    });
    return true;
  } catch (error) {
    logger.error(`Error logging email attempt: ${error.message}`);
    return false;
  }
};

// Update status after sending attempt
const updateEmailStatus = async (email, emailType, status, errorMessage = null) => {
  try {
    // Find the most recent 'queued' log entry for this email and type
    const latestQueuedLog = await prisma.emailLog.findFirst({
      where: {
        email,
        emailType,
        status: 'queued',
      },
      orderBy: {
        sentAt: 'desc', // Get the latest one
      },
    });

    if (!latestQueuedLog) {
      logger.warn(`No recent 'queued' log found for email ${email} and type ${emailType} to update status.`);
      return false;
    }

    // Update the specific log entry by ID instead of using updateMany
    await prisma.emailLog.update({
      where: {
        id: latestQueuedLog.id,
      },
      data: {
        status,
        errorMessage,
        // updatedAt is removed as it's likely handled automatically by Prisma
      },
    });
    
    logger.debug(`Updated status for email log ID ${latestQueuedLog.id} to ${status}`);
    return true;
  } catch (error) {
    logger.error(`Error updating email status: ${error.message}`);
    return false;
  }
};

// Add to retry queue
const addToRetryQueue = async (data) => {
  try {
    await prisma.emailRetryQueue.create({
      data: {
        email: data.email,
        emailType: data.email_type,
        token: data.token || null,
        userId: data.user_id || null,
        errorMessage: data.error,
        retryCount: 0,
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
        createdAt: new Date()
      }
    });
    return true;
  } catch (error) {
    logger.error(`Error adding to retry queue: ${error.message}`);
    return false;
  }
};


/**
 * Get failed emails for retry
 * @returns {Promise<Array>} Array of failed email logs
 */
const getFailedEmailsForRetry = async () => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return await prisma.emailLog.findMany({
      where: {
        status: 'failed',
        sentAt: {
          gt: twentyFourHoursAgo
        }
      },
      orderBy: {
        sentAt: 'desc'
      }
    });
  } catch (error) {
    logger.error(`Error getting failed emails for retry: ${error.message}`);
    return [];
  }
};

/**
 * Increment retry count for a specific email log
 * @param {number} logId - ID of email log entry to increment
 * @returns {Promise<boolean>} Success status
 */
const incrementRetryCount = async (logId) => {
  try {
    if (!logId) {
      logger.warn('Cannot increment retry count: Missing log ID');
      return false;
    }

    await prisma.emailLog.update({
      where: { id: logId },
      data: {
        retryCount: {
          increment: 1,
        },
        // No updatedAt field - will be handled by Prisma if @updatedAt exists
      },
    });

    logger.debug(`Incremented retry count for email log ID: ${logId}`);
    return true;
  } catch (error) {
    logger.error(`Error incrementing retry count for log ID ${logId}: ${error.message}`);
    return false;
  }
};

module.exports = {
  logEmailSent,
  getEmailLogsByUser,
  countPendingEmails,
  cleanupOldEmailLogs,
  getFailedEmailsForRetry,
  logEmailAttempt,
  addToRetryQueue,
  updateEmailStatus,
  incrementRetryCount
};