const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, logout, me, signup } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/signup', signup);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
