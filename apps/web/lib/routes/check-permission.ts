import { Role } from '@lorrigo/db';
import { getRoleBasedRedirect } from './redirect';

const routePermissions = {
  '/admin': ['ADMIN'],
  '/staff': ['ADMIN', 'SALESPERSON'],
  '/seller': ['ADMIN', 'SALESPERSON', 'SELLER'],
};

export function checkAccessAndRedirect(pathname: string, userRole: Role | undefined): { hasAccess: boolean; redirectPath: string } {
  let hasAccess = false;
  let redirectPath = '';

  const routeMap = {
    '/admin': ['/admin'],
    '/staff': ['/staff'],
    '/seller': ['/seller'],
  };

  // Find matching route
  for (const [baseRoute, paths] of Object.entries(routeMap)) {
    if (paths.some((path) => pathname.startsWith(path))) {
      hasAccess = routePermissions[baseRoute as keyof typeof routePermissions].includes(userRole as string);
      if (!hasAccess) {
        redirectPath = getRoleBasedRedirect(userRole);
      }
      break;
    }
  }

  return { hasAccess, redirectPath };
}
