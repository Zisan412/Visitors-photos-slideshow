const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COOKIE_NAME } = require('../middleware/auth');
const { cookieSameSite, cookieSecure, jwtSecret } = require('../config/env');
const { serializeUser } = require('../utils/serialize');
const { normalizeSecurityAnswer, questions } = require('../utils/securityQuestions');

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const ANSWER_INVALID = 'The recovery details could not be verified.';
const RESET_INVALID = 'This password reset link is invalid or has expired. Start again to reset your password.';

function setSessionCookie(res, user) {
  const token = jwt.sign({}, jwtSecret, {
    subject: user._id.toString(),
    issuer: 'visitor-photo-slideshow',
    expiresIn: '7d',
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: SESSION_MS,
    path: '/',
  });
}

async function signup(req, res) {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const securityQuestion = typeof body.securityQuestion === 'string' ? body.securityQuestion : '';
  const securityAnswer = typeof body.securityAnswer === 'string' ? body.securityAnswer : '';

  if (name.length < 1 || name.length > 80) {
    return res.status(400).json({ message: 'Enter a name between 1 and 80 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
  }
  if (!Object.hasOwn(questions, securityQuestion)) {
    return res.status(400).json({ message: 'Choose a security question.' });
  }
  if (!securityAnswer.trim() || securityAnswer.length > 200) {
    return res.status(400).json({ message: 'Enter an answer of 1 to 200 characters.' });
  }
  if (await User.exists({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const [passwordHash, securityAnswerHash] = await Promise.all([
    bcrypt.hash(password, 12),
    bcrypt.hash(normalizeSecurityAnswer(securityAnswer), 12),
  ]);
  let user;
  try {
    user = await User.create({ name, email, passwordHash, securityQuestion, securityAnswerHash });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    throw error;
  }

  setSessionCookie(res, user);
  return res.status(201).json({ user: serializeUser(user) });
}

async function login(req, res) {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }

  setSessionCookie(res, user);
  return res.json({ user: serializeUser(user) });
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/',
  });
  return res.status(204).end();
}

function me(req, res) {
  return res.json({ user: serializeUser(req.user) });
}

async function getPasswordResetQuestion(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.json({ question: null });
  }

  const user = await User.findOne({ email }).select('+securityQuestion');
  if (!user?.securityQuestion || !Object.hasOwn(questions, user.securityQuestion)) {
    return res.json({ question: null });
  }

  return res.json({ question: questions[user.securityQuestion] });
}

async function verifyPasswordResetAnswer(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const answer = typeof req.body?.answer === 'string' ? req.body.answer : '';
  if (!email || !answer.trim() || answer.length > 200) {
    return res.status(400).json({ message: ANSWER_INVALID });
  }

  const user = await User.findOne({ email }).select('+securityQuestion +securityAnswerHash');
  if (!user?.securityQuestion || !user.securityAnswerHash || !Object.hasOwn(questions, user.securityQuestion)) {
    return res.status(400).json({ message: ANSWER_INVALID });
  }

  const matches = await bcrypt.compare(normalizeSecurityAnswer(answer), user.securityAnswerHash);
  if (!matches) return res.status(400).json({ message: ANSWER_INVALID });

  const resetToken = crypto.randomBytes(32).toString('base64url');
  const passwordResetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetTokenHash = passwordResetTokenHash;
  user.passwordResetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  return res.json({ resetToken });
}

async function resetPassword(req, res) {
  const token = typeof req.body?.resetToken === 'string' ? req.body.resetToken : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!token || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: RESET_INVALID });
  }

  const passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash,
    passwordResetTokenExpiresAt: { $gt: new Date() },
  });
  if (!user) return res.status(400).json({ message: RESET_INVALID });

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await User.updateOne(
    {
      _id: user._id,
      passwordResetTokenHash,
      passwordResetTokenExpiresAt: { $gt: new Date() },
    },
    {
      $set: { passwordHash },
      $unset: { passwordResetTokenHash: 1, passwordResetTokenExpiresAt: 1 },
    },
  );
  if (result.modifiedCount !== 1) return res.status(400).json({ message: RESET_INVALID });

  return res.json({ message: 'Your password has been reset. You can now log in.' });
}

module.exports = {
  getPasswordResetQuestion,
  login,
  logout,
  me,
  resetPassword,
  signup,
  verifyPasswordResetAnswer,
};
