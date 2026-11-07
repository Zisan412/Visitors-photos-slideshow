const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

const COOKIE_NAME = 'frame_session';

async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: 'Please log in to continue.' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret, { issuer: 'visitor-photo-slideshow' });
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please log in again.' });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
    }
    return next(error);
  }
}

module.exports = { COOKIE_NAME, requireAuth };
