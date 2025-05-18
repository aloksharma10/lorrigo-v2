import { getToken } from 'next-auth/jwt';

export async function getUserFromToken(req: Request) {
  try {
    const token = await getToken({
      req: req as any,
      secret: process.env.AUTH_SECRET,
    });

    return token;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}
