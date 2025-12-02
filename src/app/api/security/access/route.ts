import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/securityMiddleware';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';
import { permissionService } from '@/lib/permissions';

// Esquema de validación para el endpoint de seguridad
const securityAccessSchema = z.object({
  resource: z.string().min(1, 'Recurso requerido'),
  action: z.string().min(1, 'Acción requerida'),
  metadata: z.object({}).optional().default({})
});

// Esquema para obtención de estadísticas de seguridad
const securityStatsSchema = z.object({
  days: z.number().int().min(1).max(30).default(7)
});

/**
 * POST /api/security/access
 * Endpoint para validar intentos de acceso y aplicar políticas de seguridad
 * Requiere: security.access (Security+)
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

    // Verificar permiso de seguridad (solo usuarios con rol de seguridad o superadmin)
    const tienePermisoSeguridad = await permissionService.verificarPermiso(
      user.id,
      'security',
      'access'
    );

    if (!tienePermisoSeguridad) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo personal de seguridad puede usar este endpoint' },
        { status: 403 }
      );
    }

    // Obtener y validar datos del cuerpo
    const body = await req.json();
    const validatedData = securityAccessSchema.parse(body);

    // Extraer información de la solicitud para análisis de seguridad
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Validar acceso con middleware de seguridad
    const securityResult = await securityMiddleware.validateAccess(
      user.id,
      validatedData.resource,
      validatedData.action,
      {
        ipAddress,
        userAgent,
        metadata: validatedData.metadata
      }
    );

    if (securityResult.blocked) {
      // Registrar intento bloqueado en auditoría de seguridad crítica
      console.warn(`Intento de acceso bloqueado para usuario ${user.id}: ${securityResult.reason}`);
      return NextResponse.json(
        {
          success: false,
          allowed: false,
          reason: securityResult.reason,
          security_level: 'blocked',
          message: 'Acceso bloqueado por políticas de seguridad'
        },
        { status: 403 }
      );
    }

    if (!securityResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          allowed: false,
          reason: securityResult.reason,
          security_level: 'denied',
          message: 'Acceso denegado',
          requires_alert: securityResult.alertRequired
        },
        { status: 403 }
      );
    }

    // Si el acceso es permitido pero sospechoso, alertar
    if (securityResult.suspicious) {
      console.warn(`Acceso sospechoso detectado para usuario ${user.id}: ${securityResult.reason}`);
    }

    return NextResponse.json({
      success: true,
      allowed: true,
      reason: securityResult.reason,
      security_level: securityResult.suspicious ? 'monitored' : 'normal',
      requires_monitoring: securityResult.suspicious,
      message: securityResult.suspicious ? 'Acceso permitido pero bajo monitoreo' : 'Acceso autorizado'
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

    console.error('Error en POST /api/security/access:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/security/access/stats
 * Obtiene estadísticas de seguridad del sistema
 * Requiere: security.read (Security+)
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

    // Verificar permiso de auditoría de seguridad
    const tienePermiso = await permissionService.verificarPermiso(
      user.id,
      'security',
      'read'
    );

    if (!tienePermiso) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo personal de seguridad puede ver estadísticas' },
        { status: 403 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'stats';
    const days = parseInt(searchParams.get('days') || '7');

    switch (action) {
      case 'stats':
        // Estadísticas generales de seguridad
        const stats = await securityMiddleware.getSecurityStats();

        return NextResponse.json({
          success: true,
          data: {
            ...stats,
            block_rate: stats.totalAttempts > 0 ? (stats.blockedAttempts / stats.totalAttempts * 100).toFixed(2) + '%' : '0%',
            timestamp: new Date().toISOString(),
            period: `Últimas 24 horas`
          },
          message: 'Estadísticas de seguridad obtenidas exitosamente'
        });

      case 'report':
        // Informe de seguridad detallado
        if (days < 1 || days > 30) {
          return NextResponse.json(
            { error: 'El período debe estar entre 1 y 30 días' },
            { status: 400 }
          );
        }

        const report = await securityMiddleware.generateSecurityReport(days);

        return NextResponse.json({
          success: true,
          data: {
            ...report,
            generated_at: new Date().toISOString()
          },
          message: `Informe de seguridad para los últimos ${days} días generado exitosamente`
        });

      case 'threats':
        // Amenazas recientes
        const { data: recentThreats } = await supabase
          .from('security_suspicious_activities')
          .select('*')
          .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp', { ascending: false })
          .limit(20);

        return NextResponse.json({
          success: true,
          data: {
            threats: recentThreats || [],
            total: recentThreats?.length || 0,
            period: 'Últimas 24 horas'
          },
          message: 'Amenazas recientes obtenidas exitosamente'
        });

      default:
        return NextResponse.json(
          { error: 'Acción no soportada' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error en GET /api/security/access:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}