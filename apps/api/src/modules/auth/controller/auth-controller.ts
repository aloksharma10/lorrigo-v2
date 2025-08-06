import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { captureException } from '@/lib/sentry';

import { AuthService } from '../services/auth-service';

// Add type augmentation for Fastify
// declare module 'fastify' {
//   interface FastifyInstance {
//     prisma: PrismaClient;
//     jwt: JWT;
//     authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//   }

//   interface FastifyRequest {
//     user: {
//       id: string;
//       email: string;
//       role: string;
//       permissions?: object;
//     };
//   }
// }

// Define request body schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  business_name: z.string().min(2),
  phone: z.string().length(10),
  gstin: z
    .union([z.string(), z.null()])
    .optional()
    .refine((val) => val === null || val === undefined || val.length === 15, {
      message: 'GSTIN must be exactly 15 characters long',
    }),
});

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate request body
      const data = registerSchema.parse(request.body);

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Register user using service
      const result = await this.authService.register({
        ...data,
        password: hashedPassword,
        business_type: 'INDIVIDUAL',
        gst_no: data.gstin ?? undefined,
        business_name: data.business_name,
        phone: data.phone,
        email: data.email,
        name: data.name,
      });

      // Return user data and token
      return reply.code(201).send({
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        token: result.token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }

      captureException(error as Error);
      return reply.code(500).send({
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate request body
      const { email, password } = loginSchema.parse(request.body);

      // Login user using service
      const body = request.body as any;
      const result = await this.authService.login(email, password, request.ip, body?.deviceInfo);

      if ('error' in result) {
        return reply.code(401).send({
          message: result.error,
        });
      }

      // Return success response
      return reply.code(200).send({
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          message: 'Validation error',
          errors: error.errors,
        });
      }

      captureException(error as Error);
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  async loginWithGoogle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, name, googleId, image } = request.body as any;

      // Validate required fields
      if (!email || !name || !googleId) {
        return reply.code(400).send({
          success: false,
          message: 'Email, name, and googleId are required',
        });
      }

      // Login with Google using service
      const body = request.body as any;
      const result = await this.authService.loginWithGoogle({ email, name, googleId, image }, request.ip, body?.deviceInfo);

      if ('error' in result) {
        return reply.code(401).send({
          success: false,
          message: result.error,
        });
      }

      // Return success response
      return reply.code(200).send({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.userPayload) {
        return reply.code(401).send({
          message: 'Unauthorized',
        });
      }

      return await this.authService.getMe(request.userPayload.id);
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.userPayload) {
        return reply.code(401).send({
          message: 'Unauthorized',
        });
      }

      await this.authService.logout(request.userPayload.id, request.ip);
      return {
        message: 'Logged out successfully',
      };
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        message: 'Internal server error',
      });
    }
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = request.body as any;

      // Call auth service to check if user exists
      const result = await this.authService.forgotPassword(email);

      // Generate and send OTP using notification system (if available)
      try {
        if (request.server.notification) {
          const otpResult = await request.server.notification.generateAndSendOTP({
            type: 'password_reset',
            identifier: email,
            identifierType: 'email',
            purpose: 'Password reset verification',
            metadata: {
              userName: email.split('@')[0], // Extract username from email
            },
          });

          if (otpResult.success) {
            return reply.code(200).send({
              success: true,
              message: 'OTP sent to your email address',
              otpId: otpResult.otpId,
            });
          } else {
            return reply.code(400).send({
              success: false,
              message: otpResult.message || 'Failed to send OTP',
            });
          }
        }
      } catch (otpError) {
        console.error('Failed to send OTP:', otpError);
        return reply.code(500).send({
          success: false,
          message: 'Failed to send OTP. Please try again.',
        });
      }

      return reply.code(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, otp, newPassword, confirmPassword } = request.body as any;

      // Validate input
      if (!email || !otp || !newPassword || !confirmPassword) {
        return reply.code(400).send({
          success: false,
          message: 'All fields are required',
        });
      }

      if (newPassword !== confirmPassword) {
        return reply.code(400).send({
          success: false,
          message: 'Passwords do not match',
        });
      }

      if (newPassword.length < 6) {
        return reply.code(400).send({
          success: false,
          message: 'Password must be at least 6 characters long',
        });
      }

      // Verify OTP first
      try {
        if (request.server.notification) {
          const otpResult = await request.server.notification.verifyOTP({
            identifier: email,
            identifierType: 'email',
            otp: otp,
            type: 'password_reset',
          });

          if (!otpResult.success) {
            return reply.code(400).send({
              success: false,
              message: otpResult.message || 'Invalid OTP',
            });
          }
        }
      } catch (otpError) {
        console.error('Failed to verify OTP:', otpError);
        return reply.code(400).send({
          success: false,
          message: 'Failed to verify OTP',
        });
      }

      // Reset password using auth service
      try {
        await this.authService.resetPasswordWithOTP(email, newPassword);

        // Consume the OTP after successful password reset
        if (request.server.notification) {
          try {
            await request.server.notification.consumeOTP(email, 'password_reset');
          } catch (consumeError) {
            console.error('Failed to consume OTP:', consumeError);
            // Don't fail the password reset if OTP consumption fails
          }
        }

        return reply.code(200).send({
          success: true,
          message: 'Password reset successfully',
        });
      } catch (resetError) {
        return reply.code(400).send({
          success: false,
          message: resetError instanceof Error ? resetError.message : 'Failed to reset password',
        });
      }
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async verifyToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (!request.userPayload) {
        return reply.code(401).send({
          success: false,
          message: 'Invalid token',
        });
      }

      // Get user data from database
      const user = await this.authService.getMe(request.userPayload.id);
      const hasShopifyConnection = user?.shopify_connection !== null;

      if (!user) {
        return reply.code(401).send({
          success: false,
          message: 'User not found',
        });
      }

      return reply.code(200).send({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hasPasskeys: user.hasPasskeys || false,
          hasShopifyConnection: hasShopifyConnection || false,
        },
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Generate Shopify OAuth URL for login
   */
  async generateShopifyAuthUrl(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { shop } = request.query as any;
      const authUrl = this.authService.generateShopifyAuthUrl(shop);

      return reply.code(200).send({
        success: true,
        authUrl,
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to generate Shopify auth URL',
      });
    }
  }

  /**
   * Handle Shopify OAuth callback
   */
  async handleShopifyCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get parameters from query string (Shopify sends them as query params)
      const { code, state, shop } = request.query as any;

      // Validate required parameters
      if (!code || !state || !shop) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required parameters: code, state, or shop',
        });
      }

      // Handle Shopify OAuth using the auth service
      const result = await this.authService.handleShopifyOAuth(
        code,
        state,
        shop,
        request.ip,
        {} // No device info for OAuth flow
      );

      if ('error' in result) {
        return reply.code(401).send({
          success: false,
          message: result.error,
        });
      }

      return reply.code(200).send({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to authenticate with Shopify',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
      });
    }
  }
}
