/**
 * Centralized Configuration Management
 * Single source of truth for all application configuration
 * 
 * @module config/index
 */

const path = require('path');

/**
 * Environment validation
 * Ensures all required environment variables are present
 */
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'REDIS_URL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'GEMINI_API_KEY',
  'SENTRY_DSN',
  'FRONTEND_URL',
  'API_URL',
  'LOG_LEVEL',
];

/**
 * Validate required environment variables
 * @throws {Error} If required variables are missing
 */
const validateEnv = () => {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }
};

/**
 * Get environment value with type conversion
 */
const getEnv = (key, defaultValue = undefined) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value;
};

const getEnvInt = (key, defaultValue = 0) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvBool = (key, defaultValue = false) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

const getEnvArray = (key, defaultValue = []) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

/**
 * Application configuration object
 * Frozen to prevent runtime modifications
 */
const config = Object.freeze({
  // Environment
  env: getEnv('NODE_ENV', 'development'),
  isProduction: getEnv('NODE_ENV') === 'production',
  isDevelopment: getEnv('NODE_ENV') !== 'production',
  isTest: getEnv('NODE_ENV') === 'test',

  // Server
  server: Object.freeze({
    port: getEnvInt('PORT', 3000),
    host: getEnv('HOST', '0.0.0.0'),
    apiUrl: getEnv('API_URL', 'http://localhost:3000'),
    frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3001'),
    trustProxy: getEnvBool('TRUST_PROXY', true),
  }),

  // Database (Supabase)
  supabase: Object.freeze({
    url: getEnv('SUPABASE_URL'),
    anonKey: getEnv('SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    jwtSecret: getEnv('SUPABASE_JWT_SECRET'),
  }),

  // Redis
  redis: Object.freeze({
    url: getEnv('REDIS_URL', 'redis://localhost:6379'),
    password: getEnv('REDIS_PASSWORD'),
    keyPrefix: getEnv('REDIS_KEY_PREFIX', 'nyaay:'),
    ttl: Object.freeze({
      default: getEnvInt('REDIS_DEFAULT_TTL', 300), // 5 minutes
      session: getEnvInt('REDIS_SESSION_TTL', 86400), // 24 hours
      otp: getEnvInt('REDIS_OTP_TTL', 600), // 10 minutes
      cache: getEnvInt('REDIS_CACHE_TTL', 3600), // 1 hour
    }),
  }),

  // Payments (Razorpay)
  razorpay: Object.freeze({
    keyId: getEnv('RAZORPAY_KEY_ID'),
    keySecret: getEnv('RAZORPAY_KEY_SECRET'),
    webhookSecret: getEnv('RAZORPAY_WEBHOOK_SECRET'),
    currency: getEnv('RAZORPAY_CURRENCY', 'INR'),
  }),

  // SMS (Twilio)
  twilio: Object.freeze({
    accountSid: getEnv('TWILIO_ACCOUNT_SID'),
    authToken: getEnv('TWILIO_AUTH_TOKEN'),
    phoneNumber: getEnv('TWILIO_PHONE_NUMBER'),
    enabled: getEnvBool('TWILIO_ENABLED', true),
  }),

  // AI (Google Gemini)
  gemini: Object.freeze({
    apiKey: getEnv('GEMINI_API_KEY'),
    model: getEnv('GEMINI_MODEL', 'gemini-2.0-flash'),
    maxTokens: getEnvInt('GEMINI_MAX_TOKENS', 2048),
  }),

  // Monitoring (Sentry)
  sentry: Object.freeze({
    dsn: getEnv('SENTRY_DSN'),
    enabled: getEnvBool('SENTRY_ENABLED', true) && !!getEnv('SENTRY_DSN'),
    environment: getEnv('SENTRY_ENVIRONMENT', getEnv('NODE_ENV', 'development')),
    tracesSampleRate: parseFloat(getEnv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
  }),

  // Logging
  logging: Object.freeze({
    level: getEnv('LOG_LEVEL', getEnv('NODE_ENV') === 'production' ? 'info' : 'debug'),
    pretty: getEnvBool('LOG_PRETTY', getEnv('NODE_ENV') !== 'production'),
  }),

  // Rate Limiting
  rateLimit: Object.freeze({
    windowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    maxRequests: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),
    auth: Object.freeze({
      windowMs: getEnvInt('RATE_LIMIT_AUTH_WINDOW_MS', 60 * 1000), // 1 minute
      maxRequests: getEnvInt('RATE_LIMIT_AUTH_MAX', 5),
    }),
    otp: Object.freeze({
      windowMs: getEnvInt('RATE_LIMIT_OTP_WINDOW_MS', 60 * 1000), // 1 minute
      maxRequests: getEnvInt('RATE_LIMIT_OTP_MAX', 3),
    }),
  }),

  // Security
  security: Object.freeze({
    bcryptRounds: getEnvInt('BCRYPT_ROUNDS', 12),
    jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
    refreshTokenExpiresIn: getEnv('REFRESH_TOKEN_EXPIRES_IN', '30d'),
    otpLength: getEnvInt('OTP_LENGTH', 6),
    otpExpiryMinutes: getEnvInt('OTP_EXPIRY_MINUTES', 10),
    maxLoginAttempts: getEnvInt('MAX_LOGIN_ATTEMPTS', 5),
    lockoutDurationMinutes: getEnvInt('LOCKOUT_DURATION_MINUTES', 30),
    corsOrigins: getEnvArray('CORS_ORIGINS', [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
    ]),
  }),

  // Business Rules
  business: Object.freeze({
    cancellationWindowHours: getEnvInt('CANCELLATION_WINDOW_HOURS', 24),
    consultationDurationMinutes: getEnvInt('CONSULTATION_DURATION_MINUTES', 30),
    maxUploadSizeMb: getEnvInt('MAX_UPLOAD_SIZE_MB', 10),
    supportedFileTypes: getEnvArray('SUPPORTED_FILE_TYPES', ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
    minLawyerExperienceYears: getEnvInt('MIN_LAWYER_EXPERIENCE_YEARS', 0),
  }),

  // Feature Flags
  features: Object.freeze({
    enableSms: getEnvBool('FEATURE_ENABLE_SMS', true),
    enableEmail: getEnvBool('FEATURE_ENABLE_EMAIL', true),
    enableChatbot: getEnvBool('FEATURE_ENABLE_CHATBOT', true),
    enablePayments: getEnvBool('FEATURE_ENABLE_PAYMENTS', true),
    maintenanceMode: getEnvBool('FEATURE_MAINTENANCE_MODE', false),
  }),

  // Paths
  paths: Object.freeze({
    root: path.resolve(__dirname, '..', '..'),
    src: path.resolve(__dirname, '..'),
    uploads: path.resolve(__dirname, '..', '..', 'uploads'),
    logs: path.resolve(__dirname, '..', '..', 'logs'),
  }),
});

/**
 * Validate configuration on import
 */
if (process.env.NODE_ENV !== 'test') {
  try {
    validateEnv();
  } catch (error) {
    console.error('Configuration Error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = config;
module.exports.validateEnv = validateEnv;
module.exports.getEnv = getEnv;
module.exports.getEnvInt = getEnvInt;
module.exports.getEnvBool = getEnvBool;
module.exports.getEnvArray = getEnvArray;
