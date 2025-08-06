import { PrismaClient } from '@lorrigo/db';
import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { generateId, getFinancialYear } from '@lorrigo/utils';
import { ShopifyChannel } from '../../channels/services/shopify/shopify-channel';
import { captureException } from '@sentry/node';
import { APP_CONFIG } from '@/config/app';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  // Optional business details for UserProfile
  business_name?: string;
  business_type: string;
  company?: string;
  gst_no?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    hasPasskeys?: boolean;
  };
  token?: string;
}

interface LoginResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    hasPasskeys?: boolean;
    hasShopifyConnection?: boolean;
  };
  token: string;
}

interface LoginError {
  error: string;
}

interface GoogleOAuthData {
  email: string;
  name: string;
  googleId: string;
  image?: string;
}

export class AuthService {
  private prisma: PrismaClient;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.prisma = fastify.prisma;
    this.fastify = fastify;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const lastUserSequenceNumber = await this.prisma.user.count({
      where: {
        created_at: {
          gte: new Date(new Date().getFullYear(), 0, 1),
          lte: new Date(new Date().getFullYear(), 11, 31),
        },
      },
    });

    const code = generateId({
      tableName: 'user',
      entityName: data.name,
      lastUsedFinancialYear: getFinancialYear(new Date()),
      lastSequenceNumber: lastUserSequenceNumber,
    }).id;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          code,
          email: data.email,
          password: data.password,
          name: data.name,
          phone: data.phone,
          role: 'SELLER', // Default role for new registrations
        },
      });

      const lastWalletSequenceNumber = await tx.userWallet.count({
        where: {
          created_at: {
            gte: new Date(new Date().getFullYear(), 0, 1),
            lte: new Date(new Date().getFullYear(), 11, 31),
          },
        },
      });

      await tx.userWallet.create({
        data: {
          code: generateId({
            tableName: 'wallet',
            entityName: user.name,
            lastUsedFinancialYear: getFinancialYear(new Date()),
            lastSequenceNumber: lastWalletSequenceNumber,
          }).id,
          balance: 0,
          hold_amount: 0,
          usable_amount: 0,
          user_id: user.id,
        },
      });

      // Create user profile if business details provided
      if (data.business_name || data.company || data.gst_no) {
        await tx.userProfile.create({
          data: {
            user_id: user.id,
            company: data.company || data.business_name,
            gst_no: data.gst_no,
            notification_settings: {
              whatsapp: true,
              email: true,
              sms: true,
              push: true,
            },
          },
        });
      }

      return user;
    });

    // Send welcome email using notification system (if available)
    try {
      if (this.fastify.notification) {
        await this.fastify.notification.sendWelcomeEmail(data.email, {
          userName: data.name,
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        });
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Create JWT token for the new user
    const token = this.fastify.jwt.sign({
      id: result.id,
      email: result.email,
      role: result.role,
    });

    return {
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
      token,
    };
  }

  async login(email: string, password: string, ipAddress: string, deviceInfo?: any): Promise<LoginResult | LoginError> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Check if user exists
    if (!user) {
      return { error: 'Invalid email or password' };
    }

    // Check if user is active
    if (!user.is_active) {
      return { error: 'Your account has been deactivated. Please contact support.' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password as string);

    if (!isPasswordValid) {
      return { error: 'Invalid email or password' };
    }

    return this.createUserSession(user, ipAddress, deviceInfo, 'credentials');
  }

  async loginWithGoogle(googleData: GoogleOAuthData, ipAddress: string, deviceInfo?: any): Promise<LoginResult | LoginError> {
    try {
      // Check if user exists by email
      let user = await this.prisma.user.findUnique({
        where: { email: googleData.email },
      });

      if (!user) {
        // Create new user with Google data
        const lastUserSequenceNumber = await this.prisma.user.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), 0, 1),
              lte: new Date(new Date().getFullYear(), 11, 31),
            },
          },
        });

        const code = generateId({
          tableName: 'user',
          entityName: googleData.name,
          lastUsedFinancialYear: getFinancialYear(new Date()),
          lastSequenceNumber: lastUserSequenceNumber,
        }).id;

        user = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              code,
              email: googleData.email,
              name: googleData.name,
              googleId: googleData.googleId,
              image: googleData.image,
              emailVerified: new Date(),
              role: 'SELLER',
              phone: '', // Will be required later
            },
          });

          // Create user wallet
          const lastWalletSequenceNumber = await tx.userWallet.count({
            where: {
              created_at: {
                gte: new Date(new Date().getFullYear(), 0, 1),
                lte: new Date(new Date().getFullYear(), 11, 31),
              },
            },
          });

          await tx.userWallet.create({
            data: {
              code: generateId({
                tableName: 'wallet',
                entityName: newUser.name,
                lastUsedFinancialYear: getFinancialYear(new Date()),
                lastSequenceNumber: lastWalletSequenceNumber,
              }).id,
              balance: 0,
              hold_amount: 0,
              usable_amount: 0,
              user_id: newUser.id,
            },
          });

          // Create user profile
          await tx.userProfile.create({
            data: {
              user_id: newUser.id,
              notification_settings: {
                whatsapp: true,
                email: true,
                sms: true,
                push: true,
              },
            },
          });

          return newUser;
        });

        // Send welcome email using notification system (if available)
        try {
          if (this.fastify.notification) {
            await this.fastify.notification.sendWelcomeEmail(googleData.email, {
              userName: googleData.name,
              loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
            });
          }
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail registration if email fails
        }
      } else {
        // Update existing user's Google ID if not set
        if (!user.googleId) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleData.googleId,
              image: googleData.image,
              emailVerified: new Date(),
            },
          });
        }
      }

      return this.createUserSession(user, ipAddress, deviceInfo, 'google');
    } catch (error) {
      console.error('Google OAuth login error:', error);
      return { error: 'Failed to authenticate with Google' };
    }
  }

  private async createUserSession(user: any, ipAddress: string, deviceInfo?: any, loginMethod: string = 'credentials'): Promise<LoginResult> {
    // Create API request log
    await this.prisma.apiRequest.create({
      data: {
        endpoint: '/login',
        method: 'POST',
        ip_address: ipAddress,
        user_id: user.id,
        response_status: 200,
      },
    });

    // Create or update session with device info
    const sessionToken = this.generateSessionToken();
    await this.prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(
          Date.now() +
            (typeof APP_CONFIG.JWT_EXPIRES_IN === 'number'
              ? APP_CONFIG.JWT_EXPIRES_IN
              : Number(APP_CONFIG.JWT_EXPIRES_IN || 1)) *
              24 *
              60 *
              60 *
              1000
        ),
        ipAddress: deviceInfo?.ipAddress || ipAddress,
        userAgent: deviceInfo?.userAgent,
        deviceType: deviceInfo?.deviceType,
        browser: deviceInfo?.browser,
        os: deviceInfo?.os,
        country: deviceInfo?.country,
        city: deviceInfo?.city,
        region: deviceInfo?.region,
        latitude: deviceInfo?.latitude,
        longitude: deviceInfo?.longitude,
        loginMethod,
      },
    });

    // Generate JWT token
    const token = this.fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasPasskeys: user.hasPasskeys,
        hasShopifyConnection: user.shopify_connection !== null,
      },
      token,
    };
  }

  private generateSessionToken(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        is_active: true,
        is_verified: true,
        plan_id: true,
        hasPasskeys: true,
        shopify_connection: true,
      },
    });
  }

  async logout(userId: string, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Log logout action
    await this.prisma.apiRequest.create({
      data: {
        endpoint: '/logout',
        method: 'POST',
        ip_address: ipAddress,
        user_id: userId,
        response_status: 200,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { message: 'Password reset email sent' };
  }

  async resetPassword(newPassword: string, confirmPassword: string, currentPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      // where: { reset_password_token: token },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { message: 'Password reset successfully' };
  }

  async resetPasswordWithOTP(email: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profileData: any) {
    return this.prisma.userProfile.upsert({
      where: { user_id: userId },
      update: profileData,
      create: {
        user_id: userId,
        ...profileData,
      },
    });
  }

  /**
   * Update password
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    if (!user.password) {
      throw new Error('User has no password set');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * Handle Shopify OAuth authentication
   * @param code OAuth authorization code
   * @param state OAuth state parameter
   * @param shop Shop domain
   * @param ipAddress User's IP address
   * @param deviceInfo Device information
   * @returns Promise resolving to auth response
   */
  public async handleShopifyOAuth(code: string, state: string, shop: string, ipAddress: string, deviceInfo?: any): Promise<LoginResult | LoginError> {
    try {
      // Create Shopify channel instance for OAuth
      const shopifyChannel = new ShopifyChannel(shop, '', this.fastify);

      // Verify OAuth state
      const isValidState = await shopifyChannel.verifyState(state);
      if (!isValidState) {
        return { error: 'Invalid OAuth state' };
      }

      try {
        // Exchange code for token and shop info
        const oauthData = await shopifyChannel.exchangeCodeForTokenWithShop(code, shop);

        // Handle login with Shopify data
        const result = await shopifyChannel.handleShopifyLogin(oauthData, ipAddress, deviceInfo);

        if ('error' in result) {
          // Delete state even on error to prevent reuse
          await shopifyChannel.deleteState(state);
          return result;
        }

        // Delete OAuth state after successful authentication
        await shopifyChannel.deleteState(state);

        return result;
      } catch (oauthError: any) {
        // Handle OAuth code already used error
        if (oauthError.message === 'OAUTH_CODE_ALREADY_USED') {
          // Try to find existing user by shop domain and create session
          const result = await shopifyChannel.handleExistingUserLogin(shop, ipAddress);

          if ('error' in result) {
            await shopifyChannel.deleteState(state);
            return result;
          }

          // Delete OAuth state
          await shopifyChannel.deleteState(state);

          return result;
        }

        // If not handled above, re-throw the error
        throw oauthError;
      }
    } catch (error) {
      captureException(error as Error);
      return { error: 'Failed to authenticate with Shopify' };
    }
  }

  /**
   * Generate Shopify OAuth URL
   * @param shop Optional shop domain to pre-fill
   * @returns Authentication URL
   */
  public generateShopifyAuthUrl(shop?: string): string {
    const shopifyChannel = new ShopifyChannel(shop || '', '', this.fastify);
    return shopifyChannel.generateAuthUrl(shop);
  }
}
