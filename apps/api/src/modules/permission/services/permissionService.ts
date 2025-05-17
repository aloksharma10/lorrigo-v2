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
        user_id: userId,
        is_active: true,
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
        user_id: userId,
        name: permissionName,
        is_active: true,
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
  static async assignPermission(user_id: string, permission_name: string, description?: string) {
    // Check if permission already exists
    const existingPermission = await prisma.permissions.findFirst({
      where: {
        user_id: user_id,
        name: permission_name,
      },
    });
    
    if (existingPermission) {
      // If it exists but inactive, reactivate it
      if (!existingPermission.is_active) {
        return prisma.permissions.update({
          where: {
            id: existingPermission.id,
          },
          data: {
            is_active: true,
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
        name: permission_name,
        description: description || `Permission for ${permission_name}`,
        is_active: true,
        user: {
          connect: {
            id: user_id,
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
  static async removePermission(user_id: string, permission_name: string): Promise<boolean> {
    const permission = await prisma.permissions.findFirst({
      where: {
        user_id: user_id,
        name: permission_name,
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
        is_active: false,
      },
    });
    
    return true;
  }
  
  /**
   * Set navigation permissions for a user
   * @param user_id The user ID
   * @param nav_permissions Object mapping navigation items to boolean permissions
   */
  static async setNavPermissions(user_id: string, nav_permissions: Record<string, boolean>) {
    // Find the navigation permission if it exists
    const nav_permission = await prisma.permissions.findFirst({
      where: {
        user_id: user_id,
        name: 'navigation',
      },
    });
    
    if (nav_permission) {
      // Update existing permission
      return prisma.permissions.update({
        where: {
          id: nav_permission.id,
        },
        data: {
          nav_permission: nav_permissions,
          is_active: true,
        },
      });
    }
    
    // Create new navigation permission
    return prisma.permissions.create({
      data: {
        code: `PM-${Date.now().toString().substring(7)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        name: 'navigation',
        description: 'Navigation permissions',
        nav_permission: nav_permissions,
        is_active: true,
        user: {
          connect: {
            id: user_id,
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
  static async getNavPermissions(user_id: string) {
    const nav_permission = await prisma.permissions.findFirst({
      where: {
        user_id: user_id,
        name: 'navigation',
        is_active: true,
      },
    });
    
    return nav_permission?.nav_permission || null;
  }
} 