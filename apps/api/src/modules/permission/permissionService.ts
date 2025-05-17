import { prisma } from '@lorrigo/db';

/**
 * Permission service for managing user permissions
 */
export class PermissionService {
  /**
   * Get all permissions for a user
   * @param userId The user ID
   * @returns Array of user permissions
   */
  static async getUserPermissions(userId: string) {
    const permissions = await prisma.permissions.findMany({
      where: {
        userId,
        isActive: true,
      },
    });
    
    return permissions;
  }
  
  /**
   * Check if a user has a specific permission
   * @param userId The user ID
   * @param permissionName The permission name to check
   * @returns Boolean indicating if the user has the permission
   */
  static async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const count = await prisma.permissions.count({
      where: {
        userId,
        name: permissionName,
        isActive: true,
      },
    });
    
    return count > 0;
  }
  
  /**
   * Check if a user has all of the specified permissions
   * @param userId The user ID
   * @param permissionNames Array of permission names to check
   * @returns Boolean indicating if the user has all permissions
   */
  static async hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    
    const permissionNameSet = new Set(permissions.map(p => p.name));
    
    return permissionNames.every(name => permissionNameSet.has(name));
  }
  
  /**
   * Check if a user has any of the specified permissions
   * @param userId The user ID
   * @param permissionNames Array of permission names to check
   * @returns Boolean indicating if the user has any of the permissions
   */
  static async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    
    const permissionNameSet = new Set(permissions.map(p => p.name));
    
    return permissionNames.some(name => permissionNameSet.has(name));
  }
  
  /**
   * Assign a permission to a user
   * @param userId The user ID
   * @param permissionName The permission name to assign
   * @param description Optional description of the permission
   * @returns The created permission
   */
  static async assignPermission(userId: string, permissionName: string, description?: string) {
    // Check if permission already exists
    const existingPermission = await prisma.permissions.findFirst({
      where: {
        userId,
        name: permissionName,
      },
    });
    
    if (existingPermission) {
      // If it exists but inactive, reactivate it
      if (!existingPermission.isActive) {
        return prisma.permissions.update({
          where: {
            id: existingPermission.id,
          },
          data: {
            isActive: true,
            description: description || existingPermission.description,
          },
        });
      }
      
      // Already active, just return it
      return existingPermission;
    }
    
    // Create new permission
    return prisma.permissions.create({
      data: {
        code: `PM-${Date.now().toString().substring(7)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        name: permissionName,
        description: description || `Permission for ${permissionName}`,
        isActive: true,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }
  
  /**
   * Remove a permission from a user
   * @param userId The user ID
   * @param permissionName The permission name to remove
   * @returns Boolean indicating success
   */
  static async removePermission(userId: string, permissionName: string): Promise<boolean> {
    const permission = await prisma.permissions.findFirst({
      where: {
        userId,
        name: permissionName,
      },
    });
    
    if (!permission) {
      return false;
    }
    
    await prisma.permissions.update({
      where: {
        id: permission.id,
      },
      data: {
        isActive: false,
      },
    });
    
    return true;
  }
  
  /**
   * Set navigation permissions for a user
   * @param userId The user ID
   * @param navPermissions Object mapping navigation items to boolean permissions
   */
  static async setNavPermissions(userId: string, navPermissions: Record<string, boolean>) {
    // Find the navigation permission if it exists
    const navPermission = await prisma.permissions.findFirst({
      where: {
        userId,
        name: 'navigation',
      },
    });
    
    if (navPermission) {
      // Update existing permission
      return prisma.permissions.update({
        where: {
          id: navPermission.id,
        },
        data: {
          navPermission: navPermissions,
          isActive: true,
        },
      });
    }
    
    // Create new navigation permission
    return prisma.permissions.create({
      data: {
        code: `PM-${Date.now().toString().substring(7)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        name: 'navigation',
        description: 'Navigation permissions',
        navPermission: navPermissions,
        isActive: true,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }
  
  /**
   * Get navigation permissions for a user
   * @param userId The user ID
   * @returns Navigation permissions object or null
   */
  static async getNavPermissions(userId: string) {
    const navPermission = await prisma.permissions.findFirst({
      where: {
        userId,
        name: 'navigation',
        isActive: true,
      },
    });
    
    return navPermission?.navPermission || null;
  }
} 