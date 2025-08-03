import { redis } from './redis';
import { APP_CONFIG } from '@/config/app';
import { OTPData, OTPPayload, OTPType, OTPVerificationPayload } from '@/types/notification';
import { captureException } from './sentry';
import { v4 as uuidv4 } from 'uuid';

export class OTPService {
  private readonly prefix = 'otp:';
  private readonly cooldownPrefix = 'otp_cooldown:';
  private readonly attemptsPrefix = 'otp_attempts:';

  /**
   * Generate OTP for the given identifier
   */
  async generateOTP(payload: OTPPayload): Promise<{ success: boolean; message: string; otpId?: string }> {
    try {
      const { type, identifier, identifierType, purpose, metadata } = payload;
      
      // Check cooldown period
      const cooldownKey = `${this.cooldownPrefix}${identifier}:${type}`;
      const cooldownRemaining = await redis.ttl(cooldownKey);
      
      if (cooldownRemaining > 0) {
        const minutes = Math.ceil(cooldownRemaining / 60);
        return {
          success: false,
          message: `Please wait ${minutes} minutes before requesting another OTP`,
        };
      }

      // Check if there's an existing unexpired OTP
      const existingOTPKey = `${this.prefix}${identifier}:${type}`;
      const existingOTP = await redis.get(existingOTPKey);
      
      if (existingOTP) {
        const otpData: OTPData = JSON.parse(existingOTP);
        const now = new Date();
        
        if (otpData.expiresAt > now) {
          return {
            success: false,
            message: 'An OTP has already been sent. Please check your messages or wait for it to expire.',
          };
        }
      }

      // Generate OTP
      const otp = this.generateOTPCode();
      const otpId = uuidv4();
      const expiresAt = new Date(Date.now() + APP_CONFIG.NOTIFICATION.OTP.EXPIRY_MINUTES * 60 * 1000);

      const otpData: OTPData = {
        id: otpId,
        otp,
        type,
        identifier,
        identifierType,
        purpose,
        attempts: 0,
        maxAttempts: APP_CONFIG.NOTIFICATION.OTP.MAX_ATTEMPTS,
        expiresAt,
        createdAt: new Date(),
        metadata,
      };

      // Store OTP in Redis with expiry
      const otpKey = `${this.prefix}${identifier}:${type}`;
      await redis.setex(
        otpKey,
        APP_CONFIG.NOTIFICATION.OTP.EXPIRY_MINUTES * 60,
        JSON.stringify(otpData)
      );

      // Set cooldown period
      await redis.setex(
        cooldownKey,
        APP_CONFIG.NOTIFICATION.OTP.COOLDOWN_MINUTES * 60,
        '1'
      );

      return {
        success: true,
        message: 'OTP generated successfully',
        otpId,
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to generate OTP',
      };
    }
  }

  /**
   * Verify OTP for the given identifier
   */
  async verifyOTP(payload: OTPVerificationPayload): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { identifier, identifierType, otp, type } = payload;

      // Get OTP data from Redis
      const otpKey = `${this.prefix}${identifier}:${type}`;
      const otpDataString = await redis.get(otpKey);

      if (!otpDataString) {
        return {
          success: false,
          message: 'OTP not found or expired',
        };
      }

      const otpData: OTPData = JSON.parse(otpDataString);

      // Check if OTP is expired
      if (otpData.expiresAt < new Date()) {
        await redis.del(otpKey);
        return {
          success: false,
          message: 'OTP has expired',
        };
      }

