# @lorrigo/auth

Shared authentication package for the Lorrigo platform, using Auth.js (NextAuth.js) with Google and GitHub providers.

## Features

- Auth.js (NextAuth.js) configuration with Google and GitHub OAuth providers
- JWT-based authentication
- Prisma adapter for database integration
- TypeScript support
- Server and client utilities for authentication

## Installation

This package is part of the Lorrigo monorepo and is installed automatically via workspace dependencies.

## Setup

### Environment Variables

Create or update your `.env` file in the project root with the following variables:

```bash
# Auth
AUTH_SECRET=your-auth-secret # Generate with `openssl rand -base64 32`
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lorrigo
```

### Prisma Schema

Add the following models to your `schema.prisma` file to support Auth.js:

```prisma
model Account {
  id                       String  @id @default(cuid())
  userId                   String
  type                     String
  provider                 String
  providerAccountId        String
  refresh_token            String? @db.Text
  access_token             String? @db.Text
  expires_at               Int?
  token_type               String?
  scope                    String?
  id_token                 String? @db.Text
  session_state            String?
  refresh_token_expires_in Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

## Usage

### Next.js Setup

1. Create a route handler for Auth.js:

```typescript
// app/api/auth/[...nextauth]/route.ts
import { authOptions } from '@lorrigo/auth';
import NextAuth from 'next-auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

2. Add the session provider to your layout:

```typescript
// app/layout.tsx
'use client';

import { SessionProvider } from "next-auth/react";

export function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

3. Add middleware for protected routes:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const isProtectedPath = request.nextUrl.pathname.startsWith('/dashboard');

  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  return NextResponse.next();
}
```

### Fastify API Setup

For the Fastify API, use the auth plugin:

```typescript
// Register the auth plugin in your Fastify app
await app.register(import('@lorrigo/auth/plugins/auth'));

// Access the authenticated user in route handlers
app.get('/protected', async (request, reply) => {
  const user = request.user;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  return { message: 'Protected data', user };
});
```
