const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
];
const envPath = envPaths.find(candidate => fs.existsSync(candidate));

if (envPath) {
  const result = dotenv.config({ path: envPath, quiet: true });
  if (result.error) {
    throw new Error(`Unable to load environment configuration from ${envPath}`);
  }
}

const configuredOrigins = [
  ...(process.env.CLIENT_URLS || '').split(','),
  process.env.CLIENT_URL,
]
  .map(origin => origin?.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : []),
]);

module.exports = {
  allowedOrigins,
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  cookieSecure: process.env.NODE_ENV === 'production',
  envFilePath: envPath,
  jwtSecret: process.env.JWT_SECRET,
  mongoUri: process.env.MONGO_URI,
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  publicApiUrl: process.env.API_PUBLIC_URL?.replace(/\/$/, '') || '',
};
