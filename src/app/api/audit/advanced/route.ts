import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { permissionService } from '@/lib/permissions';
import { auditService, type AuditLogFilter } from '@/lib/auditService';
import { z } from 'zod';

// Esquemas de validación
const advancedAuditSchema = z.object({
  action: z.enum(['search', 'statistics', 'export', 'detail', 'dashboard']),
  search: z.string().optional(),
  filters: z.object({
    usuario_id: z.string().uuid().optional(),
    desde: z.string().datetime().optional(),
    hasta: z.string().datetime().optional(),
    limite: z.number().int().min(1).max(1000).default(100),
    pagina: z.number().int().min(1).default(1),
    rol_anterior: z.string().optional(),
    rol_nuevo: z.string().optional(),
    realizado_por: z.string().uuid().optional(),
    razon: z.string().optional()
  }).optional(),
  export_format: z.enum(['csv', 'json']).optional().default('csv')
}).refine(data => {
  if (data.action === 'search' && !data.search) {
    return false;
  }
  return true;
}, {
  message: "Se requiere un término de búsqueda para la acción 'search'",
  path: ["search"]
});

/**
 * POST /api/audit/advanced
 * Endpoint avanzado de auditoría con múltiples acciones
 * Requiere: audit.read (Admin+)
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

    // Verificar permiso de auditoría
    const tienePermiso = await permissionService.verificarPermiso(
      user.id,
      'audit',
      'read'
    );

    if (!tienePermiso) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Admin puede ver auditoría' },
        { status: 403 }
      );
    }

    // Obtener y validar datos del cuerpo
    const body = await req.json();
    const validatedData = advancedAuditSchema.parse(body);

    const { action, search, filters = {}, export_format } = validatedData;

    // Construir filtros base
    const auditFilters: AuditLogFilter = {
      ...filters,
      limite: filters.limite,
      pagina: filters.pagina
    };

    switch (action) {
      case 'search':
        // Búsqueda avanzada de logs
        const searchResults = await auditService.searchAuditLogs(search!, auditFilters);

        return NextResponse.json({
          success: true,
          data: {
            logs: searchResults,
            total: searchResults.length,
            search_term: search,
            filters_applied: auditFilters
          },
          message: `Búsqueda completada: ${searchResults.length} resultados encontrados`
        });

      case 'statistics':
        // Estadísticas detalladas de auditoría
        const statistics = await auditService.getAuditStatistics(user.id);

        return NextResponse.json({
          success: true,
          data: statistics,
          message: 'Estadísticas de auditoría obtenidas exitosamente'
        });

      case 'export':
        // Exportación de logs
        try {
          const exportedData = await auditService.exportAuditLogs(auditFilters, export_format!);

          return new Response(exportedData, {
            headers: {
              'Content-Type': export_format === 'csv' ? 'text/csv' : 'application/json',
              'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.${export_format}"`
            }
          });
        } catch (error) {
          console.error('Error en exportación:', error);
          return NextResponse.json(
            { error: 'Error al exportar los logs de auditoría' },
            { status: 500 }
          );
        }

      case 'detail':
        // Obtener detalle de un log específico
        if (!filters.id) {
          return NextResponse.json(
            { error: 'ID de log requerido para obtener detalle' },
            { status: 400 }
          );
        }

        const logDetail = await auditService.getAuditLogDetail(filters.id);

        if (!logDetail) {
          return NextResponse.json(
            { error: 'Registro de auditoría no encontrado' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: logDetail,
          message: 'Detalle del registro de auditoría obtenido exitosamente'
        });

      case 'dashboard':
        // Dashboard de actividades
        const dashboard = await auditService.getActivityDashboard(user.id);

        return NextResponse.json({
          success: true,
          data: dashboard,
          message: 'Dashboard de actividades obtenido exitosamente'
        });

      default:
        return NextResponse.json(
          { error: 'acción no soportada' },
          { status: 400 }
        );

    }

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

    console.error('Error en POST /api/audit/advanced:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit/advanced
 * Obtiene información general del sistema de auditoría
 * Requiere: audit.read (Admin+)
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

    // Verificar permiso de auditoría
    const tienePermiso = await supabase.rpc('verificar_permiso', {
      user_id: user.id,
      resource: 'audit',
      action: 'read'
    });

    if (tienePermiso !== true) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Admin puede ver auditoría' },
        { status: 403 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'info';
    const userId = searchParams.get('user_id');
    const exportFormat = searchParams.get('format') || 'json';

    switch (action) {
      case 'info':
        // Información general del sistema de auditoría
        const [totalLogs, uniqueUsers, recentActivity] = await Promise.all([
          supabase.from('auditoria_cambios_rol').select('id', { count: 'exact' }),
          supabase.from('auditoria_cambios_rol').select('usuario_id', { count: 'exact', head: true }),
          supabase.from('auditoria_cambios_rol')
            .select('timestamp')
            .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .select('timestamp', { count: 'exact' })
        ]);

        return NextResponse.json({
          success: true,
          data: {
            sistema_auditoria: {
              tabla: 'auditoria_cambios_rol',
              total_registros: totalLogs.count || 0,
              usuarios_unicos: uniqueUsers.count || 0,
              actividad_24h: recentActivity.count || 0,
              fecha_inicio: '2024-01-01T00:00:00.000Z' // Fecha aproximada de inicio
            },
            capacidades: {
              busqueda_avanzada: true,
              estadisticas_detalladas: true,
              exportacion_csv_json: true,
              dashboard_interactivo: true,
              filtros_complejos: true
            },
            endpoints_disponibles: [
              '/api/audit/advanced (POST)',
              '/api/audit/advanced?action=info (GET)',
              '/api/audit/roles (GET/POST)',
              '/api/audit/statistics (GET)'
            ]
          },
          message: 'Información del sistema de auditoría obtenida exitosamente'
        });

      case 'statistics':
        // Estadísticas rápidas
        const statistics = await auditService.getAuditStatistics(userId);
        return NextResponse.json({
          success: true,
          data: statistics,
          message: 'Estadísticas rápidas obtenidas'
        });

      case 'export':
        // Exportación vía GET
        const exportFilters: AuditLogFilter = {
          desde: searchParams.get('desde') as string,
          hasta: searchParams.get('hasta') as string,
          limite: parseInt(searchParams.get('limite') || '10000')
        };

        const exportedData = await auditService.exportAuditLogs(exportFilters, exportFormat as 'csv' | 'json');

        return new Response(exportedData, {
          headers: {
            'Content-Type': exportFormat === 'csv' ? 'text/csv' : 'application/json',
            'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.${exportFormat}"`
          }
        });

      default:
        return NextResponse.json(
          { error: 'acción no soportada' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error en GET /api/audit/advanced:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}