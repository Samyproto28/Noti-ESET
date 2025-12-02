import { createClient } from '@/lib/supabase';
import { permissionService, type Role } from './permissions';
import type { Database } from '@/lib/database.types';

export interface RoleAssignmentOptions {
  targetUserId: string;
  targetRoleId: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface RoleAssignmentResult {
  success: boolean;
  data?: {
    userId: string;
    roleId: string;
    roleName: string;
    assignedBy: string;
    assignedAt: string;
    reason: string;
  };
  error?: string;
  auditLogId?: string;
}

export interface HierarchyValidationResult {
  canAssign: boolean;
  reason?: string;
  adminLevel?: number;
  targetLevel?: number;
  error?: string;
}

/**
 * Servicio para validación y ejecución de asignación de roles
 * Implementa la lógica de jerarquía, prevención de auto-asignación y auditoría
 */
export class RoleAssignmentService {
  /**
   * Valida si un usuario puede asignar un rol específico basado en jerarquía
   * @param adminId ID del administrador que realiza la asignación
   * @param targetRoleId ID del rol a asignar
   * @returns Promise<HierarchyValidationResult> Resultado de la validación
   */
  async validateHierarchy(adminId: string, targetRoleId: string): Promise<HierarchyValidationResult> {
    try {
      const supabase = await createClient();

      // Obtener información del administrador y del rol objetivo
      const [{ data: adminData }, { data: targetRole }] = await Promise.all([
        supabase
          .from('user_roles')
          .select(`
            role_id,
            roles!inner (level)
          `)
          .eq('user_id', adminId)
          .single(),

        supabase
          .from('roles')
          .select('level')
          .eq('id', targetRoleId)
          .single()
      ]);

      if (!adminData || !targetRole) {
        return {
          canAssign: false,
          error: 'No se pudo obtener información del administrador o rol objetivo'
        };
      }

      const adminLevel = adminData.roles.level;
      const targetLevel = targetRole.level;

      // Reglas de jerarquía:
      // - Nivel 4 (Superadmin): Puede asignar cualquier rol
      // - Nivel 3 (Admin): Puede asignar roles de nivel 1 y 2 (estudiante, moderador)
      // - Nivel 2 (Moderador): No puede asignar roles
      // - Nivel 1 (Estudiante): No puede asignar roles

      if (adminLevel >= 4) {
        return { canAssign: true, adminLevel, targetLevel };
      }

      if (adminLevel === 3 && targetLevel <= 2) {
        return { canAssign: true, adminLevel, targetLevel };
      }

      return {
        canAssign: false,
        reason: 'No puedes asignar roles de nivel igual o superior al tuyo',
        adminLevel,
        targetLevel,
        error: 'Violación de jerarquía de permisos'
      };

    } catch (error) {
      console.error('Error en validación de jerarquía:', error);
      return {
        canAssign: false,
        error: 'Error al validar jerarquía de roles'
      };
    }
  }

