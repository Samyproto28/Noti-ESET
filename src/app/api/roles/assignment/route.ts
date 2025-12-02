import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import { withSecurity, securityEnhancer } from '@/lib/securityIntegration';
import { auditService } from '@/lib/auditService';

// Esquemas de validación mejorados
const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  razon: z.string().min(3, 'La razón debe tener al menos 3 caracteres').max(200),
  metadata: z.record(z.any()).optional()
});

const bulkAssignSchema = z.object({
  assignments: z.array(z.object({
    user_id: z.string().uuid(),
    role_id: z.string().uuid(),
    razon: z.string().min(3).max(200)
  })).min(1).max(50),
  metadata: z.record(z.any()).optional()
});

/**
 * POST /api/roles/assignment - Asignar rol individual
 * POST /api/roles/assignment/bulk - Asignar roles múltiples
 */

const handler = async (req: NextRequest, securityContext: any): Promise<NextResponse> => {
  const supabase = await createClient();
  const { user } = await supabase.auth.getUser();

  // Aplicar validación de seguridad adicional para operaciones sensibles
  if (req.method === 'POST' && req.nextUrl.pathname.endsWith('/assignment')) {
    return await handleSingleAssignment(req, user);
  } else if (req.method === 'POST' && req.nextUrl.pathname.endsWith('/assignment/bulk')) {
    return await handleBulkAssignment(req, user);
  }

  return NextResponse.json({ error: 'Método no permitido' }, { status: 405 });
};

