import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { NotificationService } from '@/lib/notification';
import { createNotificationWorker } from '@/jobs/notification-worker';
import { NotificationWorker } from '@/jobs/notification-worker';

declare module 'fastify' {
  interface FastifyInstance {
    notification: {
      // Core notification methods
      send: (payload: any) => Promise<any>;
      sendImmediate: (payload: any) => Promise<any>;

      // OTP methods
      generateAndSendOTP: (payload: any) => Promise<any>;
      verifyOTP: (payload: any) => Promise<any>;
      resendOTP: (payload: any) => Promise<any>;
      consumeOTP: (identifier: string, type: string) => Promise<any>;

      // System notification methods
      getSystemNotifications: (userId: string, limit?: number) => Promise<any>;
      markNotificationAsRead: (userId: string, notificationIndex: number) => Promise<any>;
      clearSystemNotifications: (userId: string) => Promise<any>;

      // Job tracking
      getJobStatus: (jobId: string) => Promise<any>;

      // Service status
      getStatus: () => Promise<any>;

      // Email methods
      sendEmail: (options: any) => Promise<any>;
      sendOTPEmail: (to: string, otp: string, type: string, options?: any) => Promise<any>;
      sendPasswordResetEmail: (to: string, resetToken: string, options?: any) => Promise<any>;
      sendWelcomeEmail: (to: string, options: any) => Promise<any>;
      sendOrderConfirmationEmail: (to: string, orderData: any, options?: any) => Promise<any>;
    };
  }
}

const notificationPlugin: FastifyPluginAsync = async (fastify) => {
  // Initialize notification service
  const notificationService = new NotificationService(fastify);

  // Initialize notification worker
  const notificationWorker = createNotificationWorker(fastify);

  // Decorate fastify instance with notification object
  fastify.decorate('notification', {
    // Core notification methods
    send: async (payload: any) => {
      return await notificationService.sendNotification(payload);
    },

    sendImmediate: async (payload: any) => {
      return await notificationService.sendImmediateNotification(payload);
    },

    // OTP methods
    generateAndSendOTP: async (payload: any) => {
      return await notificationService.generateAndSendOTP(payload);
    },

    verifyOTP: async (payload: any) => {
      return await notificationService.verifyOTP(payload);
    },

    resendOTP: async (payload: any) => {
      return await notificationService.resendOTP(payload);
    },

    consumeOTP: async (identifier: string, type: string) => {
      const { otpService } = await import('@/lib/otp');
      return await otpService.consumeOTP(identifier, type as any);
    },

    // System notification methods
    getSystemNotifications: async (userId: string, limit?: number) => {
      return await notificationService.getSystemNotifications(userId, limit);
    },

    markNotificationAsRead: async (userId: string, notificationIndex: number) => {
      return await notificationService.markNotificationAsRead(userId, notificationIndex);
    },

    clearSystemNotifications: async (userId: string) => {
      return await notificationService.clearSystemNotifications(userId);
    },

    // Job tracking
    getJobStatus: async (jobId: string) => {
      return await notificationService.getNotificationJobStatus(jobId);
    },

    // Service status
    getStatus: async () => {
      return await notificationService.getServiceStatus();
    },

    // Email methods
    sendEmail: async (options: any) => {
      const { emailService } = await import('@/lib/email');
      return await emailService.sendEmail(options);
    },

    sendOTPEmail: async (to: string, otp: string, type: string, options?: any) => {
      const { emailService } = await import('@/lib/email');
      return await emailService.sendOTPEmail(to, otp, type, options);
    },

    sendPasswordResetEmail: async (to: string, resetToken: string, options?: any) => {
      const { emailService } = await import('@/lib/email');
      return await emailService.sendPasswordResetEmail(to, resetToken, options);
    },

    sendWelcomeEmail: async (to: string, options: any) => {
      const { emailService } = await import('@/lib/email');
      return await emailService.sendWelcomeEmail(to, options);
    },

    sendOrderConfirmationEmail: async (to: string, orderData: any, options?: any) => {
      const { emailService } = await import('@/lib/email');
      return await emailService.sendOrderConfirmationEmail(to, orderData, options);
    },
  });

  // Add hook to gracefully close notification worker on server shutdown
  fastify.addHook('onClose', async () => {
    await notificationWorker.close();
  });

  console.log('Notification plugin registered');
};

export default fp(notificationPlugin, {
  name: 'notification',
  dependencies: ['@fastify/cors', '@fastify/helmet'],
});
