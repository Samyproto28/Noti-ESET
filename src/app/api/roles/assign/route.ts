import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import { permissionService } from '@/lib/permissions';

// Esquema de validación
const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  razon: z.string().max(200).optional().default('asignacion_manual')
});

/**
 * POST /api/roles/assign
 * Asigna un rol a un usuario específico
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

    // Obtener datos de la request
    const body = await req.json();
    const validatedData = assignRoleSchema.parse(body);

    // Verificar permiso para asignar roles
    const puedeAsignar = await permissionService.puedeAsignarRol(user.id, validatedData.role_id);

    if (!puedeAsignar) {
      return NextResponse.json(
        { error: 'Permiso insuficiente para asignar este rol' },
        { status: 403 }
      );
    }

    // Verificar si el usuario ya tiene un rol asignado
    const { data: existingAssignment } = await supabase
      .from('user_roles')
      .select('id, role_id')
      .eq('user_id', validatedData.user_id)
      .single();

    if (existingAssignment) {
      return NextResponse.json(
        {
          error: 'El usuario ya tiene un rol asignado',
          existing_role_id: existingAssignment.role_id
        },
        { status: 400 }
      );
    }

    // Verificar si el rol existe
    const { data: targetRole } = await supabase
      .from('roles')
      .select('name, level')
      .eq('id', validatedData.role_id)
      .single();

    if (!targetRole) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    // Obtener rol actual del administrador para auditoría
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role_id, roles!inner(name)')
      .eq('user_id', user.id)
      .single();

    // Verificar jerarquía de roles: Admin no puede asignar roles de nivel igual o superior
    const adminLevel = adminRole?.roles?.level || 0;
    const targetLevel = targetRole.level;

    if (adminLevel < 4 && targetLevel >= adminLevel) {
      return NextResponse.json(
        {
          error: 'No puedes asignar roles de nivel igual o superior al tuyo',
          admin_level: adminLevel,
          target_level: targetLevel
        },
        { status: 403 }
      );
    }

    // Prevenir auto-asignación
    if (user.id === validatedData.user_id) {
      return NextResponse.json(
        { error: 'No puedes asignarte roles a ti mismo' },
        { status: 400 }
      );
    }

    // Ejecutar la asignación de rol usando la función PostgreSQL
    const { error: assignmentError } = await supabase.rpc('cambiar_rol_usuario', {
      admin_id: user.id,
      target_user_id: validatedData.user_id,
      nuevo_rol_id: validatedData.role_id,
      razon: validatedData.razon
    });

    if (assignmentError) {
      console.error('Error al asignar rol:', assignmentError);
      return NextResponse.json(
        { error: 'Error al asignar el rol', details: assignmentError.message },
        { status: 500 }
      );
    }

    // Obtener información del usuario afectado para la respuesta
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', validatedData.user_id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        user_id: validatedData.user_id,
        email: targetUser?.email,
        full_name: targetUser?.full_name,
        role_id: validatedData.role_id,
        role_name: targetRole.name,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        razon: validatedData.razon
      },
      message: 'Rol asignado exitosamente'
    }, { status: 201 });

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

    console.error('Error en POST /api/roles/assign:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/roles/assign
 * Obtiene usuarios sin roles asignados y roles disponibles para asignación
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
    const tienePermisoUsuarios = await permissionService.verificarPermiso(
      user.id,
      'users',
      'read'
    );

    const tienePermisoRoles = await permissionService.verificarPermiso(
      user.id,
      'roles',
      'read'
    );

    if (!tienePermisoUsuarios && !tienePermisoRoles) {
      return NextResponse.json(
        { error: 'Permiso insuficiente' },
        { status: 403 }
      );
    }

    // Obtener usuarios sin roles asignados
    const { data: usersWithoutRoles } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .not('id', 'in', `(SELECT user_id FROM user_roles)`)
      .order('created_at');

    // Obtener roles disponibles para asignación según el nivel del admin
    const { data: availableRoles } = await supabase
      .rpc('obtener_roles_disponibles_para_asignacion', {
        admin_id: user.id
      });

    // Obtener usuarios con roles (para referencia)
    const { data: usersWithRoles } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        assigned_by,
        assigned_at,
        razon,
        profiles!inner(email, full_name),
        roles!inner(name, level)
      `)
      .order('assigned_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        users_without_roles: usersWithoutRoles || [],
        available_roles: availableRoles || [],
        users_with_roles: usersWithRoles || []
      },
      totals: {
        users_without_roles: usersWithoutRoles?.length || 0,
        available_roles: availableRoles?.length || 0,
        users_with_roles: usersWithRoles?.length || 0
      }
    });

  } catch (error) {
    console.error('Error en GET /api/roles/assign:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}