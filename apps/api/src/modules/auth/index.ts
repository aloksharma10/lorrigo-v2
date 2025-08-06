import { FastifyInstance } from 'fastify';
import { AuthController } from './controller/auth-controller';
import { AuthService } from './services/auth-service';

export default async function auth(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);
  const authController = new AuthController(authService);

  // Register passkey routes
  await fastify.register(import('./passkey-routes'), { prefix: '/passkey' });

  // Register route
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 2 },
          business_name: { type: 'string', minLength: 2 },
          company: { type: 'string' },
          gst_no: { type: 'string' },
          phone: { type: 'string', minLength: 10, maxLength: 10 },
          gstin: { type: 'string', nullable: true },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            token: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.register(request, reply),
  });

  // Login route
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login with email and password',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
              },
            },
            token: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.login(request, reply),
  });

  // Google OAuth login route
  fastify.post('/login/google', {
    schema: {
      tags: ['Auth'],
      summary: 'Login with Google OAuth',
      body: {
        type: 'object',
        required: ['email', 'name', 'googleId'],
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          googleId: { type: 'string' },
          image: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                hasPasskeys: { type: 'boolean' },
              },
            },
            token: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.loginWithGoogle(request, reply),
  });

  // Me route
  fastify.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get current user information',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            business_name: { type: 'string' },
            permissions: { type: 'object' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => authController.getMe(request, reply),
  });

  // Logout route
  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Logout user',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => authController.logout(request, reply),
  });

  // Forgot password
  fastify.post('/forgot-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Forgot password - sends OTP to email',
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
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
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.forgotPassword(request, reply),
  });

  // Reset password
  fastify.post('/reset-password', {
    schema: {
      tags: ['Auth'],
      summary: 'Reset password with OTP verification',
      body: {
        type: 'object',
        required: ['email', 'otp', 'newPassword', 'confirmPassword'],
        properties: {
          email: { type: 'string', format: 'email' },
          otp: { type: 'string', minLength: 6, maxLength: 6 },
          newPassword: { type: 'string', minLength: 6 },
          confirmPassword: { type: 'string', minLength: 6 },
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
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.resetPassword(request, reply),
  });

  // Verify token (for passkey authentication)
  fastify.post('/verify-token', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify JWT token and return user info',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                hasPasskeys: { type: 'boolean' },
                hasShopifyConnection: { type: 'boolean' },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: fastify.authenticate,
    handler: (request, reply) => authController.verifyToken(request, reply),
  });

  // Shopify OAuth routes
  fastify.get('/shopify/auth-url', {
    schema: {
      tags: ['Auth'],
      summary: 'Generate Shopify OAuth URL for login',
      querystring: {
        type: 'object',
        properties: {
          shop: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            authUrl: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.generateShopifyAuthUrl(request, reply),
  });

  fastify.get('/shopify/callback', {
    schema: {
      tags: ['Auth'],
      summary: 'Handle Shopify OAuth callback',
      querystring: {
        type: 'object',
        required: ['code', 'state', 'shop'],
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          shop: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                hasPasskeys: { type: 'boolean' },
                hasShopifyConnection: { type: 'boolean' },
              },
            },
            token: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: (request, reply) => authController.handleShopifyCallback(request, reply),
  });
}
