import { createClient } from '@/lib/supabase';
import { auditService } from './auditService';
import { permissionService } from './permissions';
import { rateLimiter, adaptiveRateLimiter } from './rateLimiter';
import { securityEnhancer } from './securityEnhancer';

export interface SuspiciousActivity {
  id: string;
  user_id: string;
  email: string;
  activity_type: 'privilege_escalation' | 'permission_bypass' | 'role_modification' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  metadata: Record<string, any>;
  action_taken: 'blocked' | 'logged' | 'alerted' | 'escalated';
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'block' | 'log' | 'alert' | 'escalate';
  enabled: boolean;
}

export interface AccessAttempt {
  userId: string;
  resourceId: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  granted: boolean;
  reason: string;
}

/**
 * Enhanced Security Middleware
 * Combines rate limiting, security validation, and access control
 */
export class SecurityMiddleware {
  private readonly RATE_LIMIT_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
  private readonly SUSPICIOUS_PATTERNS = [
    {
      name: 'rapid_role_changes',
      pattern: /(?:cambiar_rol|role_change|assign_role)/gi,
      threshold: 3,
      window: 5 * 60 * 1000, // 5 minutos
      severity: 'high' as const
    },
    {
      name: 'permission_bypass',
      pattern: /(?:(?:delete|drop|truncate|alter|create|drop)\s+(?:table|database|user|role))/gi,
      threshold: 1,
      window: 30 * 60 * 1000, // 30 minutos
      severity: 'critical' as const
    },
    {
      name: 'admin_self_modification',
      pattern: /(?:(?:update|modify|change)\s+(?:admin|superadmin|owner))/gi,
      threshold: 1,
      window: 60 * 60 * 1000, // 1 hora
      severity: 'critical' as const
    },
    {
      name: 'bulk_assignment',
      pattern: /batch|lote|bulk/gi,
      threshold: 10,
      window: 10 * 60 * 1000, // 10 minutos
      severity: 'medium' as const
    }
  ];

