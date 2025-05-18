import { NextResponse } from 'next/server';
import { prisma } from '@lorrigo/db';
import { hash } from 'bcrypt';

export async function POST(req: Request) {
  try {
    const { name, email, password, phone } = await req.json();

    // Validate input
    if (!name || !email || !password || !phone) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Generate user code
    const date = new Date();
    const yearMonth = `${date.getFullYear().toString().substring(2)}${(date.getMonth() + 1).toString().padStart(2, '0')}`;

    // Get count of existing users to generate unique code
    const userCount = await prisma.user.count();
    const userCode = `US-${yearMonth}-${(userCount + 1).toString().padStart(5, '0')}`;

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        code: userCode,
        role: 'SELLER',
      },
    });

    // Remove password from returned user object
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { message: 'User registered successfully', user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
