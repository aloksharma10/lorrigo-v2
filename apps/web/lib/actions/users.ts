"use server"

import { auth } from "@/auth";

export async function getUserProfile() {
   const session = await auth()
   console.log(session)
   const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/me`, {
      headers: {
         Authorization: `Bearer ${session?.user?.token}`,
      },
   });
   return response.json();
}