  /**
   * Verifica si el usuario ya tiene un rol asignado
   * @param userId ID del usuario a verificar
   * @returns Promise<boolean> true si ya tiene rol asignado
   */
  async userHasRole(userId: string): Promise<boolean> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      return !!data;
    } catch (error) {
      console.error('Error al verificar rol del usuario:', error);
      return false;
    }
  }

  /**
   * Obtiene información del usuario objetivo
   * @param userId ID del usuario
   * @returns Promise<{ email: string; full_name: string } | null>
   */
  async getUserInfo(userId: string): Promise<{ email: string; full_name: string } | null> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      return data;
    } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      return null;
    }
  }

  /**
   * Obtiene información del rol objetivo
   * @param roleId ID del rol
   * @returns Promise<{ id: string; name: string; level: number } | null>
   */
  async getRoleInfo(roleId: string): Promise<{ id: string; name: string; level: number } | null> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .from('roles')
        .select('id, name, level')
        .eq('id', roleId)
        .single();

      return data;
    } catch (error) {
      console.error('Error al obtener información del rol:', error);
      return null;
    }
  }

  /**
   * Asigna un rol a un usuario con validaciones completas y auditoría
   * @param adminId ID del administrador que realiza la asignación
   * @param options Opciones de asignación
   * @returns Promise<RoleAssignmentResult> Resultado de la operación
   */
  async assignRole(adminId: string, options: RoleAssignmentOptions): Promise<RoleAssignmentResult> {
    try {
      const supabase = await createClient();

      // Validación 1: Prevenir auto-asignación
      if (adminId === options.targetUserId) {
        return {
          success: false,
          error: 'No puedes asignarte roles a ti mismo'
        };
      }

      // Validación 2: Verificar si el usuario ya tiene rol
      const hasExistingRole = await this.userHasRole(options.targetUserId);
      if (hasExistingRole) {
        return {
          success: false,
          error: 'El usuario ya tiene un rol asignado'
        };
      }

      // Validación 3: Verificar jerarquía de roles
      const hierarchyValidation = await this.validateHierarchy(adminId, options.targetRoleId);
      if (!hierarchyValidation.canAssign) {
        return {
          success: false,
          error: hierarchyValidation.error || hierarchyValidation.reason
        };
      }

      // Validación 4: Verificar permiso de asignación
      const canAssign = await permissionService.puedeAsignarRol(adminId, options.targetRoleId);
      if (!canAssign) {
        return {
          success: false,
          error: 'Permiso insuficiente para asignar este rol'
        };
      }

      // Obtener rol anterior (si existe) para auditoría
      const previousRole = await obtenerRolUsuario(options.targetUserId);

      // Ejecutar asignación mediante función PostgreSQL para garantizar atomicidad
      const { data: assignmentResult, error: assignmentError } = await supabase.rpc('cambiar_rol_usuario', {
        admin_id: adminId,
        target_user_id: options.targetUserId,
        nuevo_rol_id: options.targetRoleId,
        razon: options.reason || 'asignacion_manual'
      });

      if (assignmentError) {
        console.error('Error al asignar rol:', assignmentError);
        return {
          success: false,
          error: `Error al asignar el rol: ${assignmentError.message}`
        };
      }

      // Registrar en auditoría de cambios
      const { data: auditLog, error: auditError } = await supabase
        .from('auditoria_cambios_rol')
        .insert({
          usuario_id: options.targetUserId,
          rol_anterior: previousRole?.name || null,
          rol_nuevo: (await this.getRoleInfo(options.targetRoleId))?.name || null,
          realizado_por: adminId,
          razon: options.reason || 'asignacion_manual',
          ip_address: options.ipAddress || null,
          user_agent: options.userAgent || null,
          request_metadata: {
            ...options.metadata,
            path: '/api/roles/assign',
            method: 'POST',
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (auditError) {
        console.error('Error al registrar auditoría:', auditError);
        // No fallar la asignación si la auditoría falla, pero registrar el error
        console.warn('Advertencia: Auditoría no registrada para asignación exitosa');
      }

      // Obtener información completa para la respuesta
      const userInfo = await this.getUserInfo(options.targetUserId);
      const roleInfo = await this.getRoleInfo(options.targetRoleId);

      return {
        success: true,
        auditLogId: auditLog?.id,
        data: {
          userId: options.targetUserId,
          roleId: options.targetRoleId,
          roleName: roleInfo?.name || '',
          assignedBy: adminId,
          assignedAt: new Date().toISOString(),
          reason: options.reason || 'asignacion_manual'
        }
      };

    } catch (error) {
      console.error('Error crítico en asignación de rol:', error);
      return {
        success: false,
        error: 'Error interno del servidor al asignar rol'
      };
    }
  }

  /**
   * Obtiene roles disponibles para asignación según el nivel del administrador
   * @param adminId ID del administrador
   * @returns Promise<Array<{ id: string; name: string; level: number }>>
   */
  async getAvailableRoles(adminId: string): Promise<Array<{ id: string; name: string; level: number }>> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .rpc('obtener_roles_disponibles_para_asignacion', {
          admin_id: adminId
        });

      return data || [];
    } catch (error) {
      console.error('Error al obtener roles disponibles:', error);
      return [];
    }
  }

  /**
   * Obtiene usuarios sin roles asignados
   * @returns Promise<Array<{ id: string; email: string; full_name: string }>>
   */
  async getUsersWithoutRoles(): Promise<Array<{ id: string; email: string; full_name: string }>> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .not('id', 'in', `(SELECT user_id FROM user_roles)`)
        .order('created_at');

      return data || [];
    } catch (error) {
      console.error('Error al obtener usuarios sin roles:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las asignaciones de roles con información detallada
   * @param limit Límite de registros (por defecto 100)
   * @param offset Desplazamiento para paginación
   * @returns Promise<Array<{
   *   id: string;
   *   user_id: string;
   *   role_id: string;
   *   assigned_by: string;
   *   assigned_at: string;
   *   razon: string;
   *   user_email: string;
   *   user_name: string;
   *   role_name: string;
   *   role_level: number;
   * }>>
   */
  async getAllAssignments(limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role_id,
          assigned_by,
          assigned_at,
          razon,
          profiles!user_roles_user_id_fkey(email, full_name) as user_info,
          roles!inner(name, level)
        `)
        .order('assigned_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return data?.map(assignment => ({
        id: assignment.id,
        user_id: assignment.user_id,
        role_id: assignment.role_id,
        assigned_by: assignment.assigned_by,
        assigned_at: assignment.assigned_at,
        razon: assignment.razon,
        user_email: assignment.user_info?.email,
        user_name: assignment.user_info?.full_name,
        role_name: assignment.roles?.name,
        role_level: assignment.roles?.level
      })) || [];
    } catch (error) {
      console.error('Error al obtener asignaciones de roles:', error);
      return [];
    }
  }
}

// Instancia global para uso en toda la aplicación
export const roleAssignmentService = new RoleAssignmentService();

/**
 * Función auxiliar para obtener rol de usuario (importada desde permissions.ts)
 */
async function obtenerRolUsuario(userId: string): Promise<Role | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles!inner (
          id,
          name,
          description,
          level
        )
      `)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.roles;
  } catch (error) {
    console.error('Error al obtener rol:', error);
    return null;
  }
}