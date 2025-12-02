/**
 * Comprehensive tests for the RACI matrix service
 * Tests role responsibility validation, compliance reporting, and business process mapping
 */

import { describe, it, expect, beforeEach, afterEach, vi, jest, test } from '@jest/globals';
import {
  RACIService,
  raciService,
  type RACIMatrixEntry,
  type RoleResponsibility,
  type BusinessProcessMapping
} from '@/lib/raciService';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

// Mock dependencies
vi.mock('@/lib/supabase');

describe('Servicio RACI - Pruebas Integrales', () => {
  let raciServiceInstance: RACIService;
  let mockSupabase: any;

  beforeEach(() => {
    // Create fresh instance
    raciServiceInstance = new RACIService();

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Setup default RACI matrix data
    setupDefaultRACIData();
  });

  afterEach(() => {
    vi.clearAllMocks();
    raciServiceInstance.clearCache();
  });

  const setupDefaultRACIData = () => {
    const mockRACIData: RACIMatrixEntry[] = [
      {
        id: '1',
        resource: 'users',
        action: 'create',
        permission_name: 'users.create',
        responsible: ['admin', 'superadmin'],
        accountable: ['superadmin'],
        consulted: ['moderador'],
        informed: ['estudiante'],
        business_process: 'user_management',
        criticality_level: 'high',
        compliance_impact: true,
        audit_required: true,
        description: 'Create new users',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        resource: 'users',
        action: 'read',
        permission_name: 'users.read',
        responsible: ['moderador', 'admin', 'superadmin'],
        accountable: ['admin'],
        consulted: [],
        informed: ['estudiante'],
        business_process: 'user_management',
        criticality_level: 'medium',
        compliance_impact: false,
        audit_required: false,
        description: 'Read user information',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        resource: 'roles',
        action: 'assign',
        permission_name: 'roles.assign',
        responsible: ['superadmin'],
        accountable: ['superadmin'],
        consulted: ['admin'],
        informed: ['moderador', 'estudiante'],
        business_process: 'role_management',
        criticality_level: 'critical',
        compliance_impact: true,
        audit_required: true,
        description: 'Assign roles to users',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    mockSupabase.select.mockResolvedValue({
      data: mockRACIData
    });
  };

  describe('RACIService - Basic Operations', () => {
    it('debería obtener matriz RACI completa', async () => {
      const result = await raciServiceInstance.getRACIMatrix();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          resource: expect.any(String),
          action: expect.any(String),
          permission_name: expect.any(String),
          responsible: expect.any(Array),
          accountable: expect.any(Array),
          consulted: expect.any(Array),
          informed: expect.any(Array),
          business_process: expect.any(String),
          criticality_level: expect.any(String),
          compliance_impact: expect.any(Boolean),
          audit_required: expect.any(Boolean),
          description: expect.any(String)
        })
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('raci_matrix');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
    });

    it('debería obtener matriz RACI por proceso de negocio', async () => {
      const process = 'user_management';
      const result = await raciServiceInstance.getRACIMatrixByProcess(process);

      expect(result).toBeInstanceOf(Array);
      expect(mockSupabase.eq).toHaveBeenCalledWith('business_process', process);
    });

    it('debería usar caché para matriz completa', async () => {
      // First call - should hit database
      await raciServiceInstance.getRACIMatrix();

      // Second call - should use cache
      await raciServiceInstance.getRACIMatrix();

      // Should only make one database call
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it('debería usar caché para matriz por proceso', async () => {
      const process = 'user_management';

      // First call - should hit database
      await raciServiceInstance.getRACIMatrixByProcess(process);

      // Second call - should use cache
      await raciServiceInstance.getRACIMatrixByProcess(process);

      // Should only make one database call for this process
      expect(mockSupabase.select).toHaveBeenCalledTimes(1);
    });

    it('debería expirar caché después de 10 minutos', async () => {
      // Mock time to expire cache
      const mockNow = Date.now() + 11 * 60 * 1000; // 11 minutes later
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);

      // First call sets cache
      await raciServiceInstance.getRACIMatrix();

      // Second call should miss cache due to expiration
      await raciServiceInstance.getRACIMatrix();

      // Should make two database calls
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('debería limpiar caché', async () => {
      // Set some cache data
      await raciServiceInstance.getRACIMatrix();

      // Clear cache
      await raciServiceInstance.clearCache();

      // Should make database call again
      await raciServiceInstance.getRACIMatrix();

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('debería obtener estadísticas de caché', () => {
      const stats = raciServiceInstance.getCacheStats();

      expect(stats).toEqual(
        expect.objectContaining({
          size: expect.any(Number),
          hitRate: expect.any(Number)
        })
      );
    });
  });

  describe('RACIService - Role Responsibilities', () => {
    it('debería obtener responsabilidades por rol', async () => {
      const role = 'admin';
      const result = await raciServiceInstance.getResponsibilitiesByRole(role);

      expect(result).toEqual(
        expect.objectContaining({
          role,
          responsibilities: expect.any(Array),
          accountable_for: expect.any(Array),
          consulted_on: expect.any(Array),
          informed_of: expect.any(Array)
        })
      );

      // Filter by role
      result.responsibilities.forEach(responsibility => {
        expect(responsibility.responsible).toContain(role);
      });
    });

    it('debería filtrar responsabilidades correctamente por rol', async () => {
      const role = 'estudiante';
      const result = await raciServiceInstance.getResponsibilitiesByRole(role);

      // Only return entries where estudiante is responsible
      result.responsibilities.forEach(entry => {
        expect(entry.responsible).toContain(role);
      });

      // Check other arrays are filtered appropriately
      result.accountable_for.forEach(entry => {
        expect(entry.accountable).toContain(role);
      });
    });

    it('debería devolver arrays vacíos si no hay responsabilidades', async () => {
      const role = 'nonexistent-role';
      const result = await raciServiceInstance.getResponsibilitiesByRole(role);

      expect(result.responsibilities).toEqual([]);
      expect(result.accountable_for).toEqual([]);
      expect(result.consulted_on).toEqual([]);
      expect(result.informed_of).toEqual([]);
    });
  });

  describe('RACIService - Business Process Mapping', () => {
    it('debería obtener mapeo de procesos de negocio', async () => {
      const result = await raciServiceInstance.getBusinessProcessMappings();

      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toEqual(
        expect.objectContaining({
          process: expect.any(String),
          permissions: expect.any(Array),
          critical_permissions: expect.any(Array),
          compliance_requirements: expect.any(Array)
        })
      );

      // Should group by business process
      const processes = new Set(result.map(mapping => mapping.process));
      expect(processes.size).toBeGreaterThan(0);
    });

    it('debería identificar permisos críticos', async () => {
      const result = await raciServiceInstance.getBusinessProcessMappings();

      result.forEach(mapping => {
        if (mapping.permissions.length > 0) {
          // Critical permissions should have criticality_level === 'critical' or compliance_impact === true
          mapping.critical_permissions.forEach(permissionName => {
            const permission = mapping.permissions.find(p => p.permission_name === permissionName);
            expect(permission).toBeDefined();
            expect(permission!.criticality_level === 'critical' || permission!.compliance_impact).toBe(true);
          });
        }
      });
    });

    it('debería generar requisitos de cumplimiento', async () => {
      const result = await raciServiceInstance.getBusinessProcessMappings();

      result.forEach(mapping => {
        if (mapping.permissions.length > 0) {
          mapping.compliance_requirements.forEach(req => {
            const permission = mapping.permissions.find(p => `${p.resource}.${p.action}` === req);
            expect(permission).toBeDefined();
            expect(permission!.compliance_impact || permission!.audit_required).toBe(true);
          });
        }
      });
    });

    it('debería agrupar correctamente por proceso', async () => {
      const result = await raciServiceInstance.getBusinessProcessMappings();

      // Verify that all permissions in a mapping belong to the same process
      result.forEach(mapping => {
        mapping.permissions.forEach(permission => {
          expect(permission.business_process).toBe(mapping.process);
        });
      });
    });
  });

  describe('RACIService - Role Assignment Validation', () => {
    it('debería validar jerarquía de roles correctamente', async () => {
      // Setup mock user data
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              roles: { name: 'admin', level: 3 }
            }
          ]
        })
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'estudiante-role-uuid',
              roles: { name: 'estudiante', level: 1 }
            }
          ]
        })
      });

      const validation = await raciServiceInstance.validateRoleAssignment(
        'target-user-uuid',
        'estudiante-role-uuid',
        'admin-user-uuid'
      );

      expect(validation).toEqual(
        expect.objectContaining({
          valid: expect.any(Boolean),
          violations: expect.any(Array),
          recommendations: expect.any(Array)
        })
      );
    });

    it('debería prevenir auto-asignación', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              roles: { name: 'admin', level: 3 }
            }
          ]
        })
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              roles: { name: 'admin', level: 3 }
            }
          ]
        })
      });

      const validation = await raciServiceInstance.validateRoleAssignment(
        'admin-user-uuid',
        'admin-role-uuid',
        'admin-user-uuid'
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContainEqual(
        expect.objectContaining({
          permission: 'assignment',
          issue: 'Role admin cannot assign roles'
        })
      );
    });

    it('debería prevenir asignación de roles a usuarios con rol existente', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              roles: { name: 'admin', level: 3 }
            }
          ]
        })
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'existing-assignment'
            }
          ]
        })
      });

      const validation = await raciServiceInstance.validateRoleAssignment(
        'target-user-uuid',
        'estudiante-role-uuid',
        'admin-user-uuid'
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContainEqual(
        expect.objectContaining({
          permission: 'assignment',
          issue: 'Target user already has a role assigned'
        })
      );
    });

    it('debería prevenir escalamiento de privilegios', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              roles: { name: 'admin', level: 3 }
            }
          ]
        })
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'superadmin-role-uuid',
              roles: { name: 'superadmin', level: 4 }
            }
          ]
        })
      });

      const validation = await raciServiceInstance.validateRoleAssignment(
        'target-user-uuid',
        'superadmin-role-uuid', // Higher privilege
        'admin-user-uuid' // Lower privilege admin
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContainEqual(
        expect.objectContaining({
          permission: 'privilege_escalation',
          issue: 'Attempt to assign higher privilege role'
        })
      );
    });

    it('debería validar permisos del rol contra matriz RACI', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              roles: { name: 'admin', level: 3 }
            }
          ]
        })
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              permissions: { name: 'users.read' }
            }
          ]
        })
      });

      // Mock RACI matrix with restriction
      const mockRACI = [
        {
          id: '1',
          resource: 'users',
          action: 'delete',
          permission_name: 'users.delete',
          responsible: ['superadmin'],
          accountable: ['superadmin'],
          consulted: ['admin'],
          informed: [],
          business_process: 'user_management',
          criticality_level: 'high',
          compliance_impact: true,
          audit_required: true,
          description: 'Delete users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      const validation = await raciServiceInstance.validateRoleAssignment(
        'target-user-uuid',
        'admin-role-uuid',
        'superadmin-user-uuid'
      );

      expect(validation.violations).toContainEqual(
        expect.objectContaining({
          permission: 'users.delete',
          issue: 'Role admin cannot be responsible for users.delete'
        })
      );
    });

    it('debería generar recomendaciones para permisos críticos', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              roles: { name: 'admin', level: 3 }
            }
          ]
        })
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            {
              role_id: 'admin-role-uuid',
              permissions: { name: 'users.delete' }
            }
          ]
        })
      });

      // Mock RACI with critical permission that requires consultation
      const mockRACI = [
        {
          id: '1',
          resource: 'users',
          action: 'delete',
          permission_name: 'users.delete',
          responsible: ['admin'],
          accountable: ['superadmin'],
          consulted: ['superadmin'], // Requires consultation from superadmin
          informed: [],
          business_process: 'user_management',
          criticality_level: 'critical',
          compliance_impact: true,
          audit_required: true,
          description: 'Delete users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      const validation = await raciServiceInstance.validateRoleAssignment(
        'target-user-uuid',
        'admin-role-uuid',
        'admin-user-uuid' // Admin assigning, not superadmin
      );

      expect(validation.recommendations).toContain(
        expect.stringContaining('Critical permission users.delete should be approved')
      );
    });

    it('debería manejar errores en validación', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const validation = await raciServiceInstance.validateRoleAssignment(
        'target-user-uuid',
        'admin-role-uuid',
        'admin-user-uuid'
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContainEqual(
        expect.objectContaining({
          permission: 'validation_error',
          issue: 'Error during validation'
        })
      );
    });
  });

  describe('RACIService - Compliance Reporting', () => {
    it('debería generar informe de cumplimiento', async () => {
      const mockRACI = [
        {
          id: '1',
          resource: 'users',
          action: 'read',
          permission_name: 'users.read',
          responsible: ['admin'],
          accountable: ['superadmin'],
          consulted: [],
          informed: ['estudiante'],
          business_process: 'user_management',
          criticality_level: 'medium',
          compliance_impact: false,
          audit_required: false,
          description: 'Read user information',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          resource: 'roles',
          action: 'assign',
          permission_name: 'roles.assign',
          responsible: ['superadmin'],
          accountable: ['superadmin'],
          consulted: ['admin'],
          informed: ['moderador', 'estudiante'],
          business_process: 'role_management',
          criticality_level: 'critical',
          compliance_impact: true,
          audit_required: true,
          description: 'Assign roles to users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      const report = await raciServiceInstance.generateComplianceReport();

      expect(report).toEqual(
        expect.objectContaining({
          summary: expect.any(Object),
          by_business_process: expect.any(Array),
          recommendations: expect.any(Array)
        })
      );

      expect(report.summary.total_permissions).toBe(2);
      expect(report.summary.critical_permissions).toBe(1);
      expect(report.summary.compliance_permissions).toBe(1);
      expect(report.summary.auditable_permissions).toBe(1);
    });

    it('debería generar recomendaciones basadas en brechas de cumplimiento', async () => {
      const mockRACI = [
        {
          id: '1',
          resource: 'sensitive_data',
          action: 'access',
          permission_name: 'sensitive_data.access',
          responsible: ['admin'],
          accountable: ['superadmin'],
          consulted: [],
          informed: [],
          business_process: 'data_access',
          criticality_level: 'critical',
          compliance_impact: true,
          audit_required: false, // No audit required despite compliance impact
          description: 'Access sensitive data',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      const report = await raciServiceInstance.generateComplianceReport();

      expect(report.recommendations).toContain(
        expect.stringContaining('Consider increasing audit coverage')
      );
    });

    it('debería detectar permisos sin asignaciones RACI adecuadas', async () => {
      const mockRACI = [
        {
          id: '1',
          resource: 'users',
          action: 'delete',
          permission_name: 'users.delete',
          responsible: [], // No responsible assigned
          accountable: [], // No accountable assigned
          consulted: [],
          informed: [],
          business_process: 'user_management',
          criticality_level: 'high',
          compliance_impact: true,
          audit_required: true,
          description: 'Delete users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      const report = await raciServiceInstance.generateComplianceReport();

      expect(report.recommendations).toContain(
        expect.stringContaining('permissions lack proper RACI assignments')
      );
    });
  });

  describe('RACIService - Permission Organization', () => {
    it('debería obtener permisos por nivel de criticidad', async () => {
      const mockRACI = [
        {
          id: '1',
          resource: 'users',
          action: 'delete',
          permission_name: 'users.delete',
          responsible: ['superadmin'],
          accountable: ['superadmin'],
          consulted: ['admin'],
          informed: [],
          business_process: 'user_management',
          criticality_level: 'critical',
          compliance_impact: true,
          audit_required: true,
          description: 'Delete users',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          resource: 'users',
          action: 'read',
          permission_name: 'users.read',
          responsible: ['admin'],
          accountable: ['superadmin'],
          consulted: [],
          informed: ['estudiante'],
          business_process: 'user_management',
          criticality_level: 'medium',
          compliance_impact: false,
          audit_required: false,
          description: 'Read user information',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      const result = await raciServiceInstance.getPermissionsByCriticality();

      expect(result).toEqual(
        expect.objectContaining({
          critical: expect.any(Array),
          high: expect.any(Array),
          medium: expect.any(Array),
          low: expect.any(Array)
        })
      );

      expect(result.critical).toHaveLength(1);
      expect(result.critical[0].criticality_level).toBe('critical');

      expect(result.medium).toHaveLength(1);
      expect(result.medium[0].criticality_level).toBe('medium');
    });

    it('debería devolver arrays vacíos para niveles sin permisos', async () => {
      const mockRACI = [
        {
          id: '1',
          resource: 'users',
          action: 'read',
          permission_name: 'users.read',
          responsible: ['admin'],
          accountable: ['superadmin'],
          consulted: [],
          informed: ['estudiante'],
          business_process: 'user_management',
          criticality_level: 'low',
          compliance_impact: false,
          audit_required: false,
          description: 'Read user information',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      const result = await raciServiceInstance.getPermissionsByCriticality();

      expect(result.critical).toEqual([]);
      expect(result.high).toEqual([]);
      expect(result.medium).toEqual([]);
      expect(result.low).toHaveLength(1);
    });
  });

  describe('RACIService - Error Handling', () => {
    it('debería manejar errores de base de datos', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await raciServiceInstance.getRACIMatrix();

      expect(result).toEqual([]);
    });

    it('debería manejar respuestas nulas', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null
      });

      const result = await raciServiceInstance.getRACIMatrix();

      expect(result).toEqual([]);
    });

    it('debería manejar errores en obtención de responsabilidades', async () => {
      // Mock error in getRACIMatrix call
      mockSupabase.select.mockRejectedValue(new Error('Query failed'));

      const result = await raciServiceInstance.getResponsibilitiesByRole('admin');

      expect(result).toEqual(
        expect.objectContaining({
          role: 'admin',
          responsibilities: [],
          accountable_for: [],
          consulted_on: [],
          informed_of: []
        })
      );
    });

    it('debería manejar errores en validación de asignación', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });

      const validation = await raciServiceInstance.validateRoleAssignment(
        'target-user-uuid',
        'admin-role-uuid',
        'admin-user-uuid'
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations).toContainEqual(
        expect.objectContaining({
          permission: 'validation_error',
          issue: 'Error during validation'
        })
      );
    });
  });

  describe('RACIService - Performance Tests', () => {
    it('debería usar caché eficientemente', async () => {
      // First call - should hit database
      await raciServiceInstance.getRACIMatrix();
      const firstCallStats = raciServiceInstance.getCacheStats();

      // Second call - should use cache
      await raciServiceInstance.getRACIMatrix();
      const secondCallStats = raciServiceInstance.getCacheStats();

      // Cache size should be same (hit cache)
      expect(firstCallStats.size).toBeGreaterThan(0);
      expect(firstCallStats.size).toBe(secondCallStats.size);
    });

    it('debería limpiar caché correctamente', () => {
      const initialStats = raciServiceInstance.getCacheStats();
      raciServiceInstance.clearCache();
      const clearedStats = raciServiceInstance.getCacheStats();

      expect(initialStats.size).toBeGreaterThanOrEqual(0);
      expect(clearedStats.size).toBe(0);
    });

    it('debería procesar matriz RACI grande eficientemente', async () => {
      // Generate large RACI matrix
      const largeRACIData = Array.from({ length: 1000 }, (_, i) => ({
        id: `entry-${i}`,
        resource: `resource-${i % 10}`,
        action: ['create', 'read', 'update', 'delete'][i % 4],
        permission_name: `permission-${i}`,
        responsible: ['admin', 'superadmin'],
        accountable: ['superadmin'],
        consulted: [],
        informed: [],
        business_process: `process-${i % 5}`,
        criticality_level: ['low', 'medium', 'high', 'critical'][i % 4],
        compliance_impact: i % 3 === 0,
        audit_required: i % 2 === 0,
        description: `Description ${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      mockSupabase.select.mockResolvedValueOnce({
        data: largeRACIData
      });

      const startTime = Date.now();
      const result = await raciServiceInstance.getRACIMatrix();
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should process in under 1 second
    });

    it('debería generar informe de cumplimiento eficientemente', async () => {
      // Generate compliance data
      const complianceData = Array.from({ length: 500 }, (_, i) => ({
        id: `compliance-${i}`,
        resource: `resource-${i % 10}`,
        action: ['create', 'read', 'update', 'delete'][i % 4],
        permission_name: `permission-${i}`,
        responsible: ['admin'],
        accountable: ['superadmin'],
        consulted: [],
        informed: [],
        business_process: `process-${i % 5}`,
        criticality_level: ['low', 'medium', 'high', 'critical'][i % 4],
        compliance_impact: i % 2 === 0,
        audit_required: i % 3 === 0,
        description: `Compliance description ${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      mockSupabase.select.mockResolvedValueOnce({
        data: complianceData
      });

      mockSupabase.select.mockResolvedValueOnce({
        data: complianceData
      });

      const startTime = Date.now();
      const report = await raciServiceInstance.generateComplianceReport();
      const endTime = Date.now();

      expect(report.summary.total_permissions).toBe(500);
      expect(endTime - startTime).toBeLessThan(2000); // Should generate in under 2 seconds
    });
  });

  describe('RACIService - Integration Tests', () => {
    it('debería integrarse con sistema de permisos existente', async () => {
      const mockRACI = [
        {
          id: '1',
          resource: 'users',
          action: 'read',
          permission_name: 'users.read',
          responsible: ['admin', 'moderador'],
          accountable: ['admin'],
          consulted: [],
          informed: ['estudiante'],
          business_process: 'user_management',
          criticality_level: 'medium',
          compliance_impact: false,
          audit_required: false,
          description: 'Read user information',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRACI
      });

      const result = await raciServiceInstance.getRACIMatrix();

      // Should return structured RACI data
      expect(result).toHaveLength(1);
      expect(result[0].permission_name).toBe('users.read');
      expect(result[0].responsible).toContain('admin');
      expect(result[0].responsible).toContain('moderador');
    });

    it('debería manejar cambios en la matriz RACI', async () => {
      // Initial data
      const initialData = [
        {
          id: '1',
          resource: 'users',
          action: 'read',
          permission_name: 'users.read',
          responsible: ['admin'],
          accountable: ['superadmin'],
          consulted: [],
          informed: ['estudiante'],
          business_process: 'user_management',
          criticality_level: 'medium',
          compliance_impact: false,
          audit_required: false,
          description: 'Read user information',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Updated data
      const updatedData = [
        {
          id: '1',
          resource: 'users',
          action: 'read',
          permission_name: 'users.read',
          responsible: ['admin', 'moderador'], // Added moderador
          accountable: ['superadmin'],
          consulted: [],
          informed: ['estudiante'],
          business_process: 'user_management',
          criticality_level: 'medium',
          compliance_impact: false,
          audit_required: false,
          description: 'Read user information',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // First call
      mockSupabase.select.mockResolvedValueOnce({
        data: initialData
      });

      await raciServiceInstance.getRACIMatrix();

      // Second call with updated data
      mockSupabase.select.mockResolvedValueOnce({
        data: updatedData
      });

      // Time travel to expire cache
      const futureTime = Date.now() + 11 * 60 * 1000;
      vi.spyOn(Date, 'now').mockReturnValue(futureTime);

      const result = await raciServiceInstance.getRACIMatrix();

      // Should reflect updated data
      expect(result[0].responsible).toContain('moderador');
    });
  });
});

export {};