import { FastifyInstance } from 'fastify';
import { NotificationType, OTPType, NotificationPriority } from '@/types/notification';

export default async function notifications(fastify: FastifyInstance) {
  // Send notification route
  fastify.post('/send', {
    schema: {
      tags: ['Notifications'],
      summary: 'Send a notification',
      body: {
        type: 'object',
        required: ['type', 'recipient', 'message'],
        properties: {
          type: { 
            type: 'string', 
            enum: Object.values(NotificationType) 
          },
          priority: { 
            type: 'string', 
            enum: Object.values(NotificationPriority) 
          },
          recipient: { type: 'string' },
          subject: { type: 'string' },
          message: { type: 'string' },
          template: { type: 'string' },
          templateData: { type: 'object' },
          metadata: { type: 'object' },
          scheduledAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            jobId: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await fastify.notification.send(request.body);
        
        if (result.success) {
          return reply.code(200).send(result);
        } else {
          return reply.code(400).send(result);
        }
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Send immediate notification route
  fastify.post('/send-immediate', {
    schema: {
      tags: ['Notifications'],
      summary: 'Send an immediate notification (bypass queue)',
      body: {
        type: 'object',
        required: ['type', 'recipient', 'message'],
        properties: {
          type: { 
            type: 'string', 
            enum: Object.values(NotificationType) 
          },
          priority: { 
            type: 'string', 
            enum: Object.values(NotificationPriority) 
          },
          recipient: { type: 'string' },
          subject: { type: 'string' },
          message: { type: 'string' },
          template: { type: 'string' },
          templateData: { type: 'object' },
          metadata: { type: 'object' },
          scheduledAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await fastify.notification.sendImmediate(request.body);
        
        if (result.success) {
          return reply.code(200).send(result);
        } else {
          return reply.code(400).send(result);
        }
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Generate and send OTP route
  fastify.post('/otp/generate', {
    schema: {
      tags: ['OTP'],
      summary: 'Generate and send OTP',
      body: {
        type: 'object',
        required: ['type', 'identifier', 'identifierType', 'purpose'],
        properties: {
          type: { 
            type: 'string', 
            enum: Object.values(OTPType) 
          },
          identifier: { type: 'string' },
          identifierType: { 
            type: 'string', 
            enum: ['email', 'phone'] 
          },
          purpose: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            otpId: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await fastify.notification.generateAndSendOTP(request.body);
        
        if (result.success) {
          return reply.code(200).send(result);
        } else {
          return reply.code(400).send(result);
        }
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Verify OTP route
  fastify.post('/otp/verify', {
    schema: {
      tags: ['OTP'],
      summary: 'Verify OTP',
      body: {
        type: 'object',
        required: ['identifier', 'identifierType', 'otp', 'type'],
        properties: {
          identifier: { type: 'string' },
          identifierType: { 
            type: 'string', 
            enum: ['email', 'phone'] 
          },
          otp: { type: 'string' },
          type: { 
            type: 'string', 
            enum: Object.values(OTPType) 
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await fastify.notification.verifyOTP(request.body);
        
        if (result.success) {
          return reply.code(200).send(result);
        } else {
          return reply.code(400).send(result);
        }
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Resend OTP route
  fastify.post('/otp/resend', {
    schema: {
      tags: ['OTP'],
      summary: 'Resend OTP',
      body: {
        type: 'object',
        required: ['type', 'identifier', 'identifierType', 'purpose'],
        properties: {
          type: { 
            type: 'string', 
            enum: Object.values(OTPType) 
          },
          identifier: { type: 'string' },
          identifierType: { 
            type: 'string', 
            enum: ['email', 'phone'] 
          },
          purpose: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            otpId: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await fastify.notification.resendOTP(request.body);
        
        if (result.success) {
          return reply.code(200).send(result);
        } else {
          return reply.code(400).send(result);
        }
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Get system notifications route
  fastify.get('/system/:userId', {
    schema: {
      tags: ['System Notifications'],
      summary: 'Get system notifications for user',
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              type: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { limit } = request.query as { limit?: number };
        
        const notifications = await fastify.notification.getSystemNotifications(userId, limit);
        return reply.code(200).send(notifications);
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Mark notification as read route
  fastify.put('/system/:userId/read/:index', {
    schema: {
      tags: ['System Notifications'],
      summary: 'Mark system notification as read',
      params: {
        type: 'object',
        required: ['userId', 'index'],
        properties: {
          userId: { type: 'string' },
          index: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId, index } = request.params as { userId: string; index: number };
        
        const success = await fastify.notification.markNotificationAsRead(userId, index);
        
        if (success) {
          return reply.code(200).send({
            success: true,
            message: 'Notification marked as read',
          });
        } else {
          return reply.code(400).send({
            success: false,
            message: 'Failed to mark notification as read',
          });
        }
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Clear system notifications route
  fastify.delete('/system/:userId', {
    schema: {
      tags: ['System Notifications'],
      summary: 'Clear all system notifications for user',
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        
        const success = await fastify.notification.clearSystemNotifications(userId);
        
        if (success) {
          return reply.code(200).send({
            success: true,
            message: 'System notifications cleared',
          });
        } else {
          return reply.code(400).send({
            success: false,
            message: 'Failed to clear system notifications',
          });
        }
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Get notification job status route
  fastify.get('/job/:jobId', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get notification job status',
      params: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            attempts: { type: 'number' },
            maxAttempts: { type: 'number' },
            createdAt: { type: 'string' },
            sentAt: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        
        const job = await fastify.notification.getJobStatus(jobId);
        
        if (job) {
          return reply.code(200).send(job);
        } else {
          return reply.code(404).send({
            success: false,
            message: 'Job not found',
          });
        }
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });

  // Get notification service status route
  fastify.get('/status', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get notification service status',
      response: {
        200: {
          type: 'object',
          properties: {
            services: {
              type: 'object',
              properties: {
                email: { type: 'object' },
                redis: { type: 'object' },
              },
            },
            worker: {
              type: 'object',
              properties: {
                isRunning: { type: 'boolean' },
                concurrency: { type: 'number' },
                processedJobs: { type: 'number' },
                failedJobs: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const serviceStatus = await fastify.notification.getStatus();
        // Note: Worker status is not exposed through the notification interface
        // You can access it directly if needed
        
        return reply.code(200).send({
          services: serviceStatus,
          worker: { isRunning: true, concurrency: 5, processedJobs: 0, failedJobs: 0 },
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
        });
      }
    },
  });
} 