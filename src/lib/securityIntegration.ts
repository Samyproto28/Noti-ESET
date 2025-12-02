import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from './securityMiddleware';
import { permissionService } from './permissions';
import { createClient } from './supabase';

/**
 * Security integration middleware for all API routes
 * Provides unified security validation across the application
 */

export interface SecurityContext {
  userId: string;
  resource: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface SecurityValidationResult {
  success: boolean;
  blocked: boolean;
  suspicious: boolean;
  alertRequired: boolean;
  reason: string;
  userId: string;
  resource: string;
  action: string;
}

/**
 * Security wrapper for API routes
 * @param handler API route handler
 * @param requiredPermission Required permission string (e.g., 'roles.read')
 * @returns Wrapped handler with security validation
 */
export function withSecurity(
  handler: (req: NextRequest, securityContext: SecurityContext) => Promise<NextResponse>,
  requiredPermission?: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const supabase = await createClient();
      const { user } = await supabase.auth.getUser();

      // Basic authentication check
      if (!user) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        );
      }

      // Parse permission and action from requiredPermission
      let resource = '';
      let action = '';

      if (requiredPermission) {
        const parts = requiredPermission.split('.');
        if (parts.length >= 2) {
          resource = parts[0];
          action = parts[1];
        }
      }

      // If no permission specified, use route path and method
      if (!resource || !action) {
        const path = req.nextUrl.pathname;
        const method = req.method.toLowerCase();

        // Map HTTP methods to actions
        const actionMap: Record<string, string> = {
          get: 'read',
          post: 'create',
          put: 'update',
          delete: 'delete',
          patch: 'update'
        };

        resource = path.split('/').filter(Boolean)[0] || 'unknown';
        action = actionMap[method] || method;
      }

      // Apply security validation
      const securityValidation = await securityMiddleware.validateAccess(
        user.id,
        resource,
        action,
        {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          metadata: {
            path: req.nextUrl.pathname,
            method: req.method,
            query: Object.fromEntries(req.nextUrl.searchParams),
            timestamp: new Date().toISOString()
          }
        }
      );

      // Log security validation for audit
      if (!securityValidation.allowed || securityValidation.suspicious) {
        console.log(`Security validation [${user.id}]: ${resource}.${action} - ${securityValidation.reason}`);
      }

      // If access is blocked by security, deny immediately
      if (securityValidation.blocked) {
        return NextResponse.json(
          {
            error: 'Acceso bloqueado por medidas de seguridad',
            reason: securityValidation.reason,
            suspicious: securityValidation.suspicious,
            alert_required: securityValidation.alertRequired,
            security_timestamp: new Date().toISOString()
          },
          {
            status: 403,
            headers: {
              'X-Security-Block': 'true',
              'X-Security-Reason': securityValidation.reason
            }
          }
        );
      }

      // If permission is required and not granted, check with permission service
      if (requiredPermission && !securityValidation.allowed) {
        const hasPermission = await permissionService.verificarPermiso(
          user.id,
          resource,
          action
        );

        if (!hasPermission) {
          return NextResponse.json(
            {
              error: 'Permiso insuficiente',
              required_permission: requiredPermission,
              reason: securityValidation.reason,
              suspicious: securityValidation.suspicious,
              alert_required: securityValidation.alertRequired
            },
            {
              status: 403,
              headers: {
                'X-Security-Alert': securityValidation.alertRequired ? 'true' : 'false'
              }
            }
          );
        }
      }

      // Create security context
      const securityContext: SecurityContext = {
        userId: user.id,
        resource,
        action,
        metadata: {
          path: req.nextUrl.pathname,
          method: req.method,
          query: Object.fromEntries(req.nextUrl.searchParams),
          security_validation: securityValidation
        }
      };

      // Call the original handler with security context
      return await handler(req, securityContext);

    } catch (error) {
      console.error('Security integration error:', error);

      // In case of security error, deny access
      return NextResponse.json(
        {
          error: 'Error en validación de seguridad',
          reason: error instanceof Error ? error.message : 'Unknown error',
          security_timestamp: new Date().toISOString()
        },
        {
          status: 500,
          headers: {
            'X-Security-Error': 'true'
          }
        }
      );
    }
  };
}

/**
 * High-level security middleware for specific scenarios
 */