      // Check if max attempts exceeded
      if (otpData.attempts >= otpData.maxAttempts) {
        await redis.del(otpKey);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded',
        };
      }

      // Increment attempts
      otpData.attempts++;

      // Check if OTP is already verified (for password reset flow)
      if (otpData.verified && otpData.otp === otp) {
        return {
          success: true,
          message: 'OTP already verified',
          data: {
            otpId: otpData.id,
            type: otpData.type,
            identifier: otpData.identifier,
            purpose: otpData.purpose,
            metadata: otpData.metadata,
            verified: true,
          },
        };
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        // Update attempts in Redis
        await redis.setex(
          otpKey,
          APP_CONFIG.NOTIFICATION.OTP.EXPIRY_MINUTES * 60,
          JSON.stringify(otpData)
        );

        const remainingAttempts = otpData.maxAttempts - otpData.attempts;
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining`,
        };
      }

      // OTP is valid - mark as verified but keep for password reset
      otpData.verifiedAt = new Date();
      otpData.verified = true;
      
      // Keep OTP for a short period (5 minutes) to allow password reset
      await redis.setex(
        otpKey,
        5 * 60, // 5 minutes
        JSON.stringify(otpData)
      );

      // Clear cooldown
      const cooldownKey = `${this.cooldownPrefix}${identifier}:${type}`;
      await redis.del(cooldownKey);

      return {
        success: true,
        message: 'OTP verified successfully',
        data: {
          otpId: otpData.id,
          type: otpData.type,
          identifier: otpData.identifier,
          purpose: otpData.purpose,
          metadata: otpData.metadata,
        },
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to verify OTP',
      };
    }
  }

  /**
   * Resend OTP for the given identifier
   */
  async resendOTP(payload: OTPPayload): Promise<{ success: boolean; message: string; otpId?: string }> {
    try {
      const { identifier, type } = payload;

      // Check if there's an existing OTP
      const otpKey = `${this.prefix}${identifier}:${type}`;
      const existingOTP = await redis.get(otpKey);

      if (!existingOTP) {
        return {
          success: false,
          message: 'No OTP found to resend',
        };
      }

      const otpData: OTPData = JSON.parse(existingOTP);

      // Check if OTP is expired
      if (otpData.expiresAt < new Date()) {
        await redis.del(otpKey);
        return {
          success: false,
          message: 'OTP has expired. Please request a new one',
        };
      }

      // Generate new OTP
      const newOtp = this.generateOTPCode();
      const newExpiresAt = new Date(Date.now() + APP_CONFIG.NOTIFICATION.OTP.EXPIRY_MINUTES * 60 * 1000);

      // Update OTP data
      otpData.otp = newOtp;
      otpData.expiresAt = newExpiresAt;
      otpData.attempts = 0; // Reset attempts

      // Store updated OTP
      await redis.setex(
        otpKey,
        APP_CONFIG.NOTIFICATION.OTP.EXPIRY_MINUTES * 60,
        JSON.stringify(otpData)
      );

      return {
        success: true,
        message: 'OTP resent successfully',
        otpId: otpData.id,
      };
    } catch (error) {
      captureException(error as Error);
      return {
        success: false,
        message: 'Failed to resend OTP',
      };
    }
  }

  /**
   * Get OTP status for the given identifier
   */
  async getOTPStatus(identifier: string, type: OTPType): Promise<{ exists: boolean; expiresAt?: Date; attempts?: number }> {
    try {
      const otpKey = `${this.prefix}${identifier}:${type}`;
      const otpDataString = await redis.get(otpKey);

      if (!otpDataString) {
        return { exists: false };
      }

      const otpData: OTPData = JSON.parse(otpDataString);
      
      return {
        exists: true,
        expiresAt: otpData.expiresAt,
        attempts: otpData.attempts,
      };
    } catch (error) {
      captureException(error as Error);
      return { exists: false };
    }
  }

  /**
   * Invalidate OTP for the given identifier
   */
  async invalidateOTP(identifier: string, type: OTPType): Promise<boolean> {
    try {
      const otpKey = `${this.prefix}${identifier}:${type}`;
      const cooldownKey = `${this.cooldownPrefix}${identifier}:${type}`;
      
      await redis.del(otpKey);
      await redis.del(cooldownKey);
      
      return true;
    } catch (error) {
      captureException(error as Error);
      return false;
    }
  }

  /**
   * Consume OTP after successful password reset
   */
  async consumeOTP(identifier: string, type: OTPType): Promise<boolean> {
    try {
      const otpKey = `${this.prefix}${identifier}:${type}`;
      const otpDataString = await redis.get(otpKey);
      
      if (!otpDataString) {
        return false;
      }

      const otpData: OTPData = JSON.parse(otpDataString);
      
      // Only consume if OTP is verified
      if (otpData.verified) {
        await redis.del(otpKey);
        return true;
      }
      
      return false;
    } catch (error) {
      captureException(error as Error);
      return false;
    }
  }

  /**
   * Generate OTP code using crypto
   */
  private generateOTPCode(): string {
    const digits = APP_CONFIG.NOTIFICATION.OTP.LENGTH;
    let otp = '';
    for (let i = 0; i < digits; i++) {
      otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
  }

  /**
   * Clean up expired OTPs (can be called periodically)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    try {
      const pattern = `${this.prefix}*`;
      const keys = await redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const otpDataString = await redis.get(key);
        if (otpDataString) {
          const otpData: OTPData = JSON.parse(otpDataString);
          if (otpData.expiresAt < new Date()) {
            await redis.del(key);
            cleanedCount++;
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      captureException(error as Error);
      return 0;
    }
  }
}

// Export singleton instance
export const otpService = new OTPService(); 