async function handleSingleAssignment(req: NextRequest, user: any): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validatedData = assignRoleSchema.parse(body);

    const supabase = await createClient();

    // Validar jerarquía de privilegios antes de la asignación
    const privilegeValidation = await securityEnhancer.validatePrivilegeEscalation(
      user.id,
      validatedData.user_id,
      validatedData.role_id
    );

    if (!privilegeValidation.valid) {
      // Registrar intento de asignación problemática en auditoría
      await auditService.addAuditLog({
        usuario_id: user.id,
        rol_anterior: null,
        rol_nuevo: 'attempt_failed',
        realizado_por: user.id,
        razon: `Privilege escalation attempt: ${privilegeValidation.reason}`,
        ip_address: req.ip || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        request_metadata: {
          target_user_id: validatedData.user_id,
          attempted_role_id: validatedData.role_id,
          validation_result: privilegeValidation
        }
      });

      return NextResponse.json({
        error: 'Operación no permitida',
        reason: privilegeValidation.reason,
        risk_level: privilegeValidation.riskLevel,
        requires_approval: privilegeValidation.riskLevel === 'critical'
      }, { status: 403 });
    }

    // Validar que el rol existe y no está asignado previamente
    const [{ data: role }, { data: existingAssignment }] = await Promise.all([
      supabase.from('roles').select('id, name, level').eq('id', validatedData.role_id).single(),
      supabase.from('user_roles').select('id').eq('user_id', validatedData.user_id).single()
    ]);

    if (!role) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    }

    if (existingAssignment) {
      return NextResponse.json(
        {
          error: 'El usuario ya tiene un rol asignado',
          existing_role_id: existingAssignment.id
        },
        { status: 409 }
      );
    }

    // Ejecutar la asignación con transacción
    const { data: newAssignment, error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: validatedData.user_id,
        role_id: validatedData.role_id,
        assigned_by: user.id,
        razon: validatedData.razon,
        request_metadata: validatedData.metadata || {}
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al asignar rol:', insertError);
      return NextResponse.json({ error: 'Error al asignar el rol' }, { status: 500 });
    }

    // Registrar en auditoría con detalles completos
    await auditService.addAuditLog({
      usuario_id: validatedData.user_id,
      rol_anterior: null,
      rol_nuevo: role.name,
      realizado_por: user.id,
      razon: validatedData.razon,
      ip_address: req.ip || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      request_metadata: {
        assignment_id: newAssignment.id,
        role_id: validatedData.role_id,
        role_level: role.level,
        metadata: validatedData.metadata,
        privilege_validation: privilegeValidation,
        security_context: securityContext
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        assignment: newAssignment,
        role: role
      },
      message: 'Rol asignado exitosamente',
      audit_logged: true
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

    console.error('Error en asignación individual:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function handleBulkAssignment(req: NextRequest, user: any): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validatedData = bulkAssignSchema.parse(body);

    const supabase = await createClient();

    // Validar operación por lotes para riesgos de seguridad
    const bulkValidation = await securityEnhancer.validateBulkOperation(
      user.id,
      'role_assignment',
      validatedData.assignments.length,
      { metadata: validatedData.metadata }
    );

    if (!bulkValidation.valid) {
      return NextResponse.json({
        error: 'Operación por lotes no permitida',
        reason: bulkValidation.reason,
        risk_level: bulkValidation.riskLevel,
        requires_approval: bulkValidation.requiresApproval
      }, { status: 403 });
    }

    // Si requiere aprobación, denegar y registrar para revisión
    if (bulkValidation.requiresApproval) {
      await auditService.addAuditLog({
        usuario_id: user.id,
        rol_anterior: null,
        rol_nuevo: 'bulk_assignment_blocked',
        realizado_por: user.id,
        razon: `Bulk assignment blocked: ${bulkValidation.reason}`,
        ip_address: req.ip || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        request_metadata: {
          assignment_count: validatedData.assignments.length,
          bulk_validation: bulkValidation,
          assignments: validatedData.assignments,
          metadata: validatedData.metadata
        }
      });

      return NextResponse.json({
        error: 'Operación requiere aprobación manual',
        reason: bulkValidation.reason,
        risk_level: bulkValidation.riskLevel,
        requires_approval: true,
        contact_admin: 'Por favor contacta a un administrador para aprobación'
      }, { status: 403 });
    }

    // Procesar asignaciones individualmente con manejo de errores
    const results = [];
    const errors = [];

    for (const assignment of validatedData.assignments) {
      try {
        // Validar jerarquía para cada asignación
        const privilegeValidation = await securityEnhancer.validatePrivilegeEscalation(
          user.id,
          assignment.user_id,
          assignment.role_id
        );

        if (!privilegeValidation.valid) {
          errors.push({
            assignment,
            error: privilegeValidation.reason,
            risk_level: privilegeValidation.riskLevel
          });
          continue;
        }

        // Verificar si el rol ya está asignado
        const existingAssignment = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', assignment.user_id)
          .single();

        if (existingAssignment) {
          errors.push({
            assignment,
            error: 'Usuario ya tiene rol asignado',
            code: 'ROLE_ALREADY_ASSIGNED'
          });
          continue;
        }

        // Realizar la asignación
        const { data: newAssignment } = await supabase
          .from('user_roles')
          .insert({
            user_id: assignment.user_id,
            role_id: assignment.role_id,
            assigned_by: user.id,
            razon: assignment.razon,
            request_metadata: {
              bulk_operation: true,
              metadata: validatedData.metadata
            }
          })
          .select()
          .single();

        results.push({
          assignment: newAssignment,
          validation_result: privilegeValidation
        });

        // Registrar cada asignación en auditoría
        await auditService.addAuditLog({
          usuario_id: assignment.user_id,
          rol_anterior: null,
          rol_nuevo: 'bulk_assigned',
          realizado_por: user.id,
          razon: assignment.razon,
          ip_address: req.ip || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          request_metadata: {
            assignment_id: newAssignment.id,
            bulk_operation: true,
            bulk_validation: bulkValidation,
            metadata: validatedData.metadata
          }
        });

      } catch (assignmentError) {
        console.error('Error en asignación individual del bulk:', assignmentError);
        errors.push({
          assignment,
          error: 'Error en procesamiento individual',
          details: assignmentError instanceof Error ? assignmentError.message : 'Unknown error'
        });
      }
    }

    // Registrar resultado de operación en auditoría
    await auditService.addAuditLog({
      usuario_id: user.id,
      rol_anterior: null,
      rol_nuevo: 'bulk_assignment_completed',
      realizado_por: user.id,
      razon: `Bulk assignment completed: ${results.length} successful, ${errors.length} failed`,
      ip_address: req.ip || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      request_metadata: {
        operation_summary: {
          total_assignments: validatedData.assignments.length,
          successful: results.length,
          failed: errors.length
        },
        errors,
        results_count: results.length,
        bulk_validation: bulkValidation
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        completed: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors.slice(0, 10) : [] // Limitar errores a 10 para no exceder límites de respuesta
      },
      message: `Asignación por lotes completada: ${results.length} exitosas, ${errors.length} fallidas`,
      audit_logged: true
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

    console.error('Error en asignación por lotes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Exportar el manejador con seguridad mejorada
export const POST = withSecurity(handler, 'roles.manage');