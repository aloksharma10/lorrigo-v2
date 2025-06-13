import NextAuth, { NextAuthResult } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Declare module augmentation for next-auth
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      token?: string;
    };
  }
}

export const result = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(`${process.env.FASTIFY_BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            console.error('Login API failed', await response.text());
            return null;
          }

          const data = await response.json();

          // Assume API returns: { id, email, name, role, token }
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            token: data.token,
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
    session: ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.sub || '';
        session.user.role = token.role as string;
        session.user.token = token.token as string;
      }
      return session;
    },
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.role = user.role;
        // @ts-ignore
        token.token = user.token;
      }
      return token;
    },
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth
    },
  },
  secret: process.env.AUTH_SECRET,
});

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const auth: NextAuthResult['auth'] = result.auth;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
