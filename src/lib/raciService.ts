import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export interface RACIMatrixEntry {
  id: string;
  resource: string;
  action: string;
  permission_name: string;
  responsible: string[];
  accountable: string[];
  consulted: string[];
  informed: string[];
  business_process: string;
  criticality_level: 'low' | 'medium' | 'high' | 'critical';
  compliance_impact: boolean;
  audit_required: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface RoleResponsibility {
  role: string;
  responsibilities: RACIMatrixEntry[];
  accountable_for: RACIMatrixEntry[];
  consulted_on: RACIMatrixEntry[];
  informed_of: RACIMatrixEntry[];
}

export interface BusinessProcessMapping {
  process: string;
  permissions: RACIMatrixEntry[];
  critical_permissions: string[];
  compliance_requirements: string[];
}

/**
 * Service for managing RACI (Responsible, Accountable, Consulted, Informed) matrix
 * Provides comprehensive role and responsibility definitions for the RBAC system
 */
export class RACIService {
  private cache = new Map<string, RACIMatrixEntry[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Get all RACI matrix entries
   */
  async getRACIMatrix(): Promise<RACIMatrixEntry[]> {
    const cacheKey = 'raci_matrix_full';
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey) || 0;

    if (cached && expiry > now) {
      return cached;
    }

    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('raci_matrix')
        .select('*')
        .order('business_process')
        .order('criticality_level', { ascending: false })
        .order('resource');

      if (error) {
        console.error('Error fetching RACI matrix:', error);
        return [];
      }

      // Update cache
      this.cache.set(cacheKey, data || []);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

      return data || [];
    } catch (error) {
      console.error('Error in RACI matrix service:', error);
      return [];
    }
  }

  /**
   * Get RACI matrix entries by business process
   */
  async getRACIMatrixByProcess(businessProcess: string): Promise<RACIMatrixEntry[]> {
    const cacheKey = `raci_matrix_${businessProcess}`;
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey) || 0;

    if (cached && expiry > now) {
      return cached;
    }

    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('raci_matrix')
        .select('*')
        .eq('business_process', businessProcess)
        .order('criticality_level', { ascending: false })
        .order('resource');

      if (error) {
        console.error('Error fetching RACI matrix by process:', error);
        return [];
      }

      // Update cache
      this.cache.set(cacheKey, data || []);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

      return data || [];
    } catch (error) {
      console.error('Error in RACI matrix by process service:', error);
      return [];
    }
  }

  /**
   * Get RACI responsibilities by role
   */
  async getResponsibilitiesByRole(role: string): Promise<RoleResponsibility> {
    const allEntries = await this.getRACIMatrix();

    const responsibilities = allEntries.filter(entry =>
      entry.responsible.includes(role)
    );

    const accountable_for = allEntries.filter(entry =>
      entry.accountable.includes(role)
    );

    const consulted_on = allEntries.filter(entry =>
      entry.consulted.includes(role)
    );

    const informed_of = allEntries.filter(entry =>
      entry.informed.includes(role)
    );

    return {
      role,
      responsibilities,
      accountable_for,
      consulted_on,
      informed_of
    };
  }

  /**
   * Get business process mappings
   */
  async getBusinessProcessMappings(): Promise<BusinessProcessMapping[]> {
    const allEntries = await this.getRACIMatrix();

    // Group by business process
    const processMap = new Map<string, RACIMatrixEntry[]>();

    allEntries.forEach(entry => {
      if (!processMap.has(entry.business_process)) {
        processMap.set(entry.business_process, []);
      }
      processMap.get(entry.business_process)!.push(entry);
    });

    // Convert to BusinessProcessMapping
    return Array.from(processMap.entries()).map(([process, permissions]) => {
      const criticalPermissions = permissions
        .filter(p => p.criticality_level === 'critical' || p.compliance_impact)
        .map(p => p.permission_name);

      const complianceRequirements = permissions
        .filter(p => p.compliance_impact || p.audit_required)
        .map(p => `${p.resource}.${p.action}`);

      return {
        process,
        permissions,
        critical_permissions: criticalPermissions,
        compliance_requirements: complianceRequirements
      };
    });
  }

  /**
   * Validate role assignment against RACI matrix
   */
  async validateRoleAssignment(
    targetUserId: string,
    newRoleId: string,
    assignedByUserId: string
  ): Promise<{
    valid: boolean;
    violations: Array<{
      permission: string;
      issue: string;
      recommendation: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const supabase = await createClient();

      // Get role information
      const [{ data: targetRole }, { data: assignerRole }] = await Promise.all([
        supabase
          .from('user_roles')
          .select(`
            role_id,
            roles!inner(name, level)
          `)
          .eq('user_id', targetUserId)
          .single(),
        supabase
          .from('user_roles')
          .select(`
            role_id,
            roles!inner(name, level)
          `)
          .eq('user_id', assignedByUserId)
          .single()
      ]);

      if (!targetRole || !assignerRole) {
        return {
          valid: false,
          violations: [{
            permission: 'assignment',
            issue: 'User role information not found',
            recommendation: 'Verify user roles exist in system'
          }],
          recommendations: ['Verify user roles exist']
        };
      }

      const raciMatrix = await this.getRACIMatrix();
      const violations: Array<{
        permission: string;
        issue: string;
        recommendation: string;
      }> = [];

      const recommendations: string[] = [];

      // Check if assigner has permission to assign this role
      const assignmentPermissions = raciMatrix.filter(entry =>
        entry.resource === 'roles' &&
        entry.action === 'manage' &&
        entry.accountable.includes(assignerRole.roles.name)
      );

      if (assignmentPermissions.length === 0) {
        violations.push({
          permission: 'roles.manage',
          issue: `Role ${assignerRole.roles.name} cannot assign roles`,
          recommendation: 'Only Superadmin can assign roles'
        });
      }

      // Check if target user already has a role
      const existingAssignment = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', targetUserId)
        .single();

      if (existingAssignment) {
        violations.push({
          permission: 'assignment',
          issue: 'Target user already has a role assigned',
          recommendation: 'Revoke existing role before reassignment'
        });
      }

      // Check privilege escalation
      if (targetRole.roles.level > assignerRole.roles.level) {
        violations.push({
          permission: 'privilege_escalation',
          issue: 'Attempt to assign higher privilege role',
          recommendation: 'Cannot assign role with higher privilege level'
        });
      }

      // Validate each permission that comes with the new role
      const rolePermissions = await supabase
        .from('role_permissions')
        .select(`
          role_id,
          permissions!inner(name, resource, action)
        `)
        .eq('role_id', newRoleId);

      if (rolePermissions.data) {
        for (const rp of rolePermissions.data) {
          const raciEntry = raciMatrix.find(entry =>
            entry.permission_name === rp.permissions.name
          );

          if (raciEntry) {
            // Check if role can be responsible for this permission
            if (!raciEntry.responsible.includes(targetRole.roles.name)) {
              violations.push({
                permission: rp.permissions.name,
                issue: `Role ${targetRole.roles.name} cannot be responsible for ${rp.permissions.name}`,
                recommendation: 'Review role-permission assignments'
              });
            }

            // Check for critical permissions requiring approval
            if (raciEntry.criticality_level === 'critical' && !raciEntry.consulted.includes(assignerRole.roles.name)) {
              recommendations.push(`Critical permission ${rp.permissions.name} should be approved by ${assignerRole.roles.name}`);
            }

            if (raciEntry.compliance_impact) {
              recommendations.push(`Compliance impact for ${rp.permissions.name}: ensure audit trail is maintained`);
            }
          }
        }
      }

      return {
        valid: violations.length === 0,
        violations,
        recommendations
      };

    } catch (error) {
      console.error('Error validating role assignment:', error);
      return {
        valid: false,
        violations: [{
          permission: 'validation_error',
          issue: 'Error during validation',
          recommendation: 'Check system configuration'
        }],
        recommendations: ['Contact system administrator']
      };
    }
  }

  /**
   * Generate compliance report for audit
   */
  async generateComplianceReport(): Promise<{
    summary: {
      total_permissions: number;
      critical_permissions: number;
      compliance_permissions: number;
      auditable_permissions: number;
    };
    by_business_process: Array<{
      process: string;
      permissions: number;
      critical: number;
      compliance: number;
      auditable: number;
    }>;
    recommendations: string[];
  }> {
    const raciMatrix = await this.getRACIMatrix();
    const businessProcesses = await this.getBusinessProcessMappings();

    const summary = {
      total_permissions: raciMatrix.length,
      critical_permissions: raciMatrix.filter(p => p.criticality_level === 'critical').length,
      compliance_permissions: raciMatrix.filter(p => p.compliance_impact).length,
      auditable_permissions: raciMatrix.filter(p => p.audit_required).length
    };

    const by_business_process = businessProcesses.map(process => ({
      process: process.process,
      permissions: process.permissions.length,
      critical: process.permissions.filter(p => p.criticality_level === 'critical').length,
      compliance: process.permissions.filter(p => p.compliance_impact).length,
      auditable: process.permissions.filter(p => p.audit_required).length
    }));

    const recommendations: string[] = [];

    // Generate recommendations based on compliance gaps
    if (summary.compliance_permissions > 0 && summary.auditable_permissions / summary.compliance_permissions < 0.8) {
      recommendations.push('Consider increasing audit coverage for compliance-related permissions');
    }

    if (summary.critical_permissions > 0) {
      recommendations.push('Ensure all critical permissions have appropriate approval workflows');
    }

    // Check for permissions without proper RACI assignments
    const emptyAssignments = raciMatrix.filter(entry =>
      entry.responsible.length === 0 ||
      entry.accountable.length === 0
    );

    if (emptyAssignments.length > 0) {
      recommendations.push(`${emptyAssignments.length} permissions lack proper RACI assignments`);
    }

    return {
      summary,
      by_business_process,
      recommendations
    };
  }

  /**
   * Get permissions by criticality level
   */
  async getPermissionsByCriticality(): Promise<{
    critical: RACIMatrixEntry[];
    high: RACIMatrixEntry[];
    medium: RACIMatrixEntry[];
    low: RACIMatrixEntry[];
  }> {
    const raciMatrix = await this.getRACIMatrix();

    return {
      critical: raciMatrix.filter(p => p.criticality_level === 'critical'),
      high: raciMatrix.filter(p => p.criticality_level === 'high'),
      medium: raciMatrix.filter(p => p.criticality_level === 'medium'),
      low: raciMatrix.filter(p => p.criticality_level === 'low')
    };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    const size = this.cache.size;
    const hitRate = size > 0 ? (size / (size + 1)) * 100 : 0;
    return { size, hitRate };
  }
}

// Export singleton instance
export const raciService = new RACIService();