const mongoose = require('mongoose');
const { questions } = require('../utils/securityQuestions');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    securityQuestion: { type: String, enum: Object.keys(questions), default: null, select: false },
    securityAnswerHash: { type: String, default: null, select: false },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetTokenExpiresAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
