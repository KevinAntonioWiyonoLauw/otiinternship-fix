const axios = require('axios');
const logger = require('./logger');

const presenceServiceUrl = process.env.PRESENCE_SERVICE_URL || 'http://presence-service:8006';
const trainingServiceUrl = process.env.TRAINING_SERVICE_URL || 'http://training-service:8004';

// Get user's attendance history from Presence Service
const getUserAttendanceHistory = async (userId, token) => {
  try {
    const response = await axios.get(
      `${presenceServiceUrl}/api/presence/history/${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data.attendance_history || [];
  } catch (error) {
    logger.error(`Error getting attendance history: ${error.message}`);
    throw error;
  }
};

// Get total number of trainings from Training Service
const getTotalTrainingsCount = async (token) => {
  try {
    const response = await axios.get(
      `${trainingServiceUrl}/api/trainings/count`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data.count || 0;
  } catch (error) {
    logger.error(`Error getting total trainings count: ${error.message}`);
    // Default to 0 if we can't get the count to avoid breaking calculations
    return 0;
  }
};

// Calculate attendance percentage (presence_progress)
const calculateAttendancePercentage = async (userId, token) => {
  try {
    // Get the user's attendance records
    const attendanceHistory = await getUserAttendanceHistory(userId, token);
    
    // Get the total number of trainings in the system
    const totalTrainings = await getTotalTrainingsCount(token);
    
    if (totalTrainings === 0) {
      return 0; // No trainings yet, so 0% attendance
    }
    
    // Calculate percentage (number of attendances / total trainings * 100)
    const attendedCount = attendanceHistory.length;
    let percentage = (attendedCount / totalTrainings) * 100;
    
    // Ensure percentage doesn't exceed 100%
    percentage = Math.min(percentage, 100);
    
    // Convert to progress value (max 0.5 or 50%)
    return (percentage / 100) * 0.5;
  } catch (error) {
    logger.error(`Error calculating attendance percentage: ${error.message}`);
    return 0; // Default to 0 if calculation fails
  }
};

module.exports = {
  getUserAttendanceHistory,
  getTotalTrainingsCount,
  calculateAttendancePercentage
};