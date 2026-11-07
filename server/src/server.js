const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./config/env');

function mongoEndpoint(uri) {
  try {
    const parsed = new URL(uri);
    return {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'mongodb+srv:' ? '27017 (from SRV)' : '27017'),
      protocol: parsed.protocol,
    };
  } catch {
    return { hostname: 'unavailable', port: 'unavailable', protocol: 'invalid URI' };
  }
}

function directAtlasSeedUri(uri) {
  const parsed = new URL(uri);
  if (parsed.protocol !== 'mongodb+srv:' || !/-shard-\d{2}-\d{2}\./i.test(parsed.hostname)) {
    return null;
  }

  const options = new URLSearchParams(parsed.search);
  options.set('tls', 'true');
  if (parsed.username && !options.has('authSource')) {
    options.set('authSource', 'admin');
  }
  const credentials = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@`
    : '';
  return `mongodb://${credentials}${parsed.hostname}:${parsed.port || 27017}${parsed.pathname}?${options}`;
}

function safeMongoError(error, uri) {
  const rawMessage = String(error.message || 'Unknown MongoDB error');
  let message = rawMessage;
  if (uri) {
    message = message.replace(new RegExp(uri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[MongoDB URI redacted]');
  }
  message = message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, match => {
      const endpoint = mongoEndpoint(match);
      return `${endpoint.protocol}//${endpoint.hostname}${endpoint.port.includes('from SRV') ? '' : `:${endpoint.port}`}/[redacted]`;
    })
    .replace(/\/\/[^/@\s]+@/g, '//[credentials redacted]@');
  let cause = error;
  while (cause.cause && cause.cause !== cause) cause = cause.cause;
  return {
    message,
    code: cause.code || error.code || 'unavailable',
  };
}

function logMongoFailure(error, uri) {
  const endpoint = mongoEndpoint(uri);
  const failure = safeMongoError(error, uri);
  console.error('MongoDB connection failed:', JSON.stringify({
    message: failure.message,
    code: failure.code,
    hostname: endpoint.hostname,
    port: endpoint.port,
    protocol: endpoint.protocol,
    dnsResolvers: dns.getServers(),
  }));
  if (failure.code === 'ECONNREFUSED' && /querySrv/i.test(failure.message)) {
    console.error('Node could not query MongoDB SRV records. Check the configured DNS resolver, VPN, or firewall.');
  } else if (['ENOTFOUND', 'EAI_AGAIN'].includes(failure.code)) {
    console.error('MongoDB hostname lookup failed. Check the Atlas hostname and DNS/network access.');
  } else if (failure.code === 8000 || /authentication failed/i.test(failure.message)) {
    console.error('MongoDB rejected authentication. Verify the Atlas database username and password.');
  } else if (/timed out|ETIMEDOUT/i.test(failure.message)) {
    console.error('MongoDB timed out. Check Atlas Network Access and outbound access to the cluster.');
  }
  error.mongoLogged = true;
}

async function startServer() {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is not configured');
  }
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  if (config.envFilePath) {
    console.log(`Environment loaded from ${config.envFilePath}`);
  } else {
    console.log('Environment loaded from process variables');
  }

  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  } catch (error) {
    let fallbackUri;
    try {
      fallbackUri = directAtlasSeedUri(config.mongoUri);
    } catch {
      fallbackUri = null;
    }

    if (safeMongoError(error, config.mongoUri).code === 'ECONNREFUSED'
      && /querySrv/i.test(String(error.message))
      && fallbackUri) {
      console.warn('Atlas SRV DNS lookup was refused; retrying the configured shard seed host with system DNS.');
      try {
        await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 10000 });
      } catch (fallbackError) {
        logMongoFailure(fallbackError, config.mongoUri);
        throw fallbackError;
      }
    } else {
      logMongoFailure(error, config.mongoUri);
      throw error;
    }
  }
  if (mongoose.connection.readyState === 1) {
    console.log('Connected to MongoDB');
  }

  const app = require('./app');
  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });

  const stop = signal => {
    console.log(`${signal} received; closing server`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
}

startServer().catch((error) => {
  if (!error.mongoLogged) {
    const failure = safeMongoError(error, config.mongoUri || '');
    console.error('Failed to start server:', failure.message, 'code:', failure.code);
  }
  process.exitCode = 1;
});
