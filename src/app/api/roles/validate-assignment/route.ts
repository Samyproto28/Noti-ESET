import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { roleAssignmentService, type HierarchyValidationResult } from '@/lib/roleAssignment';
import { z } from 'zod';

// Esquema de validación para parámetros
const validationSchema = z.object({
  admin_id: z.string().uuid(),
  target_user_id: z.string().uuid(),
  target_role_id: z.string().uuid().optional()
});

/**
 * GET /api/roles/validate-assignment
 * Valida si una asignación de rol es permitida sin ejecutarla
 * Requiere: users.read (Admin+) o roles.read (Admin+)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user } = await supabase.auth.getUser();

    // Verificar autenticación
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permiso para leer usuarios o roles
    const tienePermisoUsuarios = await supabase.rpc('verificar_permiso', {
      user_id: user.id,
      resource: 'users',
      action: 'read'
    });

    const tienePermisoRoles = await supabase.rpc('verificar_permiso', {
      user_id: user.id,
      resource: 'roles',
      action: 'read'
    });

    if (tienePermisoUsuarios !== true && tienePermisoRoles !== true) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Se requieren permisos de usuarios o roles' },
        { status: 403 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const validatedParams = validationSchema.parse({
      admin_id: searchParams.get('admin_id') || user.id,
      target_user_id: searchParams.get('target_user_id'),
      target_role_id: searchParams.get('target_role_id')
    });

    // Validación 1: Prevenir auto-asignación
    if (validatedParams.admin_id === validatedParams.target_user_id) {
      return NextResponse.json({
        success: false,
        validations: {
          can_self_assign: false,
          reason: 'No puedes asignarte roles a ti mismo'
        }
      });
    }

    // Validación 2: Verificar si el usuario ya tiene rol
    const hasExistingRole = await roleAssignmentService.userHasRole(validatedParams.target_user_id);
    if (hasExistingRole) {
      return NextResponse.json({
        success: false,
        validations: {
          user_has_role: false,
          reason: 'El usuario ya tiene un rol asignado'
        }
      });
    }

    let hierarchyValidation: HierarchyValidationResult | null = null;
    let canAssignSpecificRole = false;

    // Si se especifica un rol específico, validar jerarquía
    if (validatedParams.target_role_id) {
      hierarchyValidation = await roleAssignmentService.validateHierarchy(
        validatedParams.admin_id,
        validatedParams.target_role_id
      );

      canAssignSpecificRole = hierarchyValidation.canAssign;

      if (!canAssignSpecificRole) {
        return NextResponse.json({
          success: false,
          validations: {
            hierarchy_valid: false,
            reason: hierarchyValidation.reason,
            admin_level: hierarchyValidation.adminLevel,
            target_level: hierarchyValidation.targetLevel,
            error: hierarchyValidation.error
          }
        });
      }

      // Verificar permiso específico para el rol
      const specificPermissionCheck = await supabase.rpc('verificar_permiso', {
        user_id: validatedParams.admin_id,
        resource: 'roles',
        action: 'manage'
      });

      if (specificPermissionCheck !== true) {
        return NextResponse.json({
          success: false,
          validations: {
            has_permission: false,
            reason: 'Permiso insuficiente para asignar roles específicos'
          }
        });
      }
    }

    // Obtener información para la respuesta
    const userInfo = await roleAssignmentService.getUserInfo(validatedParams.target_user_id);
    const availableRoles = validatedParams.target_role_id ? null :
      await roleAssignmentService.getAvailableRoles(validatedParams.admin_id);

    return NextResponse.json({
      success: true,
      validations: {
        can_self_assign: true,
        user_has_role: true,
        hierarchy_valid: !validatedParams.target_role_id || hierarchyValidation?.canAssign,
        has_permission: true,
        admin_level: hierarchyValidation?.adminLevel,
        target_level: hierarchyValidation?.targetLevel
      },
      data: {
        target_user: {
          id: validatedParams.target_user_id,
          email: userInfo?.email,
          full_name: userInfo?.full_name
        },
        available_roles: availableRoles || [],
        assigned_role: validatedParams.target_role_id ? {
          id: validatedParams.target_role_id,
          ...await roleAssignmentService.getRoleInfo(validatedParams.target_role_id)
        } : null
      },
      message: 'La asignación es válida según las validaciones preliminares'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error en GET /api/roles/validate-assignment:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roles/validate-assignment
 * Valida una asignación específica con datos en el cuerpo
 * Requiere: users.manage (Admin+) o roles.manage (Superadmin)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user } = await supabase.auth.getUser();

    // Verificar autenticación
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos para asignación
    const tienePermisoUsuarios = await supabase.rpc('verificar_permiso', {
      user_id: user.id,
      resource: 'users',
      action: 'manage'
    });

    const tienePermisoRoles = await supabase.rpc('verificar_permiso', {
      user_id: user.id,
      resource: 'roles',
      action: 'manage'
    });

    if (tienePermisoUsuarios !== true && tienePermisoRoles !== true) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Se requieren permisos de gestión de usuarios o roles' },
        { status: 403 }
      );
    }

    // Obtener datos del cuerpo
    const body = await req.json();
    const validatedData = validationSchema.parse({
      admin_id: body.admin_id || user.id,
      target_user_id: body.target_user_id,
      target_role_id: body.target_role_id
    });

    // Realizar todas las validaciones
    const validations: any = {
      self_assignment: await this.validateSelfAssignment(validatedData.admin_id, validatedData.target_user_id),
      existing_role: await this.validateExistingRole(validatedData.target_user_id),
      hierarchy: null,
      specific_permission: false,
      admin_permissions: null
    };

    let overallSuccess = validations.self_assignment.valid && validations.existing_role.valid;

    // Si se especifica un rol, validar jerarquía y permisos
    if (validatedData.target_role_id && overallSuccess) {
      validations.hierarchy = await roleAssignmentService.validateHierarchy(
        validatedData.admin_id,
        validatedData.target_role_id
      );

      validations.specific_permission = await supabase.rpc('verificar_permiso', {
        user_id: validatedData.admin_id,
        resource: 'roles',
        action: 'manage'
      }) === true;

      overallSuccess = overallSuccess && validations.hierarchy.canAssign && validations.specific_permission;
    }

    // Verificar permisos generales del administrador
    validations.admin_permissions = {
      can_assign_roles: await supabase.rpc('verificar_permiso', {
        user_id: validatedData.admin_id,
        resource: 'roles',
        action: 'manage'
      }) === true,
      can_manage_users: await supabase.rpc('verificar_permiso', {
        user_id: validatedData.admin_id,
        resource: 'users',
        action: 'manage'
      }) === true
    };

    overallSuccess = overallSuccess && validations.admin_permissions.can_assign_roles;

    // Obtener información adicional para la respuesta
    const additionalInfo: any = {};

    if (validatedData.target_user_id) {
      additionalInfo.target_user = await roleAssignmentService.getUserInfo(validatedData.target_user_id);
    }

    if (validatedData.target_role_id) {
      additionalInfo.target_role = await roleAssignmentService.getRoleInfo(validatedData.target_role_id);
    }

    if (overallSuccess && !validatedData.target_role_id) {
      additionalInfo.available_roles = await roleAssignmentService.getAvailableRoles(validatedData.admin_id);
    }

    return NextResponse.json({
      success: overallSuccess,
      validations,
      data: additionalInfo,
      message: overallSuccess ?
        'La asignación es válida y puede proceder' :
        'La asignación no cumple con los requisitos de validación'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error en POST /api/roles/validate-assignment:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Funciones auxiliaares para validaciones específicas
async function validateSelfAssignment(adminId: string, targetUserId: string): Promise<{ valid: boolean; reason?: string }> {
  if (adminId === targetUserId) {
    return { valid: false, reason: 'No puedes asignarte roles a ti mismo' };
  }
  return { valid: true };
}

async function validateExistingRole(userId: string): Promise<{ valid: boolean; reason?: string }> {
  const hasRole = await roleAssignmentService.userHasRole(userId);
  if (hasRole) {
    return { valid: false, reason: 'El usuario ya tiene un rol asignado' };
  }
  return { valid: true };
}