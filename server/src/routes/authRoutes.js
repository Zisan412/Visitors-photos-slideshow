const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getPasswordResetQuestion,
  login,
  logout,
  me,
  resetPassword,
  signup,
  verifyPasswordResetAnswer,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const recoveryQuestionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many recovery attempts. Please try again later.' },
});
const recoveryAnswerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many recovery attempts. Please try again later.' },
});
const recoveryResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many recovery attempts. Please try again later.' },
});

router.post('/signup', signup);
router.post('/login', loginLimiter, login);
router.post('/password-reset/question', recoveryQuestionLimiter, getPasswordResetQuestion);
router.post('/password-reset/verify', recoveryAnswerLimiter, verifyPasswordResetAnswer);
router.post('/password-reset/reset', recoveryResetLimiter, resetPassword);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
