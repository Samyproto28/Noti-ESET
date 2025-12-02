import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import { permissionService } from '@/lib/permissions';
import { securityMiddleware } from '@/lib/securityMiddleware';

// Esquemas de validación
const createRoleSchema = z.object({
  name: z.enum(['estudiante', 'moderador', 'admin', 'superadmin']),
  description: z.string().max(500).optional(),
  level: z.number().int().min(1).max(4).optional()
});

const updateRoleSchema = z.object({
  name: z.enum(['estudiante', 'moderador', 'admin', 'superadmin']).optional(),
  description: z.string().max(500).optional(),
  level: z.number().int().min(1).max(4).optional()
});

const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  razon: z.string().max(200).optional()
});

/**
 * GET /api/roles
 * Obtiene todos los roles disponibles
 * Requiere: role.read (Admin+)
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

    // Aplicar middleware de seguridad para validación de acceso
    const securityValidation = await securityMiddleware.validateAccess(
      user.id,
      'roles',
      'read',
      {
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        metadata: {
          path: req.nextUrl.pathname,
          method: req.method,
          query: Object.fromEntries(req.nextUrl.searchParams)
        }
      }
    );

    // Si el acceso es bloqueado por seguridad, denegar inmediatamente
    if (securityValidation.blocked) {
      return NextResponse.json(
        {
          error: 'Acceso bloqueado por medidas de seguridad',
          reason: securityValidation.reason,
          suspicious: securityValidation.suspicious,
          alert_required: securityValidation.alertRequired
        },
        { status: 403 }
      );
    }

    // Si el acceso no está permitido por permisos, verificar si es sospechoso
    if (!securityValidation.allowed) {
      return NextResponse.json(
        {
          error: 'Permiso insuficiente',
          reason: securityValidation.reason,
          suspicious: securityValidation.suspicious,
          alert_required: securityValidation.alertRequired
        },
        { status: 403 }
      );
    }

    // Obtener roles con sus permisos
    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        id,
        name,
        description,
        level,
        created_at,
        role_permissions (
          permissions (
            id,
            name,
            resource,
            action
          )
        )
      `)
      .order('level');

    if (error) {
      console.error('Error al obtener roles:', error);
      return NextResponse.json(
        { error: 'Error al obtener roles' },
        { status: 500 }
      );
    }

    // Formatear respuesta
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      level: role.level,
      created_at: role.created_at,
      permissions: role.role_permissions.map(rp => rp.permissions)
    }));

    return NextResponse.json({
      success: true,
      data: formattedRoles,
      total: formattedRoles.length
    });

  } catch (error) {
    console.error('Error en GET /api/roles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/roles
 * Crea un nuevo rol
 * Requiere: roles.manage (Superadmin)
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

    // Verificar permiso de creación de roles (solo Superadmin)
    const tienePermiso = await permissionService.verificarPermiso(
      user.id,
      'roles',
      'manage'
    );

    if (!tienePermiso) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Superadmin puede crear roles' },
        { status: 403 }
      );
    }

    // Validar cuerpo de la request
    const body = await req.json();
    const validatedData = createRoleSchema.parse(body);

    // Verificar si el rol ya existe
    const { data: existingRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', validatedData.name)
      .single();

    if (existingRole) {
      return NextResponse.json(
        { error: 'El rol ya existe' },
        { status: 400 }
      );
    }

    // Crear el rol
    const { data: newRole, error: insertError } = await supabase
      .from('roles')
      .insert({
        name: validatedData.name,
        description: validatedData.description,
        level: validatedData.level
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al crear rol:', insertError);
      return NextResponse.json(
        { error: 'Error al crear el rol' },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabase.from('auditoria_cambios_rol').insert({
      usuario_id: user.id,
      rol_anterior: null,
      rol_nuevo: validatedData.name,
      realizado_por: user.id,
      razon: 'creacion_rol',
      request_metadata: {
        path: req.nextUrl.pathname,
        method: req.method,
        ip: req.ip,
        user_agent: req.headers.get('user-agent')
      }
    });

    return NextResponse.json({
      success: true,
      data: newRole,
      message: 'Rol creado exitosamente'
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

    console.error('Error en POST /api/roles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/roles
 * Actualiza uno o varios roles
 * Requiere: roles.manage (Superadmin)
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user } = await supabase.auth.getUser();
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('id');

    // Verificar autenticación
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permiso de actualización de roles (solo Superadmin)
    const tienePermiso = await permissionService.verificarPermiso(
      user.id,
      'roles',
      'manage'
    );

    if (!tienePermiso) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Superadmin puede actualizar roles' },
        { status: 403 }
      );
    }

    // Validar cuerpo de la request
    const body = await req.json();
    const validatedData = updateRoleSchema.parse(body);

    if (!roleId) {
      return NextResponse.json(
        { error: 'ID de rol requerido' },
        { status: 400 }
      );
    }

    // Verificar si el rol existe
    const { data: existingRole } = await supabase
      .from('roles')
      .select('name, level')
      .eq('id', roleId)
      .single();

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el rol
    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update(validatedData)
      .eq('id', roleId)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar rol:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el rol' },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabase.from('auditoria_cambios_rol').insert({
      usuario_id: user.id,
      rol_anterior: existingRole.name,
      rol_nuevo: validatedData.name || existingRole.name,
      realizado_por: user.id,
      razon: 'actualizacion_rol',
      request_metadata: {
        path: req.nextUrl.pathname,
        method: req.method,
        ip: req.ip,
        user_agent: req.headers.get('user-agent'),
        changes: validatedData
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedRole,
      message: 'Rol actualizado exitosamente'
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

    console.error('Error en PUT /api/roles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/roles
 * Elimina un rol
 * Requiere: roles.manage (Superadmin)
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user } = await supabase.auth.getUser();
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('id');

    // Verificar autenticación
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permiso de eliminación de roles (solo Superadmin)
    const tienePermiso = await permissionService.verificarPermiso(
      user.id,
      'roles',
      'manage'
    );

    if (!tienePermiso) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Superadmin puede eliminar roles' },
        { status: 403 }
      );
    }

    if (!roleId) {
      return NextResponse.json(
        { error: 'ID de rol requerido' },
        { status: 400 }
      );
    }

    // Verificar si el rol existe
    const { data: existingRole } = await supabase
      .from('roles')
      .select('name, level')
      .eq('id', roleId)
      .single();

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    // No permitir eliminar roles con usuarios asignados
    const { data: usersWithRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_id', roleId);

    if (usersWithRole && usersWithRole.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar un rol con usuarios asignados',
          users_affected: usersWithRole.length
        },
        { status: 400 }
      );
    }

    // Eliminar el rol (las restriccionesCASCADE eliminarán los permisos asociados)
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (deleteError) {
      console.error('Error al eliminar rol:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar el rol' },
        { status: 500 }
      );
    }

    // Registrar en auditoría
    await supabase.from('auditoria_cambios_rol').insert({
      usuario_id: user.id,
      rol_anterior: existingRole.name,
      rol_nuevo: null,
      realizado_por: user.id,
      razon: 'eliminacion_rol',
      request_metadata: {
        path: req.nextUrl.pathname,
        method: req.method,
        ip: req.ip,
        user_agent: req.headers.get('user-agent'),
        deleted_role: existingRole.name
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Rol eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error en DELETE /api/roles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}