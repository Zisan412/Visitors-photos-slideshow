const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COOKIE_NAME } = require('../middleware/auth');
const { cookieSameSite, cookieSecure, jwtSecret } = require('../config/env');
const { serializeUser } = require('../utils/serialize');

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

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

  if (name.length < 1 || name.length > 80) {
    return res.status(400).json({ message: 'Enter a name between 1 and 80 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
  }
  if (await User.exists({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await User.create({ name, email, passwordHash });
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

module.exports = { login, logout, me, signup };
