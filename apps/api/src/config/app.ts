import dotenv from 'dotenv';
dotenv.config();

export const APP_CONFIG = {
  // Server settings
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // API settings
  API_VERSION: process.env.API_VERSION || 'v1',
  API_PREFIX: process.env.API_PREFIX || '/api',
  
  // JWT settings
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  
  // Rate limiting
  RATE_LIMIT: {
    MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    TIME_WINDOW: parseInt(process.env.RATE_LIMIT_TIME_WINDOW || '60000', 10), // 1 minute in milliseconds
  },
  
  // Redis settings
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    PASSWORD: process.env.REDIS_PASSWORD || '',
    PREFIX: process.env.REDIS_PREFIX || 'lorrigo:',
  },
  
  // BullMQ settings
  QUEUE: {
    CONCURRENCY: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
  },
  
  // Logging settings
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Sentry settings
  SENTRY: {
    DSN: process.env.SENTRY_DSN || '',
    ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || 'development',
    TRACES_SAMPLE_RATE: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  },
  
  // Cors settings
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',
  },
}; 