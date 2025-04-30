const Joi = require('joi');

// Schema untuk membuat training baru
const createTrainingSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.base': 'Judul harus berupa teks',
      'string.min': 'Judul harus memiliki setidaknya {#limit} karakter',
      'string.max': 'Judul tidak boleh melebihi {#limit} karakter',
      'any.required': 'Judul wajib diisi'
    }),
  
  date: Joi.date()
    .iso()
    .custom((value, helpers) => {
      // Ambil tanggal hari ini (reset jam ke 00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Bandingkan dengan value (tanggal input)
      if (value < today) {
        return helpers.error('date.min', { limit: today.toISOString() });
      }
      return value;
    })
    .required()
    .messages({
      'date.base': 'Tanggal harus berupa tanggal yang valid',
      'date.format': 'Format tanggal harus ISO 8601 (YYYY-MM-DD)',
      'date.min': 'Tanggal tidak boleh di masa lalu',
      'any.required': 'Tanggal wajib diisi'
    }),
  
  start_time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.base': 'Waktu mulai harus berupa teks',
      'string.pattern.base': 'Format waktu mulai harus HH:MM (24 jam)',
      'any.required': 'Waktu mulai wajib diisi'
    }),
  
  end_time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.base': 'Waktu selesai harus berupa teks',
      'string.pattern.base': 'Format waktu selesai harus HH:MM (24 jam)',
      'any.required': 'Waktu selesai wajib diisi'
    }),
  
  location: Joi.string()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.base': 'Lokasi harus berupa teks',
      'string.min': 'Lokasi harus memiliki setidaknya {#limit} karakter',
      'string.max': 'Lokasi tidak boleh melebihi {#limit} karakter',
      'any.required': 'Lokasi wajib diisi'
    }),
  
  division_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID divisi harus berupa angka',
      'number.integer': 'ID divisi harus berupa bilangan bulat',
      'number.positive': 'ID divisi harus berupa bilangan positif',
      'any.required': 'ID divisi wajib diisi'
    })
}).custom((value, helpers) => {
  // Custom validation to ensure end_time is after start_time
  const { start_time, end_time } = value;
  
  // Parse times to minutes
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const startMinutes = parseTime(start_time);
  const endMinutes = parseTime(end_time);
  
  if (endMinutes <= startMinutes) {
    return helpers.error('custom.invalidTimeRange', { message: 'Waktu selesai harus setelah waktu mulai' });
  }
  
  return value;
}, 'validate-time-range');

// Schema untuk merekam kehadiran
const recordPresenceSchema = Joi.object({
  training_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID training harus berupa angka',
      'number.integer': 'ID training harus berupa bilangan bulat',
      'number.positive': 'ID training harus berupa bilangan positif',
      'any.required': 'ID training wajib diisi'
    }),
  
  user_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.base': 'ID user harus berupa teks',
      'string.uuid': 'ID user harus berupa UUID yang valid',
      'any.required': 'ID user wajib diisi'
    }),
  
  present: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'Status kehadiran harus berupa boolean',
      'any.required': 'Status kehadiran wajib diisi'
    })
});

// Schema untuk checking schedule conflict
const checkConflictSchema = Joi.object({
  date: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Tanggal harus berupa tanggal yang valid',
      'date.format': 'Format tanggal harus ISO 8601 (YYYY-MM-DD)',
      'any.required': 'Tanggal wajib diisi'
    }),
  
  start_time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.base': 'Waktu mulai harus berupa teks',
      'string.pattern.base': 'Format waktu mulai harus HH:MM (24 jam)',
      'any.required': 'Waktu mulai wajib diisi'
    }),
  
  end_time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.base': 'Waktu selesai harus berupa teks',
      'string.pattern.base': 'Format waktu selesai harus HH:MM (24 jam)',
      'any.required': 'Waktu selesai wajib diisi'
    })
}).custom((value, helpers) => {
  // Custom validation to ensure end_time is after start_time
  const { start_time, end_time } = value;
  
  // Parse times to minutes
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const startMinutes = parseTime(start_time);
  const endMinutes = parseTime(end_time);
  
  if (endMinutes <= startMinutes) {
    return helpers.error('custom.invalidTimeRange', { message: 'Waktu selesai harus setelah waktu mulai' });
  }
  
  return value;
}, 'validate-time-range');

module.exports = {
  createTrainingSchema,
  recordPresenceSchema,
  checkConflictSchema
};