const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Sensitive fields to redact
const redactPaths = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'otp',
  'secret',
  'authorization',
  'req.headers.authorization',
  'req.body.password',
  'req.body.otp',
  '*.password',
  '*.token',
  '*.secret',
];

const logger = pino({
  level: logLevel,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      node_version: process.version,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        },
      }),
});

// Create child logger with request context
const createRequestLogger = (requestId, userId = null) => {
  return logger.child({
    requestId,
    userId,
  });
};

module.exports = logger;
module.exports.createRequestLogger = createRequestLogger;
