import { FastifyInstance } from 'fastify';

export default async function preferencesRoutes(fastify: FastifyInstance) {
  // Get user notification preferences
  fastify.get('/preferences/:userId', {
    schema: {
      tags: ['Notification Preferences'],
      summary: 'Get user notification preferences',
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
            preferences: {
              type: 'object',
              properties: {
                whatsapp: { type: 'boolean' },
                email: { type: 'boolean' },
                system: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.params as any;
        
        const userProfile = await fastify.prisma.userProfile.findUnique({
          where: { user_id: userId },
          select: { notification_settings: true },
        });

        if (!userProfile) {
          return reply.code(404).send({
            success: false,
            message: 'User profile not found',
          });
        }

        const preferences = userProfile.notification_settings as any || {
          whatsapp: false,
          email: true,
          system: true,
        };

        return reply.code(200).send({
          success: true,
          preferences,
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Update user notification preferences
  fastify.put('/preferences/:userId', {
    schema: {
      tags: ['Notification Preferences'],
      summary: 'Update user notification preferences',
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['preferences'],
        properties: {
          preferences: {
            type: 'object',
            properties: {
              whatsapp: { type: 'boolean' },
              email: { type: 'boolean' },
              system: { type: 'boolean' },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            preferences: {
              type: 'object',
              properties: {
                whatsapp: { type: 'boolean' },
                email: { type: 'boolean' },
                system: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.params as any;
        const { preferences } = request.body as any;
        
        // Validate user exists
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.code(404).send({
            success: false,
            message: 'User not found',
          });
        }

        // Update or create user profile with notification preferences
        const updatedProfile = await fastify.prisma.userProfile.upsert({
          where: { user_id: userId },
          update: {
            notification_settings: preferences,
          },
          create: {
            user_id: userId,
            notification_settings: preferences,
          },
          select: { notification_settings: true },
        });

        return reply.code(200).send({
          success: true,
          message: 'Notification preferences updated successfully',
          preferences: updatedProfile.notification_settings,
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Get notification statistics for admin
  fastify.get('/stats', {
    schema: {
      tags: ['Notification Preferences'],
      summary: 'Get notification statistics',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            stats: {
              type: 'object',
              properties: {
                totalUsers: { type: 'number' },
                whatsappEnabled: { type: 'number' },
                emailEnabled: { type: 'number' },
                systemEnabled: { type: 'number' },
                whatsappEnabledPercentage: { type: 'number' },
                emailEnabledPercentage: { type: 'number' },
                systemEnabledPercentage: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        // Get all user profiles with notification settings
        const userProfiles = await fastify.prisma.userProfile.findMany({
          select: { notification_settings: true },
        });

        const totalUsers = userProfiles.length;
        let whatsappEnabled = 0;
        let emailEnabled = 0;
        let systemEnabled = 0;

        userProfiles.forEach((profile) => {
          const settings = profile.notification_settings as any || {};
          if (settings.whatsapp === true) whatsappEnabled++;
          if (settings.email === true) emailEnabled++;
          if (settings.system === true) systemEnabled++;
        });

        const stats = {
          totalUsers,
          whatsappEnabled,
          emailEnabled,
          systemEnabled,
          whatsappEnabledPercentage: totalUsers > 0 ? (whatsappEnabled / totalUsers) * 100 : 0,
          emailEnabledPercentage: totalUsers > 0 ? (emailEnabled / totalUsers) * 100 : 0,
          systemEnabledPercentage: totalUsers > 0 ? (systemEnabled / totalUsers) * 100 : 0,
        };

        return reply.code(200).send({
          success: true,
          stats,
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Test notification preferences
  fastify.post('/test/:userId', {
    schema: {
      tags: ['Notification Preferences'],
      summary: 'Test notification sending for a user',
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['type', 'message'],
        properties: {
          type: { 
            type: 'string',
            enum: ['whatsapp', 'email', 'system']
          },
          message: { type: 'string' },
          subject: { type: 'string' },
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
        const { userId } = request.params as any;
        const { type, message, subject } = request.body as any;
        
        // Get user data
        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: {
              select: { notification_settings: true }
            }
          }
        });

        if (!user) {
          return reply.code(404).send({
            success: false,
            message: 'User not found',
          });
        }

        const settings = user.profile?.notification_settings as any || {};
        
        // Check if user has enabled this notification type
        if (!settings[type]) {
          return reply.code(400).send({
            success: false,
            message: `User has disabled ${type} notifications`,
          });
        }

        // Send test notification
        const { NotificationService } = await import('@/lib/notification');
        const notificationService = new NotificationService(fastify);

        let payload: any = {
          type: type === 'whatsapp' ? 'WHATSAPP' : type.toUpperCase(),
          recipient: type === 'whatsapp' ? user.phone : user.email,
          message,
          subject: subject || 'Test Notification',
        };

        if (type === 'whatsapp') {
          payload.phoneNumber = user.phone;
        }

        const result = await notificationService.sendNotification(payload);

        return reply.code(200).send(result);
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}