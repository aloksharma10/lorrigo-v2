'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isAuthenticated = !!session;

  return (
    <header className="sticky top-0 z-40 border-b bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Lorrigo</span>
        </Link>

        <nav className="hidden items-center space-x-8 md:flex">
          <Link
            href="/"
            className={`text-sm font-medium ${
              pathname === '/'
                ? 'text-blue-600 dark:text-blue-500'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            Home
          </Link>
          {isAuthenticated && (
            <>
              <Link
                href="/dashboard"
                className={`text-sm font-medium ${
                  pathname === '/dashboard'
                    ? 'text-blue-600 dark:text-blue-500'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className={`text-sm font-medium ${
                  pathname === '/profile'
                    ? 'text-blue-600 dark:text-blue-500'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Profile
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {isLoading ? (
            <span className="text-sm">Loading...</span>
          ) : isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span className="hidden text-sm md:inline-block">{session?.user?.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="bg-primary rounded-md px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
