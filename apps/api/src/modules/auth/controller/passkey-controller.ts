import { FastifyRequest, FastifyReply } from 'fastify';
import { 
  generateRegistrationOptions, 
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import { PrismaClient } from '@lorrigo/db';
import { captureException } from '@/lib/sentry';
import crypto from 'crypto';

// WebAuthn configuration
const rpName = 'Lorrigo';
const rpID = process.env.NODE_ENV === 'production' ? 'app.lorrigo.com' : 'localhost';
const origin = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL || 'https://app.lorrigo.com'
  : 'http://localhost:3000';

export class PasskeyController {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate registration options for passkey
   */
  async generateRegistrationOptions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as { userId: string };

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      // Get existing passkeys for this user (only if user has passkeys)
      let excludeCredentials: any[] = [];
      
      if (user.hasPasskeys) {
        const existingPasskeys = await this.prisma.passkey.findMany({
          where: { userId },
          select: { credentialID: true },
        });

        excludeCredentials = existingPasskeys.map(passkey => ({
          id: passkey.credentialID,
          type: 'public-key' as const,
        }));
      }

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: Buffer.from(userId, 'utf8'),
        userName: user.email,
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        supportedAlgorithmIDs: [-7, -257], // ES256, RS256
      });

      console.log(options);

      // Store challenge in Redis or session
      await request.server.redis.setex(
        `passkey_challenge:${userId}`,
        300, // 5 minutes
        options.challenge
      );

      return reply.code(200).send({
        success: true,
        options,
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Verify passkey registration
   */
  async verifyRegistration(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as { userId: string };
      const { credential, expectedChallenge } = request.body as any;

      // Get stored challenge
      const storedChallenge = await request.server.redis.get(`passkey_challenge:${userId}`);
      if (!storedChallenge) {
        return reply.code(400).send({ success: false, message: 'Challenge expired or not found' });
      }

      // Verify the registration response
      const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: storedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return reply.code(400).send({ success: false, message: 'Passkey verification failed' });
      }

      // Save the passkey to database
      await this.prisma.passkey.create({
        data: {
          userId,
          credentialID: verification.registrationInfo.credential.id,
          publicKey: Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64'),
          counter: verification.registrationInfo.credential.counter,
          transports: credential.response.transports || [],
          backupEligible: false, // Default value since it's not available in newer version
          backupState: false, // Default value since it's not available in newer version
          deviceType: this.getDeviceType(request),
        },
      });

      // Update user to indicate they have passkeys
      await this.prisma.user.update({
        where: { id: userId },
        data: { hasPasskeys: true },
      });

      // Clear the challenge
      await request.server.redis.del(`passkey_challenge:${userId}`);

      return reply.code(200).send({
        success: true,
        message: 'Passkey registered successfully',
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Generate authentication options for passkey
   */
  async generateAuthenticationOptions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = request.body as { email: string };

      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { 
          id: true,
          name: true,
          email: true,
          role: true,
          hasPasskeys: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      if (!user.hasPasskeys) {
        return reply.code(400).send({ success: false, message: 'No passkeys found for this user' });
      }

      // Get passkeys only if user has them
      const passkeys = await this.prisma.passkey.findMany({
        where: { userId: user.id },
        select: { credentialID: true, transports: true },
      });

      if (passkeys.length === 0) {
        return reply.code(400).send({ success: false, message: 'No passkeys found for this user' });
      }

      const allowCredentials = passkeys.map(passkey => ({
        id: passkey.credentialID,
        type: 'public-key' as const,
        transports: passkey.transports as any,
      }));

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: 'preferred',
        challenge: crypto.randomBytes(32).toString('base64url'),
      });

      // Store challenge in Redis
      await request.server.redis.setex(
        `passkey_auth_challenge:${user.id}`,
        300, // 5 minutes
        options.challenge
      );

      return reply.code(200).send({
        success: true,
        options,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Verify passkey authentication
   */
  async verifyAuthentication(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, credential } = request.body as any;

      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: { passkeys: true },
      });

      if (!user) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      // Get stored challenge
      const storedChallenge = await request.server.redis.get(`passkey_auth_challenge:${user.id}`);
      if (!storedChallenge) {
        return reply.code(400).send({ success: false, message: 'Challenge expired or not found' });
      }

      // Find the passkey
      const passkey = user.passkeys.find(p => p.credentialID === credential.id);
      if (!passkey) {
        return reply.code(400).send({ success: false, message: 'Passkey not found' });
      }

      // Verify the authentication response
      const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: storedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialID,
          publicKey: Buffer.from(passkey.publicKey, 'base64'),
          counter: passkey.counter,
        },
      });

      if (!verification.verified) {
        return reply.code(400).send({ success: false, message: 'Passkey verification failed' });
      }

      // Update passkey counter
      await this.prisma.passkey.update({
        where: { id: passkey.id },
        data: {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        },
      });

      // Clear the challenge
      await request.server.redis.del(`passkey_auth_challenge:${user.id}`);

      // Generate JWT token
      const token = request.server.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      return reply.code(200).send({
        success: true,
        message: 'Authentication successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hasPasskeys: user.hasPasskeys,
        },
        token,
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Get user's passkeys
   */
  async getUserPasskeys(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = request.params as { userId: string };

      // Check if user has passkeys first
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { hasPasskeys: true },
      });

      if (!user?.hasPasskeys) {
        return reply.code(200).send({
          success: true,
          passkeys: [],
        });
      }

      const passkeys = await this.prisma.passkey.findMany({
        where: { userId },
        select: {
          id: true,
          deviceType: true,
          createdAt: true,
          lastUsedAt: true,
          transports: true,
        },
        orderBy: { lastUsedAt: 'desc' },
      });

      return reply.code(200).send({
        success: true,
        passkeys,
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId, passkeyId } = request.params as { userId: string; passkeyId: string };

      // Check if passkey belongs to user
      const passkey = await this.prisma.passkey.findFirst({
        where: { id: passkeyId, userId },
      });

      if (!passkey) {
        return reply.code(404).send({ success: false, message: 'Passkey not found' });
      }

      await this.prisma.passkey.delete({
        where: { id: passkeyId },
      });

      // Check if user has any remaining passkeys
      const remainingPasskeys = await this.prisma.passkey.count({
        where: { userId },
      });

      if (remainingPasskeys === 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { hasPasskeys: false },
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Passkey deleted successfully',
      });
    } catch (error) {
      captureException(error as Error);
      return reply.code(500).send({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * Helper method to determine device type from request
   */
  private getDeviceType(request: FastifyRequest): string {
    const userAgent = request.headers['user-agent'] || '';
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }
} 