export class SecurityEnhancer {
  /**
   * Validates privilege escalation attempts
   */
  async validatePrivilegeEscalation(
    userId: string,
    targetUserId: string,
    newRoleId: string
  ): Promise<{
    valid: boolean;
    reason: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    try {
      const supabase = await createClient();

      // Get current roles
      const [{ data: currentUserRole }, { data: targetUserRole }] = await Promise.all([
        supabase
          .from('user_roles')
          .select(`
            role_id,
            roles!inner(level, name)
          `)
          .eq('user_id', userId)
          .single(),
        supabase
          .from('user_roles')
          .select(`
            role_id,
            roles!inner(level, name)
          `)
          .eq('user_id', targetUserId)
          .single()
      ]);

      if (!currentUserRole || !targetUserRole) {
        return {
          valid: false,
          reason: 'User role information not found',
          riskLevel: 'high'
        };
      }

      const currentLevel = currentUserRole.roles.level;
      const targetLevel = targetUserRole.roles.level;
      const newRoleLevel = (await supabase
        .from('roles')
        .select('level')
        .eq('id', newRoleId)
        .single()).data?.level;

      if (!newRoleLevel) {
        return {
          valid: false,
          reason: 'Target role not found',
          riskLevel: 'high'
        };
      }

      // Check for privilege escalation
      if (newRoleLevel > currentLevel) {
        return {
          valid: false,
          reason: `Privilege escalation attempt: cannot assign role level ${newRoleLevel} to user with level ${currentLevel}`,
          riskLevel: 'critical'
        };
      }

      // Check if promoting someone beyond their current level
      if (newRoleLevel > targetLevel) {
        return {
          valid: false,
          reason: `Cannot promote user from level ${targetLevel} to ${newRoleLevel} without proper authorization`,
          riskLevel: 'high'
        };
      }

      return {
        valid: true,
        reason: 'Privilege escalation validation passed',
        riskLevel: 'low'
      };

    } catch (error) {
      console.error('Privilege escalation validation error:', error);
      return {
        valid: false,
        reason: 'Error in privilege escalation validation',
        riskLevel: 'high'
      };
    }
  }

  /**
   * Validates bulk operations for security risks
   */
  async validateBulkOperation(
    userId: string,
    operationType: 'role_assignment' | 'permission_change' | 'data_modification',
    targetCount: number,
    context: Record<string, any>
  ): Promise<{
    valid: boolean;
    reason: string;
    requiresApproval: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    try {
      const supabase = await createClient();

      // Check user's role level
      const { data: userRole } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles!inner(level, name)
        `)
        .eq('user_id', userId)
        .single();

      if (!userRole) {
        return {
          valid: false,
          reason: 'User role not found',
          riskLevel: 'high',
          requiresApproval: true
        };
      }

      // Bulk operation thresholds based on role level
      const thresholds = {
        1: { small: 10, medium: 50, large: 100 }, // Estudiante
        2: { small: 25, medium: 100, large: 500 }, // Moderador
        3: { small: 100, medium: 500, large: 1000 }, // Admin
        4: { small: 500, medium: 1000, large: 5000 } // Superadmin
      };

      const userLevel = userRole.roles.level;
      const threshold = thresholds[userLevel as keyof typeof thresholds];

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let requiresApproval = false;

      if (operationType === 'role_assignment' && targetCount > 10) {
        riskLevel = 'high';
        requiresApproval = true;
      } else if (operationType === 'permission_change' && targetCount > 25) {
        riskLevel = 'medium';
        requiresApproval = userLevel < 4;
      } else if (targetCount > threshold[userLevel === 1 ? 'small' : userLevel === 2 ? 'medium' : 'large']) {
        riskLevel = 'high';
        requiresApproval = true;
      }

      return {
        valid: true,
        reason: `Bulk operation validation passed: ${targetCount} ${operationType} operations`,
        requiresApproval,
        riskLevel
      };

    } catch (error) {
      console.error('Bulk operation validation error:', error);
      return {
        valid: false,
        reason: 'Error in bulk operation validation',
        riskLevel: 'high',
        requiresApproval: true
      };
    }
  }

  /**
   * Session security validation
   */
  async validateSessionSecurity(
    userId: string,
    currentSession: any
  ): Promise<{
    valid: boolean;
    reason: string;
    sessionRisk: 'low' | 'medium' | 'high' | 'critical';
    actions: string[];
  }> {
    try {
      const supabase = await createClient();

      const actions: string[] = [];
      let sessionRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';

      // Check session age
      const sessionAge = Date.now() - new Date(currentSession.created_at).getTime();
      if (sessionAge > 24 * 60 * 60 * 1000) { // 24 hours
        actions.push('Session too old, consider renewal');
        sessionRisk = Math.max(sessionRisk, 'medium');
      }

      // Check multiple sessions
      const { data: activeSessions } = await supabase
        .from('user_sessions')
        .select('id, ip_address, user_agent, created_at')
        .eq('user_id', userId)
        .gte('last_activity', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

      const uniqueIPs = new Set(activeSessions?.map(s => s.ip_address) || []);
      if (uniqueIPs.size > 2) {
        actions.push('Multiple IP addresses detected');
        sessionRisk = Math.max(sessionRisk, 'high');
      }

      // Check for suspicious session patterns
      const { data: recentActivities } = await supabase
        .from('security_access_attempts')
        .select('timestamp, ip_address')
        .eq('user_id', userId)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (recentActivities && recentActivities.length > 100) {
        actions.push('High frequency of access attempts');
        sessionRisk = Math.max(sessionRisk, 'medium');
      }

      return {
        valid: actions.length === 0,
        reason: actions.length > 0 ? 'Session security concerns detected' : 'Session security validated',
        sessionRisk,
        actions
      };

    } catch (error) {
      console.error('Session security validation error:', error);
      return {
        valid: false,
        reason: 'Error in session security validation',
        sessionRisk: 'high',
        actions: ['Error in validation, consider session termination']
      };
    }
  }
}

// Export singleton instance
export const securityEnhancer = new SecurityEnhancer();