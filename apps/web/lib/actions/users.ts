'use server';

import { auth } from '@/auth';

export async function getUserProfile() {
  const session = await auth();
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${session?.user?.token}`,
    },
  });
  return response.json();
}

export async function getUserProfileById(userId: string) {
  const session = await auth();
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${session?.user?.token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  const data = await response.json();
  return data.success ? data.user.profile : null;
}
