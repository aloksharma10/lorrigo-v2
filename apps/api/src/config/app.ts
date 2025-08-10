import dotenv from 'dotenv';
dotenv.config();

export const APP_CONFIG = {
  // Server settings
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // API settings
  API_VERSION: process.env.API_VERSION || 'v2',
  API_PREFIX: process.env.API_PREFIX || '/api',

  // JWT settings
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || 7,

  // Rate limiting
  RATE_LIMIT: {
    MAX: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
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

  // PhonePe settings
  PHONEPE: {
    MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID || 'LORRIGO',
    SALT_KEY: process.env.PHONEPE_SALT_KEY || 'test-salt-key',
    SALT_INDEX: process.env.PHONEPE_SALT_INDEX || '1',
    API_BASEURL: process.env.PHONEPE_API_BASEURL || 'https://api.phonepe.com/apis/hermes',
  },

  // Notification settings
  NOTIFICATION: {
    EMAIL: {
      HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
      PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
      SECURE: process.env.EMAIL_SECURE === 'true',
      USER: process.env.EMAIL_USER || '',
      PASSWORD: process.env.EMAIL_PASSWORD || '',
      FROM: process.env.EMAIL_FROM || 'noreply@lorrigo.com',
      FROM_NAME: process.env.EMAIL_FROM_NAME || 'Lorrigo',
    },
    OTP: {
      EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
      LENGTH: parseInt(process.env.OTP_LENGTH || '6', 10),
      MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
      COOLDOWN_MINUTES: parseInt(process.env.OTP_COOLDOWN_MINUTES || '5', 10),
    },
  },

  // Vendor settings
  VENDOR: {
    SMART_SHIP: {
      AUTH_URL: process.env.SMART_SHIP_AUTH_URL || '',
      API_KEY: process.env.SMART_SHIP_API_KEY || '',
      API_BASEURL: process.env.SMART_SHIP_API_BASEURL,
      EMAIL: process.env.SMART_SHIP_EMAIL,
      PASSWORD: process.env.SMART_SHIP_PASSWORD,
      CLIENT_ID: process.env.SMART_SHIP_CLIENT_ID,
      CLIENT_SECRET: process.env.SMART_SHIP_CLIENT_SECRET,
      GRANT_TYPE: process.env.SMART_SHIP_GRANT_TYPE,
    },
    SHIPROCKET: {
      API_KEY: process.env.SHIPROCKET_API_KEY || '',
      API_BASEURL: process.env.SHIPROCKET_API_BASEURL,
      EMAIL: process.env.SHIPROCKET_EMAIL,
      PASSWORD: process.env.SHIPROCKET_PASSWORD,
    },
    DELHIVERY: {
      API_BASEURL: process.env.DELHIVERY_API_BASEURL,
      API_KEY_0_5: process.env.DELHIVERY_API_KEY_0_5 || '',
      API_KEY_5: process.env.DELHIVERY_API_KEY_5 || '',
      API_KEY_10: process.env.DELHIVERY_API_KEY_10 || '',
    },

    // Zoho settings
    ZOHO: {
      API_KEY: process.env.ZOHO_API_KEY || '',
      API_BASEURL: process.env.ZOHO_API_BASEURL,
      CLIENT_ID: process.env.ZOHO_CLIENT_ID || '',
      CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET || '',
      GRANT_TYPE: process.env.ZOHO_GRANT_TYPE || '',
      REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN || '',
    },

    // Shopify settings
    SHOPIFY: {
      API_KEY: process.env.SHOPIFY_API_KEY || '',
      API_SECRET: process.env.SHOPIFY_API_SECRET || '',
      API_VERSION: process.env.SHOPIFY_API_VERSION || '2023-10',
      SCOPES: process.env.SHOPIFY_SCOPES || 'read_orders,read_products,read_customers',
      HOST: process.env.SHOPIFY_HOST || '',
      REDIRECT_URI: process.env.SHOPIFY_REDIRECT_URI || 'http://localhost:3000/auth/shopify/callback',
    },
  },

  // WhatsApp settings
  WHATSAPP: {
    API_URL: process.env.WHATSAPP_API_URL || 'https://web.wabridge.com/api',
    APP_KEY: process.env.WHATSAPP_APP_KEY || '',
    AUTH_KEY: process.env.WHATSAPP_AUTH_KEY || '',
    DEVICE_ID: process.env.WHATSAPP_DEVICE_ID || 'DEVICE_ID',

    TEMPLATE_READY_FOR_DISPATCH: process.env.WHATSAPP_TEMPLATE_READY_FOR_DISPATCH || '',
    TEMPLATE_ORDER_SHIPPED: process.env.WHATSAPP_TEMPLATE_ORDER_SHIPPED || '',
    TEMPLATE_OUT_FOR_DELIVERY: process.env.WHATSAPP_TEMPLATE_OUT_FOR_DELIVERY || '',
    TEMPLATE_ORDER_DELIVERED: process.env.WHATSAPP_TEMPLATE_ORDER_DELIVERED || '',
    TEMPLATE_NDR_NOTIFICATION: process.env.WHATSAPP_TEMPLATE_NDR_NOTIFICATION || '',
  },

  // Frontend URL for redirects
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://app.lorrigo.com',
};
