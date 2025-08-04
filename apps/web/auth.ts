import { Role } from '@lorrigo/db';
import NextAuth, { NextAuthResult } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@lorrigo/db';
import { getDeviceInfo } from '@/lib/utils/device-info';

// Declare module augmentation for next-auth
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: Role;
      token?: string;
      hasPasskeys?: boolean;
    };
  }
}



export const result = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        passkeyToken: { label: 'Passkey Token', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email) {
          return null;
        }

        try {
          // Handle passkey authentication (when password is actually a token)
          if (credentials.password && typeof credentials.password === 'string' && credentials.password.startsWith('eyJ')) {
            // This is a JWT token, not a password - handle as passkey auth
            const response = await fetch(`${process.env.FASTIFY_BACKEND_URL}/auth/verify-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${credentials.password}`,
              },
              body: JSON.stringify({
                token: "verify",
              }),
            });

            if (response.ok) {
              const data = await response.json();
              return {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: data.user.role,
                token: credentials.password as string,
                hasPasskeys: data.user.hasPasskeys,
              };
            }
            return null;
          }

          // Handle regular password authentication
          if (!credentials.password) {
            return null;
          }

          const deviceInfo = await getDeviceInfo(req);
          
          const response = await fetch(`${process.env.FASTIFY_BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              deviceInfo,
            }),
          });

          if (!response.ok) {
            console.error('Login API failed', await response.text());
            return null;
          }

          const data = await response.json();

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            token: data.token,
            hasPasskeys: data.user.hasPasskeys,
          };
        } catch (err) {
          console.error('Auth error:', err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Call our backend API to handle Google OAuth
          const deviceInfo = await getDeviceInfo({ headers: new Headers() } as any);
          
          const response = await fetch(`${process.env.FASTIFY_BACKEND_URL}/auth/login/google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email!,
              name: user.name!,
              googleId: profile?.sub,
              image: user.image,
              deviceInfo,
            }),
          });

          if (!response.ok) {
            console.error('Google OAuth login failed:', await response.text());
            return false;
          }

          const data = await response.json();
          
          // Store the token in the user object for the jwt callback
          (user as any).token = data.token;
          (user as any).role = data.user.role;
          (user as any).hasPasskeys = data.user.hasPasskeys;
          
          return true;
        } catch (error) {
          console.error('Error in Google OAuth signIn:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.role = user.role;
        // @ts-ignore
        token.token = user.token as string;
        // @ts-ignore
        token.hasPasskeys = user.hasPasskeys;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || '';
        session.user.role = token.role as Role;
        session.user.token = (token.token as any) || '';
        session.user.hasPasskeys = token.hasPasskeys as boolean;
      }
      return session;
    },
    authorized: async ({ auth }) => {
      return !!auth;
    },
  },
  secret: process.env.AUTH_SECRET,
});

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const auth: NextAuthResult['auth'] = result.auth;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
