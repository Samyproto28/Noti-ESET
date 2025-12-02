import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { roleAssignmentService } from '@/lib/roleAssignment';
import { z } from 'zod';

// Esquema de validación para asignación por lotes
const batchAssignSchema = z.object({
  assignments: z.array(z.object({
    target_user_id: z.string().uuid(),
    target_role_id: z.string().uuid(),
    reason: z.string().max(200).optional().default('asignacion_por_lotes')
  })),
  admin_id: z.string().uuid(),
  metadata: z.record(z.any()).optional()
}).refine(data => data.assignments.length > 0, {
  message: 'Debe proporcionar al menos una asignación'
}).refine(data => data.assignments.length <= 50, {
  message: 'Máximo 50 asignaciones por lote'
});

/**
 * POST /api/roles/batch-assign
 * Asigna roles múltiples usuarios en una operación atómica
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

    // Verificar permiso de asignación de roles (solo Superadmin)
    const tienePermiso = await supabase.rpc('verificar_permiso', {
      user_id: user.id,
      resource: 'roles',
      action: 'manage'
    });

    if (tienePermiso !== true) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Superadmin puede asignar roles por lotes' },
        { status: 403 }
      );
    }

    // Obtener y validar datos del cuerpo
    const body = await req.json();
    const validatedData = batchAssignSchema.parse(body);

    const { admin_id, assignments, metadata } = validatedData;

    // Verificar que el admin_id coincida con el usuario autenticado (por seguridad)
    if (admin_id !== user.id) {
      return NextResponse.json(
        { error: 'ID de administrador no coincide con el usuario autenticado' },
        { status: 403 }
      );
    }

    // Pre-validar todas las asignaciones antes de ejecutar
    const preValidationResults: Array<{
      index: number;
      target_user_id: string;
      target_role_id: string;
      valid: boolean;
      reason?: string;
    }> = [];

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];

      // Validación 1: Prevenir auto-asignación
      if (admin_id === assignment.target_user_id) {
        preValidationResults.push({
          index: i,
          target_user_id: assignment.target_user_id,
          target_role_id: assignment.target_role_id,
          valid: false,
          reason: 'No puedes asignarte roles a ti mismo'
        });
        continue;
      }

      // Validación 2: Verificar si el usuario ya tiene rol
      const hasExistingRole = await roleAssignmentService.userHasRole(assignment.target_user_id);
      if (hasExistingRole) {
        preValidationResults.push({
          index: i,
          target_user_id: assignment.target_user_id,
          target_role_id: assignment.target_role_id,
          valid: false,
          reason: 'El usuario ya tiene un rol asignado'
        });
        continue;
      }

      // Validación 3: Verificar jerarquía de roles
      const hierarchyValidation = await roleAssignmentService.validateHierarchy(
        admin_id,
        assignment.target_role_id
      );

      if (!hierarchyValidation.canAssign) {
        preValidationResults.push({
          index: i,
          target_user_id: assignment.target_user_id,
          target_role_id: assignment.target_role_id,
          valid: false,
          reason: hierarchyValidation.reason || hierarchyValidation.error
        });
        continue;
      }

      preValidationResults.push({
        index: i,
        target_user_id: assignment.target_user_id,
        target_role_id: assignment.target_role_id,
        valid: true
      });
    }

    // Separar asignaciones válidas e inválidas
    const validAssignments = assignments.filter((_, index) =>
      preValidationResults[index].valid
    );
    const invalidAssignments = preValidationResults.filter(result => !result.valid);

    if (validAssignments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay asignaciones válidas para ejecutar',
        pre_validation: {
          total_assignments: assignments.length,
          valid_assignments: 0,
          invalid_assignments: assignments.length,
          errors: invalidAssignments.map(result => ({
            index: result.index,
            target_user_id: result.target_user_id,
            target_role_id: result.target_role_id,
            reason: result.reason
          }))
        }
      }, { status: 400 });
    }

    // Ejecutar asignaciones en transacción usando múltiples llamadas RPC
    const supabaseAdmin = await createClient();

    // Iniciar transacción explícita
    const { data: transaction, error: transactionError } = await supabaseAdmin.rpc('begin_transaction');

    if (transactionError) {
      console.error('Error al iniciar transacción:', transactionError);
      return NextResponse.json(
        { error: 'Error al iniciar transacción de base de datos' },
        { status: 500 }
      );
    }

    const results: Array<{
      index: number;
      target_user_id: string;
      target_role_id: string;
      success: boolean;
      audit_log_id?: string;
      error?: string;
    }> = [];

    try {
      // Ejecutar cada asignación en la transacción
      for (let i = 0; i < validAssignments.length; i++) {
        const assignment = validAssignments[i];
        const originalIndex = assignments.findIndex(a =>
          a.target_user_id === assignment.target_user_id &&
          a.target_role_id === assignment.target_role_id
        );

        try {
          const result = await supabaseAdmin.rpc('cambiar_rol_usuario', {
            admin_id: admin_id,
            target_user_id: assignment.target_user_id,
            nuevo_rol_id: assignment.target_role_id,
            razon: assignment.reason
          });

          // Registrar en auditoría
          const userInfo = await roleAssignmentService.getUserInfo(assignment.target_user_id);
          const roleInfo = await roleAssignmentService.getRoleInfo(assignment.target_role_id);
          const previousRole = await roleAssignmentService.obtenerRolUsuario(assignment.target_user_id);

          const { data: auditLog, error: auditError } = await supabaseAdmin
            .from('auditoria_cambios_rol')
            .insert({
              usuario_id: assignment.target_user_id,
              rol_anterior: previousRole?.name || null,
              rol_nuevo: roleInfo?.name || null,
              realizado_por: admin_id,
              razon: assignment.reason,
              ip_address: req.ip || null,
              user_agent: req.headers.get('user-agent') || null,
              request_metadata: {
                ...metadata,
                batch_operation: true,
                batch_index: i,
                total_in_batch: validAssignments.length,
                path: req.nextUrl.pathname,
                method: req.method,
                timestamp: new Date().toISOString()
              }
            })
            .select()
            .single();

          results.push({
            index: originalIndex,
            target_user_id: assignment.target_user_id,
            target_role_id: assignment.target_role_id,
            success: true,
            audit_log_id: auditLog?.id
          });

        } catch (error) {
          console.error(`Error en asignación ${i}:`, error);
          results.push({
            index: originalIndex,
            target_user_id: assignment.target_user_id,
            target_role_id: assignment.target_role_id,
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      // Commit de la transacción si todas las operaciones fueron exitosas
      const allSuccessful = results.every(r => r.success);

      if (allSuccessful) {
        const { error: commitError } = await supabaseAdmin.rpc('commit_transaction');
        if (commitError) {
          throw new Error(`Error al hacer commit de transacción: ${commitError.message}`);
        }
      } else {
        // Rollback en caso de errores
        await supabaseAdmin.rpc('rollback_transaction');
      }

    } catch (error) {
      // Rollback en caso de error inesperado
      await supabaseAdmin.rpc('rollback_transaction');
      throw error;
    }

    // Resumir resultados
    const successfulAssignments = results.filter(r => r.success);
    const failedAssignments = results.filter(r => !r.success);

    return NextResponse.json({
      success: allSuccessful && failedAssignments.length === 0,
      transaction_executed: true,
      pre_validation: {
        total_assignments: assignments.length,
        valid_assignments: validAssignments.length,
        invalid_assignments: invalidAssignments.length,
        errors: invalidAssignments.map(result => ({
          index: result.index,
          target_user_id: result.target_user_id,
          target_role_id: result.target_role_id,
          reason: result.reason
        }))
      },
      execution_results: {
        total_executed: validAssignments.length,
        successful: successfulAssignments.length,
        failed: failedAssignments.length,
        successful_assignments: successfulAssignments.map(r => ({
          index: r.index,
          target_user_id: r.target_user_id,
          target_role_id: r.target_role_id,
          audit_log_id: r.audit_log_id
        })),
        failed_assignments: failedAssignments.map(r => ({
          index: r.index,
          target_user_id: r.target_user_id,
          target_role_id: r.target_role_id,
          error: r.error
        }))
      },
      summary: {
        total_attempted: assignments.length,
        total_valid_executed: validAssignments.length,
        total_successful: successfulAssignments.length,
        total_failed: failedAssignments.length + invalidAssignments.length,
        message: allSuccessful ?
          'Asignación por lotes completada exitosamente' :
          'Asignación por lotes completada con algunos errores'
      }
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

    console.error('Error en POST /api/roles/batch-assign:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/roles/batch-assign
 * Obtiene información sobre operaciones por lotes disponibles
 * Requiere: roles.read (Superadmin)
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

    // Verificar permiso de lectura de roles (solo Superadmin para operaciones por lotes)
    const tienePermiso = await supabase.rpc('verificar_permiso', {
      user_id: user.id,
      resource: 'roles',
      action: 'read'
    });

    if (tienePermiso !== true) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Superadmin puede ver información de operaciones por lotes' },
        { status: 403 }
      );
    }

    // Obtener estadísticas de asignaciones
    const [usersWithoutRoles, availableRoles, totalAssignments] = await Promise.all([
      roleAssignmentService.getUsersWithoutRoles(),
      roleAssignmentService.getAvailableRoles(user.id),
      supabase
        .from('user_roles')
        .select('id', { count: 'exact' })
    ]);

    // Obtener asignaciones recientes
    const recentAssignments = await roleAssignmentService.getAllAssignments(10, 0);

    return NextResponse.json({
      success: true,
      data: {
        batch_capacity: {
          max_per_batch: 50,
          recommended_per_batch: 10,
          recommended_batch_size: 'pequeño (10-20) o mediano (20-35)'
        },
        available_users: usersWithoutRoles.length,
        available_roles: availableRoles.length,
        total_role_assignments: totalAssignments.count || 0,
        recent_assignments: recentAssignments,
        users_without_roles: usersWithoutRoles.slice(0, 5), // Mostrar solo primeros 5
        available_roles_list: availableRoles
      },
      limits: {
        maximum_batch_size: 50,
        recommended_batch_size: 20,
        cache_duration: 300, // 5 minutos
        validation_timeout: 10000 // 10 segundos
      }
    });

  } catch (error) {
    console.error('Error en GET /api/roles/batch-assign:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}