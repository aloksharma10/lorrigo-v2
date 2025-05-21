import { Navbar } from '@/components/navbar';
import Link from 'next/link';

export default function Page() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="block">Welcome to</span>
            <span className="block text-blue-600 dark:text-blue-500">Lorrigo</span>
          </h1>
          <p className="mt-6 max-w-lg text-center text-lg text-gray-600 dark:text-gray-300">
            A powerful platform for managing your business operations, logistics, and more.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/signin"
              className="rounded-md bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700"
            >
              Get Started
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-gray-300 bg-white px-8 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
