'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { permissionService, type Permission, type Role } from '@/lib/permissions';

/**
 * Hook personalizado para manejo de permisos en componentes React
 * Provee funciones para verificar permisos y roles con caché automático
 */
export function usePermissions() {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [userRoleName, setUserRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar permisos y rol del usuario
  useEffect(() => {
    async function loadPermissions() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Cargar permisos en paralelo
        const [userPermissions, userRoleData] = await Promise.all([
          permissionService.obtenerPermisosUsuario(user.id),
          permissionService.obtenerRolUsuario(user.id)
        ]);

        // Convertir permisos a Set para búsqueda rápida
        const permissionSet = new Set(
          userPermissions.map(p => `${p.resource}:${p.action}`)
        );
        setPermissions(permissionSet);

        // Guardar rol del usuario
        setUserRole(userRoleData);
        setUserRoleName(userRoleData?.name || null);

        console.log('Permisos cargados:', permissionSet.size, 'para usuario:', user.id);
      } catch (err) {
        console.error('Error al cargar permisos:', err);
        setError('No se pudieron cargar los permisos del usuario');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      loadPermissions();
    } else if (authLoading) {
      setLoading(true);
    }
  }, [user, authLoading]);

  /**
   * Verifica si el usuario tiene permiso para un recurso y acción específicos
   * @param resource Recurso a verificar (ej: 'comments', 'news', 'users')
   * @param action Acción a verificar (ej: 'read', 'create', 'update', 'delete')
   * @returns boolean true si tiene permiso
   */
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    return permissions.has(`${resource}:${action}`);
  }, [permissions]);

  /**
   * Verifica si el usuario tiene permiso para un recurso y varias acciones
   * @param resource Recurso a verificar
   * @param actions Array de acciones permitidas
   * @returns boolean true si tiene al menos una de las acciones
   */
  const hasAnyPermission = useCallback((resource: string, actions: string[]): boolean => {
    return actions.some(action => hasPermission(resource, action));
  }, [hasPermission]);

  /**
   * Verifica si el usuario tiene permiso para todos los recursos y acciones especificados
   * @param permissions Array de [recurso, acción] a verificar
   * @returns boolean true si tiene todos los permisos
   */
  const hasAllPermissions = useCallback((requiredPermissions: Array<[string, string]>): boolean => {
    return requiredPermissions.every(([resource, action]) => hasPermission(resource, action));
  }, [hasPermission]);

  /**
   * Verifica si el usuario tiene un rol específico
   * @param role Rol a verificar (ej: 'admin', 'moderador', 'estudiante')
   * @returns boolean true si tiene ese rol
   */
  const hasRole = useCallback((role: string): boolean => {
    return userRoleName === role;
  }, [userRoleName]);

  /**
   * Verifica si el usuario tiene alguno de los roles especificados
   * @param roles Array de roles permitidos
   * @returns boolean true si tiene al menos uno de los roles
   */
  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return roles.includes(userRoleName || '');
  }, [userRoleName]);

  /**
   * Verifica si el usuario tiene un rol de nivel específico o superior
   * @param requiredLevel Nivel mínimo requerido
   * @returns boolean true si tiene nivel igual o superior
   */
  const hasRoleLevel = useCallback((requiredLevel: number): boolean => {
    if (!userRole) return false;
    return userRole.level >= requiredLevel;
  }, [userRole]);

  /**
   * Obtiene el nivel del rol actual del usuario
   * @returns number | null Nivel del rol o null si no tiene rol
   */
  const getRoleLevel = useCallback((): number | null => {
    return userRole?.level || null;
  }, [userRole]);

  /**
   * Obtiene el nombre del rol actual
   * @returns string | null Nombre del rol o null si no tiene rol
   */
  const getRoleName = useCallback((): string | null => {
    return userRoleName;
  }, [userRoleName]);

  /**
   * Verifica si un usuario puede asignar un rol específico
   * @param targetRoleId ID del rol a verificar
   * @returns Promise<boolean> true si puede asignar el rol
   */
  const canAssignRole = useCallback(async (targetRoleId: string): Promise<boolean> => {
    if (!user) return false;
    return await permissionService.puedeAsignarRol(user.id, targetRoleId);
  }, [user]);

  /**
   * Componente para renderizar contenido solo si el usuario tiene permiso
   * @param resource Recurso requerido
   * @param action Acción requerida
   * @param children Contenido a mostrar si tiene permiso
   * @param fallback Contenido alternativo si no tiene permiso
   * @returns JSX.Element
   */
  const PermissionGate = useCallback((
    { resource, action, children, fallback }: {
      resource: string;
      action: string;
      children: React.ReactNode;
      fallback?: React.ReactNode;
    }
  ): JSX.Element => {
    const hasAccess = hasPermission(resource, action);

    if (hasAccess) {
      return <>{children}</>;
    }

    return <>{fallback || null}</>;
  }, [hasPermission]);

  /**
   * Componente para renderizar contenido solo si el usuario tiene un rol específico
   * @param role Rol requerido
   * @param children Contenido a mostrar si tiene el rol
   * @param fallback Contenido alternativo si no tiene el rol
   * @returns JSX.Element
   */
  const RoleGate = useCallback((
    { role, children, fallback }: {
      role: string;
      children: React.ReactNode;
      fallback?: React.ReactNode;
    }
  ): JSX.Element => {
    const hasAccess = hasRole(role);

    if (hasAccess) {
      return <>{children}</>;
    }

    return <>{fallback || null}</>;
  }, [hasRole]);

  // Obtenemos estadísticas del caché para depuración
  const cacheStats = permissionService.getCacheStats();

  return {
    // Estado básico
    permissions,
    userRole,
    userRoleName,
    loading: loading || authLoading,
    error,

    // Funciones de verificación de permisos
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Funciones de verificación de roles
    hasRole,
    hasAnyRole,
    hasRoleLevel,
    getRoleLevel,
    getRoleName,

    // Funciones de asignación de roles
    canAssignRole,

    // Componentes de protección
    PermissionGate,
    RoleGate,

    // Debug y estadísticas
    cacheStats,
    totalPermissions: permissions.size
  };
}

export default usePermissions;