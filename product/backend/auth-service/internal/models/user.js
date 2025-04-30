const { Schema, model } = require('mongoose');

const userSchema = new Schema({
    user_id: {
        type: Schema.Types.UUID,
        default: () => new mongoose.Types.UUID(),
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    niu: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    nama_lengkap: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    reset_token: {
        type: String,
        default: null
    },
    reset_token_expired_at: {
        type: Date,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = model('User', userSchema);