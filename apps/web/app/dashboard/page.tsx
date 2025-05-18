import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';

export default async function Dashboard() {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="mt-6">
            <p>Welcome, {session.user?.name}!</p>
            <pre className="mt-4 rounded-md bg-gray-100 p-4 text-sm dark:bg-gray-800">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
