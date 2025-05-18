import { PrismaClient } from '@lorrigo/db';
import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  business_name: string;
  phone: string;
  gstin?: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
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

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        code: `US-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        email: data.email,
        password: data.password,
        name: data.name,
        business_name: data.business_name,
        phone: data.phone,
        gstin: data.gstin,
        role: 'SELLER', // Default role for new registrations
      },
    });

    // Create wallet for user
    await this.prisma.wallet.create({
      data: {
        code: `WL-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        balance: 0,
        user_id: user.id,
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
      },
      token,
    };
  }

  async login(email: string, password: string): Promise<AuthResponse | { error: string }> {
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

    // Create API request log
    await this.prisma.apiRequest.create({
      data: {
        code: `AR-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        endpoint: '/login',
        method: 'POST',
        ip_address: 'unknown', // Will be set by controller
        user_id: user.id,
        response_status: 200,
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
      },
      token,
    };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        business_name: true,
        permissions: true,
      },
    });
  }

  async logout(userId: string, ipAddress: string) {
    return this.prisma.apiRequest.create({
      data: {
        code: `AR-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        endpoint: '/logout',
        method: 'POST',
        ip_address: ipAddress,
        user_id: userId,
        response_status: 200,
      },
    });
  }
}
