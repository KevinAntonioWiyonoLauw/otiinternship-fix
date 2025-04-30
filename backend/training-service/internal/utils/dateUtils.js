const logger = require('../logger');

/**
 * Format time in HH.MM WIB format
 * @param {Date|String} time - The time to format
 * @returns {String} Formatted time (e.g. "16:00 WIB")
 */
const formatTimeToWIB = (time) => {
  try {
    // Log the raw time value for debugging
    logger.debug(`Formatting time: ${time}, type: ${typeof time}`);
    
    // Handle different time formats
    if (!time) return '00:00 WIB';
    
    // If it's a TIME string from database like "16:30:00"
    if (typeof time === 'string' && time.includes(':') && !time.includes('T')) {
      const parts = time.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')} WIB`;
    }
    
    // If it's a Date object (including Prisma's TIME which appears as epoch date 1970-01-01T...)
    if (time instanceof Date) {
      // Extract just the hours and minutes, ignoring the epoch date part
      return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')} WIB`;
    }
    
    // If it's already in WIB format
    if (typeof time === 'string' && time.includes('WIB')) {
      return time;
    }
    
    // Fallback: try parsing as a Date object
    const parsed = new Date(time);
    // FIX: Replace isNaN with Number.isNaN for more robust validation
    if (!Number.isNaN(parsed.getTime())) {
      return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')} WIB`;
    }
    
    // Last resort: return as is with WIB appended
    logger.warn(`Unrecognized time format: ${time}`);
    return `${time} WIB`;
  } catch (error) {
    logger.error(`Error formatting time to WIB: ${error.message}`);
    return '00:00 WIB'; // Safe default
  }
};

/**
 * Format date to Indonesian format
 * @param {Date|String} date - The date to format
 * @returns {String} Formatted date (e.g. "Kamis, 3 April 2025")
 */
const formatDateToIndonesian = (date) => {
  try {
    if (!date) return '';
    
    // Ensure we're working with a Date object
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // FIX: Replace isNaN with Number.isNaN for more robust validation
    if (Number.isNaN(dateObj.getTime())) {
      logger.warn(`Invalid date provided: ${date}`);
      return String(date);
    }
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayOfWeek = days[dateObj.getDay()];
    const dayOfMonth = dateObj.getDate();
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    return `${dayOfWeek}, ${dayOfMonth} ${month} ${year}`;
  } catch (error) {
    logger.error(`Error formatting date to Indonesian: ${error.message}`);
    return String(date); // Return the input as a fallback
  }
};

/**
 * Format time range in HH.MM - HH.MM WIB format
 * @param {Date|String} startTime - The start time
 * @param {Date|String} endTime - The end time
 * @returns {String} Formatted time range (e.g. "16:00 - 17:00 WIB")
 */
const formatTimeRangeToWIB = (startTime, endTime) => {
  try {
    // Format each time
    let start = formatTimeToWIB(startTime);
    let end = formatTimeToWIB(endTime);
    
    // Remove WIB from the first time to avoid repetition
    if (start.includes(' WIB')) {
      start = start.replace(' WIB', '');
    }
    
    return `${start} - ${end}`;
  } catch (error) {
    logger.error(`Error formatting time range: ${error.message}`);
    return "Waktu tidak tersedia";
  }
};

/**
 * Compare two times (ignoring the date part)
 * @param {Date|String} time1 - First time to compare
 * @param {Date|String} time2 - Second time to compare
 * @returns {Number} -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
const compareTimesOnly = (time1, time2) => {
  try {
    // Convert to Date objects
    const d1 = time1 instanceof Date ? time1 : new Date(time1);
    const d2 = time2 instanceof Date ? time2 : new Date(time2);
    
    // Create comparison values using just hours and minutes
    const t1 = d1.getHours() * 60 + d1.getMinutes();
    const t2 = d2.getHours() * 60 + d2.getMinutes();
    
    return t1 === t2 ? 0 : (t1 < t2 ? -1 : 1);
  } catch (error) {
    logger.error(`Error comparing times: ${error.message}`);
    return 0; // Default to equal on error
  }
};

module.exports = {
  formatTimeToWIB,
  formatDateToIndonesian,
  formatTimeRangeToWIB,
  compareTimesOnly
};