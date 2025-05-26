
import { getUserProfile } from '@/lib/actions/users';
export default async function UserProfile() {
  const user = await getUserProfile();
  return <div>{JSON.stringify(user)}</div>;
}


// // profile/page.tsx
// 'use client';


// export default function UserProfile() {
//   const { data: session, status } = useSession();
//   const { data: user, isLoading, error } = useUserProfile();
//   const updateProfile = useUpdateUserProfile();

//   const handleUpdate = (newData: { name: string; email: string }) => {
//     if (user?.id) {
//       updateProfile.mutate({ userId: user.id, ...newData });
//     }
//   };

//   if (status === 'loading' || isLoading) {
//     return <div>Loading...</div>;
//   }

//   if (status === 'unauthenticated') {
//     return <div>Please log in to view your profile.</div>;
//   }

//   if (error) {
//     return <div>Error loading profile: {error.message}</div>;
//   }

//   return (
//     <div>
//       <h1>Profile</h1>
//       <h2>{user?.name}</h2>
//       <p>{user?.email}</p>
//       {/* Example form for updating profile */}
//       <button
//         onClick={() =>
//           handleUpdate({ name: 'New Name', email: 'new.email@example.com' })
//         }
//       >
//         Update Profile
//       </button>
//     </div>
//   );
// }