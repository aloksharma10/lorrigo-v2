import { Role } from '@lorrigo/db';

export function getRoleBasedRedirect(role?: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'SALESPERSON':
      return '/staff/dashboard';
    case 'SELLER':
      return '/seller/dashboard';
    default:
      return '/'; // Regular users go to homepage
  }
}
