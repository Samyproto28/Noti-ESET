import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from './securityMiddleware';
import { createClient } from '@/lib/supabase';
import { permissionService } from './permissions';

/**
 * Middleware de protección de seguridad para rutas sensibles
 * Aplica validación de seguridad antes de permitir el acceso a endpoints críticos
 */
export async function withSecurityProtection(
  handler: (req: NextRequest, securityContext: any) => Promise<NextResponse>,
  requiredPermissions: { resource: string; action: string }[] = []
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const supabase = await createClient();
      const { user } = await supabase.auth.getUser();

      // Verificar autenticación básica
      if (!user) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }

      // Extraer información de la solicitud
      const ipAddress = req.headers.get('x-forwarded-for') ||
                        req.headers.get('x-real-ip') ||
                        req.headers.get('cf-connecting-ip') ||
                        'unknown';

      const userAgent = req.headers.get('user-agent') || 'unknown';

      // Obtener el método HTTP y la URL
      const method = req.method;
      const url = new URL(req.url);
      const resource = url.pathname.split('/')[2] || 'unknown'; // Extraer recurso de /api/resource/action
      const action = method.toLowerCase();

      // Validar permisos básicos si se especifican
      for (const permission of requiredPermissions) {
        const hasPermission = await permissionService.verificarPermiso(
          user.id,
          permission.resource,
          permission.action
        );

        if (!hasPermission) {
          // Registrar intento de acceso denegado
          await logSecurityAttempt({
            userId: user.id,
            resource: permission.resource,
            action: permission.action,
            granted: false,
            reason: `Permiso denegado: ${permission.resource}.${permission.action}`,
            ipAddress,
            userAgent
          });

          return NextResponse.json(
            {
              error: `Permiso insuficiente para ${permission.resource}.${permission.action}`,
              security_level: 'permission_denied'
            },
            { status: 403 }
          );
        }
      }

      // Validar acceso con middleware de seguridad avanzado
      const securityResult = await securityMiddleware.validateAccess(
        user.id,
        resource,
        action,
        {
          ipAddress,
          userAgent,
          metadata: {
            path: url.pathname,
            method,
            headers: Object.fromEntries(req.headers.entries()),
            query: Object.fromEntries(url.searchParams.entries())
          }
        }
      );

      // Registrar intento de seguridad
      await logSecurityAttempt({
        userId: user.id,
        resource,
        action,
        granted: securityResult.allowed,
        reason: securityResult.reason,
        ipAddress,
        userAgent,
        metadata: {
          security_checks: {
            rate_limit: securityResult.rateLimitOk || false,
            permission_hierarchy: securityResult.permissionOk || false,
            suspicious_patterns: securityResult.suspicious || false,
            access_history: securityResult.historyOk || false,
            session_integrity: securityResult.sessionOk || false
          },
          blocked: securityResult.blocked,
          alert_required: securityResult.alertRequired
        }
      });

      // Si el acceso está bloqueado, retornar error 403
      if (securityResult.blocked) {
        console.warn(`Acceso bloqueado para usuario ${user.id} en ${resource}.${action}: ${securityResult.reason}`);

        // Si es una amenaza crítica, notificar inmediatamente
        if (securityResult.alertRequired) {
          await createSecurityAlert({
            userId: user.id,
            type: 'access_blocked',
            severity: 'high',
            title: 'Acceso Bloqueado - Política de Seguridad',
            message: `Intento de acceso bloqueado: ${securityResult.reason}`,
            resource,
            action,
            metadata: {
              reason: securityResult.reason,
              blocked: true,
              alert_required: securityResult.alertRequired
            }
          });
        }

        return NextResponse.json(
          {
            error: 'Acceso bloqueado por políticas de seguridad',
            security_level: 'blocked',
            reason: securityResult.reason,
            requires_alert: securityResult.alertRequired
          },
          { status: 403 }
        );
      }

      // Si el acceso es denegado pero no bloqueado, retornar 403
      if (!securityResult.allowed) {
        // Registrar como actividad sospechosa si requiere alerta
        if (securityResult.alertRequired) {
          await flagSuspiciousActivity({
            userId: user.id,
            activityType: 'permission_denied',
            severity: 'medium',
            description: `Acceso denegado: ${securityResult.reason}`,
            ipAddress,
            userAgent,
            metadata: {
              resource,
              action,
              reason: securityResult.reason
            }
          });
        }

        return NextResponse.json(
          {
            error: securityResult.reason,
            security_level: 'denied',
            requires_alert: securityResult.alertRequired
          },
          { status: 403 }
        );
      }

      // Si el acceso es permitido pero sospechoso, monitorear
      if (securityResult.suspicious) {
        console.warn(`Acceso sospechoso detectado para usuario ${user.id} en ${resource}.${action}`);

        // Marcar como actividad sospechosa para monitoreo
        await flagSuspiciousActivity({
          userId: user.id,
          activityType: 'suspicious_access',
          severity: 'medium',
          description: `Acceso permitido pero monitoreado: ${securityResult.reason}`,
          ipAddress,
          userAgent,
          metadata: {
            resource,
            action,
            reason: securityResult.reason
          }
        });
      }

      // Agregar contexto de seguridad al request para que el handler lo use
      const securityContext = {
        userId: user.id,
        securityLevel: securityResult.suspicious ? 'monitored' : 'normal',
        requiresMonitoring: securityResult.suspicious,
        securityChecks: {
          rateLimit: true, // Ya verificado por securityMiddleware
          permissions: true,
          suspiciousActivity: securityResult.suspicious,
          sessionIntegrity: true
        },
        ipAddress,
        userAgent,
        metadata: {
          resource,
          action,
          timestamp: new Date().toISOString(),
          securityFlags: {
            suspicious: securityResult.suspicious,
            alertRequired: securityResult.alertRequired,
            blocked: securityResult.blocked
          }
        }
      };

      // Agregar el contexto de seguridad al request
      (req as any).securityContext = securityContext;

      // Continuar con el handler original
      return await handler(req, securityContext);

    } catch (error) {
      console.error('Error en middleware de protección de seguridad:', error);

      // En caso de error, registrar y bloquear el acceso como medida de seguridad
      if (user) {
        const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        await logSecurityAttempt({
          userId: user.id,
          resource: 'unknown',
          action: 'unknown',
          granted: false,
          reason: 'Error en middleware de seguridad',
          ipAddress,
          userAgent,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }

      return NextResponse.json(
        {
          error: 'Error en validación de seguridad - Acceso denegado',
          security_level: 'error',
          requires_alert: true
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Función auxiliar para registrar intentos de seguridad
 */
async function logSecurityAttempt(attempt: {
  userId: string;
  resource: string;
  action: string;
  granted: boolean;
  reason: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createClient();

    await supabase
      .from('security_access_attempts')
      .insert({
        user_id: attempt.userId,
        resource: attempt.resource,
        action: attempt.action,
        timestamp: new Date().toISOString(),
        ip_address: attempt.ipAddress,
        user_agent: attempt.userAgent,
        granted: attempt.granted,
        reason: attempt.reason,
        metadata: attempt.metadata || {}
      });

  } catch (error) {
    console.error('Error al registrar intento de seguridad:', error);
  }
}

/**
 * Función auxiliar para crear alertas de seguridad
 */
async function createSecurityAlert(alert: {
  userId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const supabase = await createClient();

    await supabase
      .from('security_alerts')
      .insert({
        alert_type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        user_id: alert.userId,
        resource: alert.resource,
        action: alert.action,
        metadata: alert.metadata || {},
        status: 'active'
      });

    // Notificación crítica - podría integrarse con sistemas de notificación
    if (alert.severity === 'critical') {
      console.error(`ALERTA CRÍTICA de seguridad: ${alert.title} - ${alert.message}`);
      // Aquí podría integrarse con Slack, email, u otros sistemas de notificación
    }

  } catch (error) {
    console.error('Error al crear alerta de seguridad:', error);
  }
}

/**
 * Función auxiliar para marcar actividad como sospechosa
 */
async function flagSuspiciousActivity(activity: {
  userId: string;
  activityType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
}) {
  try {
    const supabase = await createClient();

    await supabase
      .from('security_suspicious_activities')
      .insert({
        user_id: activity.userId,
        activity_type: activity.activityType,
        severity: activity.severity,
        description: activity.description,
        ip_address: activity.ipAddress,
        user_agent: activity.userAgent,
        metadata: activity.metadata,
        status: 'pending_review'
      });

  } catch (error) {
    console.error('Error al marcar actividad sospechosa:', error);
  }
}

/**
 * Decorador para proteger endpoints con seguridad
 * Uso: export const GET = withSecurityProtection(secureHandler, [{ resource: 'users', action: 'read' }]);
 */
export function protect(
  requiredPermissions: { resource: string; action: string }[] = []
) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = (async function(req: NextRequest, ...args: any[]) {
      const protectedHandler = withSecurityProtection(
        async (req: NextRequest, securityContext: any) => {
          return method.apply(this, [req, securityContext, ...args]);
        },
        requiredPermissions
      );

      return protectedHandler(req);
    }) as any;

    return descriptor;
  };
}