  /**
   * Enhanced security validation with comprehensive protection
   * @param userId ID del usuario
   * @param resource Recurso solicitado
   * @param action Acción a realizar
   * @param attemptData Datos del intento
   * @returns Promise<{ allowed: boolean; reason: string; suspicious: boolean }>
   */
  async validateAccess(
    userId: string,
    resource: string,
    action: string,
    attemptData: {
      ipAddress: string;
      userAgent: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    allowed: boolean;
    reason: string;
    suspicious: boolean;
    blocked: boolean;
    alertRequired: boolean;
  }> {
    return this.enhancedSecurityValidation(userId, resource, action, attemptData);
  }

  /**
   * Enhanced security validation with comprehensive protection layers
   */
  private async enhancedSecurityValidation(
    userId: string,
    resource: string,
    action: string,
    attemptData: {
      ipAddress: string;
      userAgent: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    allowed: boolean;
    reason: string;
    suspicious: boolean;
    blocked: boolean;
    alertRequired: boolean;
  }> {
    const startTime = performance.now();

    try {
      // Apply rate limiting first
      const rateLimitResult = await rateLimiter.checkLimit(attemptData, resource);
      if (!rateLimitResult.allowed) {
        await this.logSecurityAttempt({
          userId,
          resource,
          action,
          timestamp: new Date().toISOString(),
          ipAddress: attemptData.ipAddress,
          userAgent: attemptData.userAgent,
          granted: false,
          reason: 'Rate limit exceeded',
          metadata: { ...attemptData.metadata, rateLimitResult }
        });

        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          suspicious: true,
          blocked: true,
          alertRequired: true
        };
      }

      // Apply advanced security context validation
      const securityContext = await securityEnhancer.validateSecurityContext(
        userId,
        attemptData.ipAddress,
        attemptData.userAgent,
        attemptData.sessionId || 'unknown'
      );

      if (!securityContext.valid) {
        await this.logSecurityAttempt({
          userId,
          resource,
          action,
          timestamp: new Date().toISOString(),
          ipAddress: attemptData.ipAddress,
          userAgent: attemptData.userAgent,
          granted: false,
          reason: securityContext.reason,
          metadata: { ...attemptData.metadata, securityContext }
        });

        return {
          allowed: false,
          reason: securityContext.reason,
          suspicious: true,
          blocked: securityContext.blocked,
          alertRequired: true
        };
      }

      // Continue with existing security checks
      const traditionalValidation = await this.traditionalSecurityValidation(userId, resource, action, attemptData);

      // Log the combined validation result
      await this.logSecurityAttempt({
        userId,
        resource,
        action,
        timestamp: new Date().toISOString(),
        ipAddress: attemptData.ipAddress,
        userAgent: attemptData.userAgent,
        granted: traditionalValidation.allowed,
        reason: traditionalValidation.reason,
        metadata: {
          ...attemptData.metadata,
          securityContext,
          traditionalValidation,
          enhancedValidation: true,
          processingTime: Date.now() - startTime
        }
      });

      return traditionalValidation;

    } catch (error) {
      console.error('Enhanced security validation error:', error);

      await this.logSecurityAttempt({
        userId,
        resource,
        action,
        timestamp: new Date().toISOString(),
        ipAddress: attemptData.ipAddress,
        userAgent: attemptData.userAgent,
        granted: false,
        reason: 'Enhanced security validation error',
        metadata: { ...attemptData.metadata, error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return {
        allowed: false,
        reason: 'Enhanced security validation error - Access denied',
        suspicious: true,
        blocked: true,
        alertRequired: true
      };
    }
  }

  /**
   * Traditional security validation (original logic)
   */
  private async traditionalSecurityValidation(
    userId: string,
    resource: string,
    action: string,
    attemptData: {
      ipAddress: string;
      userAgent: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    allowed: boolean;
    reason: string;
    suspicious: boolean;
    blocked: boolean;
    alertRequired: boolean;
  }> {
    try {
      const checks = await Promise.all([
        this.checkRateLimit(userId, attemptData.ipAddress),
        this.checkPermissionHierarchy(userId, resource, action),
        this.detectSuspiciousPatterns(userId, attemptData),
        this.checkAccessHistory(userId, resource, action),
        this.verifySessionIntegrity(userId, attemptData.ipAddress)
      ]);

      const [rateLimitOk, permissionOk, suspicious, historyOk, sessionOk] = checks;

      const securityIssues: string[] = [];
      let suspiciousLevel = false;
      let blockAccess = false;
      let alertRequired = false;

      if (!rateLimitOk.ok) {
        securityIssues.push(`Límite de tasa excedido: ${rateLimitOk.reason}`);
        blockAccess = rateLimitOk.block;
        alertRequired = rateLimitOk.alert;
      }

      if (!permissionOk.ok) {
        securityIssues.push(`Violación de jerarquía: ${permissionOk.reason}`);
        blockAccess = blockAccess || permissionOk.block;
        alertRequired = alertRequired || permissionOk.alert;
      }

      if (suspicious.detected) {
        securityIssues.push(`Patrón sospechoso detectado: ${suspicious.reason}`);
        suspiciousLevel = true;
        blockAccess = blockAccess || suspicious.block;
        alertRequired = alertRequired || suspicious.alert;
      }

      if (!historyOk.ok) {
        securityIssues.push(`Historial de acceso anómalo: ${historyOk.reason}`);
        suspiciousLevel = true;
        alertRequired = true;
      }

      if (!sessionOk.ok) {
        securityIssues.push(`Integridad de sesión comprometida: ${sessionOk.reason}`);
        blockAccess = true;
        alertRequired = true;
      }

      const allowed = securityIssues.length === 0;
      const reason = allowed ? 'Acceso autorizado' : securityIssues.join('; ');

      return {
        allowed,
        reason,
        suspicious: suspiciousLevel,
        blocked: blockAccess,
        alertRequired
      };

    } catch (error) {
      console.error('Error en validación de seguridad tradicional:', error);

      await this.logSecurityAttempt({
        userId,
        resource,
        action,
        timestamp: new Date().toISOString(),
        ipAddress: attemptData.ipAddress,
        userAgent: attemptData.userAgent,
        granted: false,
        reason: 'Error en validación de seguridad tradicional',
        metadata: attemptData.metadata
      });

      return {
        allowed: false,
        reason: 'Error en validación de seguridad - Acceso denegado',
        suspicious: true,
        blocked: true,
        alertRequired: true
      };
    }
  }

  /**
   * Valida intento de acceso y aplica reglas de seguridad (método original)
   * @param userId ID del usuario
   * @param resource Recurso solicitado
   * @param action Acción a realizar
   * @param attemptData Datos del intento
   * @returns Promise<{ allowed: boolean; reason: string; suspicious: boolean }>
   */
  async validateAccessLegacy(
    userId: string,
    resource: string,
    action: string,
    attemptData: {
      ipAddress: string;
      userAgent: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    allowed: boolean;
    reason: string;
    suspicious: boolean;
    blocked: boolean;
    alertRequired: boolean;
  }> {
    try {
      const checks = await Promise.all([
        this.checkRateLimit(userId, attemptData.ipAddress),
        this.checkPermissionHierarchy(userId, resource, action),
        this.detectSuspiciousPatterns(userId, attemptData),
        this.checkAccessHistory(userId, resource, action),
        this.verifySessionIntegrity(userId, attemptData.ipAddress)
      ]);

      const [rateLimitOk, permissionOk, suspicious, historyOk, sessionOk] = checks;

      const securityIssues: string[] = [];
      let suspiciousLevel = false;
      let blockAccess = false;
      let alertRequired = false;

      if (!rateLimitOk.ok) {
        securityIssues.push(`Límite de tasa excedido: ${rateLimitOk.reason}`);
        blockAccess = rateLimitOk.block;
        alertRequired = rateLimitOk.alert;
      }

      if (!permissionOk.ok) {
        securityIssues.push(`Violación de jerarquía: ${permissionOk.reason}`);
        blockAccess = blockAccess || permissionOk.block;
        alertRequired = alertRequired || permissionOk.alert;
      }

      if (suspicious.detected) {
        securityIssues.push(`Patrón sospechoso detectado: ${suspicious.reason}`);
        suspiciousLevel = true;
        blockAccess = blockAccess || suspicious.block;
        alertRequired = alertRequired || suspicious.alert;
      }

      if (!historyOk.ok) {
        securityIssues.push(`Historial de acceso anómalo: ${historyOk.reason}`);
        suspiciousLevel = true;
        alertRequired = true;
      }

      if (!sessionOk.ok) {
        securityIssues.push(`Integridad de sesión comprometida: ${sessionOk.reason}`);
        blockAccess = true;
        alertRequired = true;
      }

      const allowed = securityIssues.length === 0;
      const reason = allowed ? 'Acceso autorizado' : securityIssues.join('; ');

      // Registrar intento en auditoría de seguridad
      await this.logSecurityAttempt({
        userId,
        resource,
        action,
        timestamp: new Date().toISOString(),
        ipAddress: attemptData.ipAddress,
        userAgent: attemptData.userAgent,
        granted: allowed,
        reason: allowed ? null : securityIssues.join('; '),
        metadata: {
          ...attemptData.metadata,
          security_checks: {
            rate_limit: rateLimitOk.ok,
            permission_hierarchy: permissionOk.ok,
            suspicious_patterns: suspicious.detected,
            access_history: historyOk.ok,
            session_integrity: sessionOk.ok
          }
        }
      });

      // Si hay actividad sospechosa, registrar en el sistema de monitoreo
      if (suspiciousLevel) {
        await this.flagSuspiciousActivity({
          userId,
          activityType: suspicious.suspiciousType || 'suspicious_pattern',
          severity: suspicious.severity || 'medium',
          description: securityIssues.join('; '),
          ipAddress: attemptData.ipAddress,
          userAgent: attemptData.userAgent,
          metadata: { resource, action, ...attemptData.metadata }
        });
      }

      return {
        allowed,
        reason,
        suspicious: suspiciousLevel,
        blocked: blockAccess,
        alertRequired
      };

    } catch (error) {
      console.error('Error en validación de seguridad:', error);

      // En caso de error, bloquear el acceso como medida de seguridad
      await this.logSecurityAttempt({
        userId,
        resource,
        action,
        timestamp: new Date().toISOString(),
        ipAddress: attemptData.ipAddress,
        userAgent: attemptData.userAgent,
        granted: false,
        reason: 'Error en validación de seguridad',
        metadata: attemptData.metadata
      });

      return {
        allowed: false,
        reason: 'Error en validación de seguridad - Acceso denegado',
        suspicious: true,
        blocked: true,
        alertRequired: true
      };
    }
  }

  /**
   * Verifica límites de tasa para prevenir ataques de fuerza bruta
   */
  private async checkRateLimit(
    userId: string,
    ipAddress: string
  ): Promise<{ ok: boolean; reason: string; block: boolean; alert: boolean }> {
    try {
      const supabase = await createClient();

      // Obtener intentos recientes
      const { data: recentAttempts } = await supabase
        .from('security_access_attempts')
        .select('id, timestamp, granted')
        .gte('timestamp', new Date(Date.now() - this.RATE_LIMIT_WINDOW).toISOString())
        .or(`user_id.eq.${userId},ip_address.eq.${ipAddress}`);

      const failedAttempts = recentAttempts?.filter(attempt => !attempt.granted) || [];
      const totalAttempts = recentAttempts?.length || 0;

      if (totalAttempts >= this.RATE_LIMIT_ATTEMPTS) {
        // Bloquear si demasiados intentos fallidos
        if (failedAttempts.length >= Math.ceil(this.RATE_LIMIT_ATTEMPTS * 0.7)) {
          return {
            ok: false,
            reason: `Demasiados intentos (${totalAttempts}/${this.RATE_LIMIT_ATTEMPTS})`,
            block: true,
            alert: true
          };
        }

        return {
          ok: false,
          reason: `Límite de intentos alcanzado (${totalAttempts}/${this.RATE_LIMIT_ATTEMPTS})`,
          block: false,
          alert: false
        };
      }

      return { ok: true, reason: '', block: false, alert: false };

    } catch (error) {
      console.error('Error en verificación de límite de tasa:', error);
      return { ok: true, reason: '', block: false, alert: false }; // Permitir si falla la verificación
    }
  }

  /**
   * Verifica jerarquía de permisos para prevenir escalamiento
   */
  private async checkPermissionHierarchy(
    userId: string,
    resource: string,
    action: string
  ): Promise<{ ok: boolean; reason: string; block: boolean; alert: boolean }> {
    try {
      // Verificar permiso básico
      const hasPermission = await permissionService.verificarPermiso(userId, resource, action);

      if (!hasPermission) {
        // Verificar si es intento de escalamiento
        const userRole = await permissionService.getUserRole(userId);
        const sensitiveResources = ['users', 'roles', 'permissions', 'audit', 'security'];

        if (sensitiveResources.includes(resource)) {
          return {
            ok: false,
            reason: `Intento de acceso a recurso sensible (${resource}) sin permiso`,
            block: true,
            alert: true
          };
        }

        return {
          ok: false,
          reason: `Permiso denegado para ${resource}.${action}`,
          block: true,
          alert: false
        };
      }

      // Verificar si el usuario está intent modificar su propio rol o roles superiores
      if (resource === 'roles' && ['update', 'delete'].includes(action)) {
        const userInfo = await permissionService.getUserInfo(userId);
        if (userInfo && userInfo.rol?.name) {
          const targetRole = resource;

          // Prevenir auto-modificación de roles sensibles
          if (['superadmin', 'admin'].includes(userInfo.rol.name) && targetRole === userInfo.rol.name) {
            return {
              ok: false,
              reason: 'Auto-modificación de rol sensible no permitida',
              block: true,
              alert: true
            };
          }
        }
      }

      return { ok: true, reason: '', block: false, alert: false };

    } catch (error) {
      console.error('Error en verificación de jerarquía:', error);
      return { ok: false, reason: 'Error en verificación de jerarquía de permisos', block: true, alert: true };
    }
  }

  /**
   * Detecta patrones de comportamiento sospechosos
   */
  private async detectSuspiciousPatterns(
    userId: string,
    attemptData: { ipAddress: string; userAgent: string; metadata?: Record<string, any> }
  ): Promise<{
    detected: boolean;
    reason: string;
    block: boolean;
    alert: boolean;
    suspiciousType?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }> {
    try {
      const supabase = await createClient();

      // Obtener intentos recientes del usuario
      const { data: recentActivities } = await supabase
        .from('security_access_attempts')
        .select('action, metadata, timestamp')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Última hora
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (!recentActivities || recentActivities.length === 0) {
        return { detected: false, reason: '', block: false, alert: false };
      }

      // Analizar patrones en los intentos recientes
      let suspiciousDetected = false;
      let suspiciousType: string | undefined;
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

      for (const pattern of this.SUSPICIOUS_PATTERNS) {
        const matches = recentActivities.filter(activity => {
          const actionText = `${activity.action} ${JSON.stringify(activity.metadata || {})}`;
          return pattern.pattern.test(actionText);
        });

        if (matches.length >= pattern.threshold) {
          suspiciousDetected = true;
          suspiciousType = pattern.name;
          severity = pattern.severity;
          break;
        }
      }

      // Verificar cambios rápidos de roles
      if (!suspiciousDetected) {
        const recentRoleChanges = await supabase
          .from('auditoria_cambios_rol')
          .select('timestamp, rol_anterior, rol_nuevo')
          .gte('timestamp', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30 minutos
          .or(`realizado_por.eq.${userId},usuario_id.eq.${userId}`);

        if (recentRoleChanges && recentRoleChanges.data && recentRoleChanges.data.length >= 3) {
          suspiciousDetected = true;
          suspiciousType = 'rapid_role_changes';
          severity = 'high';
        }
      }

      return {
        detected: suspiciousDetected,
        reason: suspiciousDetected ? `Patrón sospechoso detectado: ${suspiciousType}` : '',
        block: suspiciousDetected && severity === 'critical',
        alert: suspiciousDetected,
        suspiciousType,
        severity
      };

    } catch (error) {
      console.error('Error en detección de patrones sospechosos:', error);
      return { detected: false, reason: '', block: false, alert: false };
    }
  }

  /**
   * Analiza historial de acceso para detectar comportamientos anómalos
   */
  private async checkAccessHistory(
    userId: string,
    resource: string,
    action: string
  ): Promise<{ ok: boolean; reason: string; block: boolean; alert: boolean }> {
    try {
      const supabase = await createClient();

      // Obtener historial de acceso al recurso específico
      const { data: history } = await supabase
        .from('security_access_attempts')
        .select('granted, timestamp')
        .eq('user_id', userId)
        .eq('resource', resource)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
        .order('timestamp', { ascending: false });

      if (!history || history.length === 0) {
        return { ok: true, reason: '', block: false, alert: false };
      }

      // Verificar patrones de denegación seguidas de intentos
      const recentDenials = history
        .filter(h => !h.granted)
        .slice(0, 3);

      if (recentDenials.length >= 2) {
        const lastSuccess = history.find(h => h.granted);
        const lastDenial = recentDenials[0];

        if (lastSuccess && new Date(lastDenial.timestamp).getTime() - new Date(lastSuccess.timestamp).getTime() < 60 * 60 * 1000) {
          return {
            ok: false,
            reason: 'Patrón de denegaciones repetidas seguidas de nuevo intento',
            block: false,
            alert: true
          };
        }
      }

      return { ok: true, reason: '', block: false, alert: false };

    } catch (error) {
      console.error('Error en análisis de historial:', error);
      return { ok: true, reason: '', block: false, alert: false };
    }
  }

  /**
   * Verifica integridad de la sesión del usuario
   */
  private async verifySessionIntegrity(
    userId: string,
    ipAddress: string
  ): Promise<{ ok: boolean; reason: string; block: boolean; alert: boolean }> {
    try {
      const supabase = await createClient();

      // Verificar si el usuario tiene sesión activa
      const { data: session } = await supabase.auth.getUser();

      if (!session.user || session.user.id !== userId) {
        return {
          ok: false,
          reason: 'Sesión no válida o expirada',
          block: true,
          alert: true
        };
      }

      // Verificar consistencia de IP (opcional, para detección de session hijacking)
      const { data: recentSessions } = await supabase
        .from('security_access_attempts')
        .select('ip_address')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .limit(5);

      const uniqueIPs = new Set(recentSessions?.map(s => s.ip_address) || []);
      if (uniqueIPs.size > 3) {
        return {
          ok: false,
          reason: 'Múltiples direcciones IP detectadas en sesión reciente',
          block: true,
          alert: true
        };
      }

      return { ok: true, reason: '', block: false, alert: false };

    } catch (error) {
      console.error('Error en verificación de sesión:', error);
      return { ok: false, reason: 'Error en verificación de integridad de sesión', block: true, alert: true };
    }
  }

  /**
   * Registra intento de acceso en el sistema de auditoría de seguridad
   */
  private async logSecurityAttempt(attempt: {
    userId: string;
    resource: string;
    action: string;
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    granted: boolean;
    reason: string | null;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase
        .from('security_access_attempts')
        .insert({
          user_id: attempt.userId,
          resource: attempt.resource,
          action: attempt.action,
          timestamp: attempt.timestamp,
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
   * Marca actividad como sospechosa para monitoreo
   */
  private async flagSuspiciousActivity(activity: {
    userId: string;
    activityType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    ipAddress: string;
    userAgent: string;
    metadata: Record<string, any>;
  }): Promise<string> {
    try {
      const supabase = await createClient();

      const { data: flaggedActivity } = await supabase
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
        })
        .select()
        .single();

      return flaggedActivity?.id || '';

    } catch (error) {
      console.error('Error al marcar actividad sospechosa:', error);
      return '';
    }
  }

  /**
   * Obtiene estadísticas de seguridad del sistema
   */
  async getSecurityStats(): Promise<{
    totalAttempts: number;
    blockedAttempts: number;
    suspiciousActivities: number;
    recentThreats: Array<{
      id: string;
      type: string;
      severity: string;
      timestamp: string;
      userId: string;
    }>;
  }> {
    try {
      const supabase = await createClient();

      const [{ count: totalAttempts }, { count: blockedAttempts }, { count: suspiciousActivities }] = await Promise.all([
        supabase.from('security_access_attempts').select('id', { count: 'exact', head: true }),
        supabase.from('security_access_attempts').select('id', { count: 'exact', head: true }).eq('granted', false),
        supabase.from('security_suspicious_activities').select('id', { count: 'exact', head: true })
      ]);

      const { data: recentThreats } = await supabase
        .from('security_suspicious_activities')
        .select('id, activity_type as type, severity, timestamp, user_id')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(10);

      return {
        totalAttempts: totalAttempts || 0,
        blockedAttempts: blockedAttempts || 0,
        suspiciousActivities: suspiciousActivities || 0,
        recentThreats: recentThreats || []
      };

    } catch (error) {
      console.error('Error al obtener estadísticas de seguridad:', error);
      return {
        totalAttempts: 0,
        blockedAttempts: 0,
        suspiciousActivities: 0,
        recentThreats: []
      };
    }
  }

  /**
   * Genera informe de seguridad
   */
  async generateSecurityReport(days: number = 7): Promise<{
    summary: {
      period: string;
      totalAttempts: number;
      blockedAttempts: number;
      suspiciousActivities: number;
      criticalThreats: number;
    };
    topThreats: Array<{
      type: string;
      count: number;
      severity: string;
    }>;
    userActivity: Array<{
      userId: string;
      email: string;
      attempts: number;
      blocked: number;
      suspicious: number;
    }>;
    recommendations: string[];
  }> {
    try {
      const supabase = await createClient();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [{ count: totalAttempts }, { count: blockedAttempts }, { count: suspiciousActivities }] = await Promise.all([
        supabase.from('security_access_attempts').select('id', { count: 'exact', head: true }).gte('timestamp', startDate.toISOString()),
        supabase.from('security_access_attempts').select('id', { count: 'exact', head: true }).eq('granted', false).gte('timestamp', startDate.toISOString()),
        supabase.from('security_suspicious_activities').select('id', { count: 'exact', head: true }).gte('timestamp', startDate.toISOString())
      ]);

      const { data: topThreats } = await supabase
        .from('security_suspicious_activities')
        .select('activity_type as type, severity')
        .gte('timestamp', startDate.toISOString());

      // Agrupar por tipo de amenaza
      const threatCounts = topThreats?.reduce((acc, threat) => {
        const key = `${threat.type}_${threat.severity}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const summary = {
        period: `Últimos ${days} días`,
        totalAttempts: totalAttempts || 0,
        blockedAttempts: blockedAttempts || 0,
        suspiciousActivities: suspiciousActivities || 0,
        criticalThreats: Object.values(threatCounts).filter(count => {
          const key = Object.keys(threatCounts).find(k => threatCounts[k] === count);
          return key?.endsWith('_critical');
        }).reduce((sum, count) => sum + count, 0)
      };

      const recommendations = this.generateRecommendations(summary, threatCounts);

      return {
        summary,
        topThreats: Object.entries(threatCounts).map(([key, count]) => ({
          type: key.split('_')[0],
          count,
          severity: key.split('_')[1]
        })),
        userActivity: [], // Podría implementarse con consulta adicional
        recommendations
      };

    } catch (error) {
      console.error('Error al generar informe de seguridad:', error);
      throw error;
    }
  }

  /**
   * Genera recomendaciones basadas en análisis de seguridad
   */
  private generateRecommendations(summary: any, threatCounts: Record<string, number>): string[] {
    const recommendations: string[] = [];

    if (summary.blockedAttempts / summary.totalAttempts > 0.3) {
      recommendations.push('Alta tasa de intentos bloqueados. Considera revisar las políticas de seguridad y considerar autenticación multifactor.');
    }

    if (summary.criticalThreats > 0) {
      recommendations.push('Amenazas críticas detectadas. Requiere revisión inmediata y medidas correctivas.');
    }

    if (threatCounts['privilege_escalation_high'] > 2) {
      recommendations.push('Múltiples intentos de escalamiento de privilegios. Considera implementar controles adicionales.');
    }

    if (Object.keys(threatCounts).length === 0 && summary.totalAttempts > 100) {
      recommendations.push('Sistema de seguridad activo pero sin amenazas significativas. Mantén la vigilancia.');
    }

    return recommendations;
  }

  /**
   * Obtiene métricas de seguridad mejoradas combinando todos los sistemas
   */
  async getEnhancedSecurityMetrics(): Promise<{
    traditionalSecurity: ReturnType<SecurityMiddleware['getSecurityStats']>;
    rateLimiting: ReturnType<typeof rateLimiter.getMetrics>;
    securityEnhancer: ReturnType<typeof securityEnhancer.getSecurityMetrics>;
    combined: {
      totalRequests: number;
      blockedRequests: number;
      suspiciousActivities: number;
      riskScore: number;
      securityScore: number;
      timestamp: string;
    };
  }> {
    try {
      const [traditionalMetrics, rateMetrics, securityMetrics] = await Promise.all([
        this.getSecurityStats(),
        rateLimiter.getMetrics(),
        securityEnhancer.getSecurityMetrics()
      ]);

      const combined = {
        totalRequests: traditionalMetrics.totalAttempts + rateMetrics.hits + rateMetrics.misses,
        blockedRequests: traditionalMetrics.blockedAttempts + rateMetrics.blockedRequests,
        suspiciousActivities: traditionalMetrics.suspiciousActivities + securityMetrics.suspiciousActivity,
        riskScore: this.calculateOverallRiskScore(traditionalMetrics, rateMetrics, securityMetrics),
        securityScore: this.calculateSecurityScore(traditionalMetrics, rateMetrics, securityMetrics),
        timestamp: new Date().toISOString()
      };

      return {
        traditionalSecurity: traditionalMetrics,
        rateLimiting: rateMetrics,
        securityEnhancer: securityMetrics,
        combined
      };

    } catch (error) {
      console.error('Error getting enhanced security metrics:', error);
      throw error;
    }
  }

  /**
   * Calcula el puntaje de riesgo general
   */
  private calculateOverallRiskScore(
    traditional: any,
    rate: any,
    security: any
  ): number {
    let riskScore = 0;

    // Rate limiting risk
    const rateRisk = rate.blockedRequests / (rate.hits + rate.misses || 1);
    riskScore += rateRisk * 0.3;

    // Traditional security risk
    const traditionalRisk = traditional.blockedAttempts / (traditional.totalAttempts || 1);
    riskScore += traditionalRisk * 0.4;

    // Security enhancer risk
    const securityRisk = security.suspiciousActivity / (security.totalValidations || 1);
    riskScore += securityRisk * 0.3;

    return Math.min(riskScore, 1.0);
  }

  /**
   * Calcula el puntaje de seguridad general
   */
  private calculateSecurityScore(
    traditional: any,
    rate: any,
    security: any
  ): number {
    let score = 100;

    // Penalize for high blocked requests
    const blockRate = traditional.blockedAttempts / (traditional.totalAttempts || 1);
    score -= blockRate * 50;

    // Penalize for high suspicious activities
    const suspiciousRate = security.suspiciousActivity / (security.totalValidations || 1);
    score -= suspiciousRate * 30;

    // Bonus for high hit rate
    const hitRate = rate.hits / (rate.hits + rate.misses || 1);
    score += hitRate * 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Registra intento de acceso usando el rate limiter mejorado
   */
  async logSecurityAttemptWithRateLimit(attempt: {
    userId: string;
    resource: string;
    action: string;
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    granted: boolean;
    reason: string | null;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Use enhanced rate limiter to record the attempt
      await rateLimiter.set(
        `security_attempt:${attempt.userId}:${attempt.resource}:${attempt.action}`,
        {
          userId: attempt.userId,
          resource: attempt.resource,
          action: attempt.action,
          granted: attempt.granted,
          timestamp: attempt.timestamp
        },
        { ttl: 24 * 60 * 60 * 1000 } // Keep for 24 hours
      );

      // Also log to the original security attempts table
      const supabase = await createClient();

      await supabase
        .from('security_access_attempts')
        .insert({
          user_id: attempt.userId,
          resource: attempt.resource,
          action: attempt.action,
          timestamp: attempt.timestamp,
          ip_address: attempt.ipAddress,
          user_agent: attempt.userAgent,
          granted: attempt.granted,
          reason: attempt.reason,
          metadata: attempt.metadata || {}
        });

    } catch (error) {
      console.error('Error logging security attempt with rate limit:', error);
    }
  }
}

// Instancia global para uso en toda la aplicación
export const securityMiddleware = new SecurityMiddleware();