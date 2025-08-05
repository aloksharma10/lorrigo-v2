import * as Sentry from '@sentry/node';
import { APP_CONFIG } from '@/config/app';

// Initialize Sentry
export const initSentry = () => {
  if (APP_CONFIG.SENTRY.DSN) {
    Sentry.init({
      dsn: APP_CONFIG.SENTRY.DSN,
      environment: APP_CONFIG.SENTRY.ENVIRONMENT,
      tracesSampleRate: APP_CONFIG.SENTRY.TRACES_SAMPLE_RATE,
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });

    console.log(`Sentry initialized in ${APP_CONFIG.SENTRY.ENVIRONMENT} environment`);
  } else {
    console.log('Sentry DSN not provided, skipping initialization');
  }
};

// Helper function to capture exceptions
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (APP_CONFIG.SENTRY.DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
  // Always log the error, even if Sentry is not available
  console.error('Error:', error, context || '');
};

// Helper function to capture messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
  if (APP_CONFIG.SENTRY.DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
  // Always log the message, even if Sentry is not available
  console.log(`[${level}] ${message}`, context || '');
};

export default Sentry;
