import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const isAuthenticated = !!token;

  // Check if the path is protected (starts with /seller, /staff, or /admin)
  const isProtectedPath =
    request.nextUrl.pathname.startsWith('/seller') ||
    request.nextUrl.pathname.startsWith('/staff') ||
    request.nextUrl.pathname.startsWith('/admin');

  // Redirect unauthenticated users from protected routes
  if (isProtectedPath && !isAuthenticated) {
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Optimize protected pages with ISR cache headers
  if (isProtectedPath && isAuthenticated) {
    const response = NextResponse.next();
    
    // Set different cache strategies based on the route type
    if (request.nextUrl.pathname.startsWith('/seller')) {
      // Seller routes - moderate caching for business data
      if (request.nextUrl.pathname.includes('/dashboard')) {
        // Seller dashboard needs frequent updates
        response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      } else if (
        request.nextUrl.pathname.includes('/orders') ||
        request.nextUrl.pathname.includes('/shipments')
      ) {
        // Orders and shipments can be cached a bit longer
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      } else if (request.nextUrl.pathname.includes('/analytics')) {
        // Analytics can be cached longer
        response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
      } else if (request.nextUrl.pathname.includes('/settings')) {
        // Settings rarely change
        response.headers.set('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
      } else {
        // Default seller routes
        response.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=240');
      }
    } else if (request.nextUrl.pathname.startsWith('/staff')) {
      // Staff routes - moderate caching for operational data
      if (request.nextUrl.pathname.includes('/dashboard')) {
        // Staff dashboard needs frequent updates
        response.headers.set('Cache-Control', 's-maxage=45, stale-while-revalidate=90');
      } else if (
        request.nextUrl.pathname.includes('/orders') ||
        request.nextUrl.pathname.includes('/shipments') ||
        request.nextUrl.pathname.includes('/support')
      ) {
        // Operational data needs frequent updates
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=180');
      } else {
        // Default staff routes
        response.headers.set('Cache-Control', 's-maxage=90, stale-while-revalidate=180');
      }
    } else if (request.nextUrl.pathname.startsWith('/admin')) {
      // Admin routes - shorter caching for critical data
      if (request.nextUrl.pathname.includes('/dashboard')) {
        // Admin dashboard needs very frequent updates
        response.headers.set('Cache-Control', 's-maxage=20, stale-while-revalidate=40');
      } else if (
        request.nextUrl.pathname.includes('/users') ||
        request.nextUrl.pathname.includes('/system') ||
        request.nextUrl.pathname.includes('/reports')
      ) {
        // Critical admin data
        response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      } else if (request.nextUrl.pathname.includes('/settings')) {
        // Admin settings need careful caching
        response.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=240');
      } else {
        // Default admin routes
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
      }
    }
    
    return response;
  }

  // For public routes, add basic caching
  if (!isProtectedPath) {
    const response = NextResponse.next();
    
    // Public pages can be cached longer
    if (
      request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/about') ||
      request.nextUrl.pathname.startsWith('/pricing') ||
      request.nextUrl.pathname.startsWith('/features')
    ) {
      // Static marketing pages
      response.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    } else if (request.nextUrl.pathname.startsWith('/auth')) {
      // Auth pages should not be cached
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected routes
    '/seller/:path*',
    '/staff/:path*', 
    '/admin/:path*',
    // API routes for CORS
    '/api/:path*',
    // Public routes that need caching optimization
    '/',
    '/about/:path*',
    '/pricing/:path*',
    '/features/:path*',
    '/auth/:path*',
  ],
};