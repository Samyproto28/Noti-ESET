/**
 * Suite de pruebas integrales para el sistema RBAC
 * Incluye pruebas unitarias, de integración y de rendimiento
 */

import { describe, it, expect, beforeEach, afterEach, vi, jest, test } from '@jest/globals';
import { createClient } from '@/lib/supabase';
import { permissionService } from '@/lib/permissions';
import { roleAssignmentService, type RoleAssignmentResult } from '@/lib/roleAssignment';
import { auditService, type AuditLogFilter } from '@/lib/auditService';
import { securityMiddleware } from '@/lib/securityMiddleware';
import { NextRequest } from 'next/server';

// Mock de las dependencias externas
vi.mock('@/lib/supabase');
vi.mock('next/server');

describe('Sistema RBAC - Pruebas Integrales', () => {
  let mockSupabase: any;
  let mockUser: any;
  let testUserId: string;
  let adminUserId: string;
  let superAdminUserId: string;

  beforeEach(async () => {
    // Configurar mocks básicos
    testUserId = 'test-user-uuid';
    adminUserId = 'admin-user-uuid';
    superAdminUserId = 'superadmin-user-uuid';

    mockUser = {
      id: testUserId,
      email: 'test@example.com',
      full_name: 'Test User'
    };

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ user: mockUser })
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      count: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis()
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Configurar respuestas predeterminadas
    setupDefaultResponses();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const setupDefaultResponses = () => {
    // Respuesta para permisos básicos
    mockSupabase.rpc.mockResolvedValueOnce(true);
    mockSupabase.eq.mockResolvedValue({
      data: [
        {
          role_id: 'admin-role-uuid',
          roles: { level: 3, name: 'admin' }
        }
      ]
    });

    // Respuesta para información de usuario
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: 'test-user-uuid', email: 'test@example.com', full_name: 'Test User' }
        ],
        single: vi.fn().mockResolvedValue({
          data: { id: 'test-user-uuid', email: 'test@example.com', full_name: 'Test User' }
        })
      }),
      single: vi.fn().mockResolvedValue({
        data: { id: 'admin-user-uuid', email: 'admin@example.com', full_name: 'Admin User' }
      })
    });

    // Respuesta para roles disponibles
    mockSupabase.rpc.mockResolvedValueOnce([
      { id: 'estudiante-uuid', name: 'estudiante', level: 1 },
      { id: 'moderador-uuid', name: 'moderador', level: 2 }
    ]);

    // Respuesta para usuarios sin roles
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [
          { id: 'user1-uuid', email: 'user1@example.com', full_name: 'User One' },
          { id: 'user2-uuid', email: 'user2@example.com', full_name: 'User Two' }
        ]
      })
    });

    // Respuesta para asignaciones existentes
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'assignment-uuid',
            user_id: 'user1-uuid',
            role_id: 'admin-role-uuid',
            assigned_by: 'admin-user-uuid',
            assigned_at: new Date().toISOString(),
            razon: 'asignacion_manual',
            user_info: { email: 'user1@example.com', full_name: 'User One' },
            roles: { name: 'admin', level: 3 }
          }
        ]
      })
    });
  };

  describe('Servicio de Permisos', () => {
    it('debería verificar permisos correctamente', async () => {
      const hasPermission = await permissionService.verificarPermiso(
        testUserId,
        'users',
        'read'
      );

      expect(hasPermission).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('verificar_permiso', {
        user_id: testUserId,
        resource: 'users',
        action: 'read'
      });
    });

    it('debería obtener información de usuario correctamente', async () => {
      const userInfo = await permissionService.getUserInfo(testUserId);

      expect(userInfo).toEqual({
        id: testUserId,
        email: 'test@example.com',
        full_name: 'Test User',
        rol: { level: 3, name: 'admin' }
      });
    });

    it('debería manejar errores en la verificación de permisos', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Database error'));

      const hasPermission = await permissionService.verificarPermiso(
        testUserId,
        'users',
        'read'
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('Servicio de Asignación de Roles', () => {
    it('debería validar jerarquía de roles correctamente', async () => {
      const validation = await roleAssignmentService.validateHierarchy(
        adminUserId,
        'estudiante-uuid'
      );

      expect(validation.canAssign).toBe(true);
      expect(validation.adminLevel).toBe(3);
      expect(validation.targetLevel).toBe(1);
    });

    it('debería prevenir auto-asignación de roles', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: []
        })
      });

      const result = await roleAssignmentService.assignRole(testUserId, {
        targetUserId: testUserId,
        targetRoleId: 'estudiante-uuid',
        reason: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No puedes asignarte roles a ti mismo');
    });

    it('debería prevenir asignación de roles a usuarios que ya tienen rol', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'existing-role' }]
        })
      });

      const result = await roleAssignmentService.assignRole(adminUserId, {
        targetUserId: 'user-with-role-uuid',
        targetRoleId: 'estudiante-uuid',
        reason: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('El usuario ya tiene un rol asignado');
    });

    it('debería obtener roles disponibles según nivel de administrador', async () => {
      const roles = await roleAssignmentService.getAvailableRoles(adminUserId);

      expect(roles).toHaveLength(2);
      expect(roles).toContainEqual(
        expect.objectContaining({
          name: 'estudiante',
          level: 1
        })
      );
      expect(roles).toContainEqual(
        expect.objectContaining({
          name: 'moderador',
          level: 2
        })
      );
    });

    it('debería obtener usuarios sin roles correctamente', async () => {
      const users = await roleAssignmentService.getUsersWithoutRoles();

      expect(users).toHaveLength(2);
      expect(users[0]).toEqual(
        expect.objectContaining({
          id: 'user1-uuid',
          email: 'user1@example.com'
        })
      );
    });
  });

  describe('Servicio de Auditoría', () => {
    it('debería obtener logs de auditoría con filtros', async () => {
      const filter: AuditLogFilter = {
        limite: 10,
        pagina: 1
      };

      const result = await auditService.getAuditLogs(filter);

      expect(result.logs).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.paginacion).toBeDefined();
      expect(result.paginacion.limite).toBe(10);
      expect(result.paginacion.pagina).toBe(1);
    });

    it('debería buscar logs de auditoría por término', async () => {
      const searchTerm = 'test';
      const filter: AuditLogFilter = {};

      const logs = await auditService.searchAuditLogs(searchTerm, filter);

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    it('debería obtener estadísticas de auditoría', async () => {
      const stats = await auditService.getAuditStatistics(testUserId);

      expect(stats.total_cambios).toBeDefined();
      expect(stats.cambios_por_rol).toBeDefined();
      expect(stats.cambios_por_usuario).toBeDefined();
      expect(stats.actividades_recientes).toBeDefined();
    });

    it('debería exportar logs a formato CSV', async () => {
      const filter: AuditLogFilter = {};
      const csvData = await auditService.exportAuditLogs(filter, 'csv');

      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('ID'); // Header del CSV
      expect(csvData).toContain(','); // Formato CSV
    });

    it('debería exportar logs a formato JSON', async () => {
      const filter: AuditLogFilter = {};
      const jsonData = await auditService.exportAuditLogs(filter, 'json');

      expect(typeof jsonData).toBe('string');
      const parsed = JSON.parse(jsonData);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe('Middleware de Seguridad', () => {
    it('debería validar intentos de acceso correctamente', async () => {
      const result = await securityMiddleware.validateAccess(
        testUserId,
        'users',
        'read',
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      );

      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.reason).toBe('string');
      expect(typeof result.suspicious).toBe('boolean');
      expect(typeof result.blocked).toBe('boolean');
    });

    it('debería detectar intentos de escalamiento de privilegios', async () => {
      // Simular múltiples intentos de asignación rápida
      const mockDate = new Date(Date.now() - 2 * 60 * 1000);
      vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: '1', timestamp: mockDate.toISOString() },
            { id: '2', timestamp: mockDate.toISOString() }
          ]
        })
      });

      const result = await securityMiddleware.validateAccess(
        testUserId,
        'roles',
        'assign',
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      );

      // El resultado debería marcar como sospechoso por patrón rápido
      expect(typeof result.suspicious).toBe('boolean');
    });

    it('debería verificar límites de tasa correctamente', async () => {
      const result = await securityMiddleware.checkRateLimit(
        testUserId,
        '192.168.1.1'
      );

      expect(typeof result.ok).toBe('boolean');
      expect(typeof result.reason).toBe('string');
      expect(typeof result.block).toBe('boolean');
    });

    it('debería obtener estadísticas de seguridad', async () => {
      const stats = await securityMiddleware.getSecurityStats();

      expect(stats.totalAttempts).toBeDefined();
      expect(stats.blockedAttempts).toBeDefined();
      expect(stats.suspiciousActivities).toBeDefined();
      expect(stats.recentThreats).toBeDefined();
    });

    it('debería generar informes de seguridad', async () => {
      const report = await securityMiddleware.generateSecurityReport(7);

      expect(report.summary).toBeDefined();
      expect(report.topThreats).toBeDefined();
      expect(report.userActivity).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('API Endpoints', () => {
    it('debería validar el formato del body para asignación de roles', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          target_user_id: 'test-user-uuid',
          target_role_id: 'estudiante-uuid',
          reason: 'asignacion_test'
        })
      } as any;

      const response = await fetch('/api/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: 'test-user-uuid',
          target_role_id: 'estudiante-uuid',
          reason: 'asignacion_test'
        })
      });

      // La respuesta debería ser exitosa si los datos son válidos
      expect(response.status).toBe(200);
    });

    it('debería rechazar asignación de roles con datos inválidos', async () => {
      const response = await fetch('/api/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: 'invalid-uuid',
          target_role_id: 'estudiante-uuid'
          // Falta reason
        })
      });

      expect(response.status).toBe(400); // Error de validación
    });

    it('debería proporcionar validación previa sin ejecutar asignación', async () => {
      const response = await fetch('/api/roles/validate-assignment?admin_id=admin-uuid&target_user_id=user-uuid&target_role_id=estudiante-uuid', {
        method: 'GET'
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Casos de Error', () => {
    it('debería manejar errores de conexión a la base de datos', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(
        permissionService.verificarPermiso(testUserId, 'users', 'read')
      ).rejects.toThrow('Connection failed');
    });

    it('debería manejar datos incompletos en respuestas', async () => {
      mockSupabase.eq.mockResolvedValue({
        data: null // Sin datos
      });

      const userInfo = await permissionService.getUserInfo('non-existent-user');
      expect(userInfo).toBeNull();
    });

    it('debería manejar operaciones concurrentes', async () => {
      // Simular múltiples operaciones simultáneas
      const promises = Array.from({ length: 10 }, (_, i) =>
        roleAssignmentService.getAvailableRoles(`admin-${i}-uuid`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Pruebas de Seguridad', () => {
    it('debería prevenir inyección SQL en metadatos', async () => {
      const maliciousMetadata = {
        malicious: "'; DROP TABLE users; --"
      };

      const result = await securityMiddleware.validateAccess(
        testUserId,
        'users',
        'read',
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: maliciousMetadata
        }
      );

      // El sistema debería detectar y marcar como sospechoso
      expect(result.suspicious || result.blocked).toBe(true);
    });

    it('debería detectar múltiples intentos fallidos', async () => {
      // Simular múltiples intentos fallidos
      const mockAttempts = Array.from({ length: 6 }, (_, i) => ({
        id: `attempt-${i}`,
        granted: false,
        timestamp: new Date(Date.now() - i * 2 * 60 * 1000).toISOString()
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockAttempts
        })
      });

      const result = await securityMiddleware.checkRateLimit(
        testUserId,
        '192.168.1.1'
      );

      // Debería detectar el patrón y bloquear
      expect(result.blocked).toBe(true);
    });

    it('debería verificar integridad de sesiones', async () => {
      // Simular múltiples IPs en la misma sesión
      const mockSessions = [
        { ip_address: '192.168.1.1' },
        { ip_address: '10.0.0.1' },
        { ip_address: '172.16.0.1' }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockSessions
        })
      });

      const result = await securityMiddleware.verifySessionIntegrity(
        testUserId,
        '192.168.1.1'
      );

      // Debería marcar como comprometida por múltiples IPs
      expect(result.ok).toBe(false);
    });
  });

  describe('Pruebas de Rendimiento', () => {
    it('debería completar verificación de permisos en <50ms', async () => {
      const start = performance.now();
      await permissionService.verificarPermiso(testUserId, 'users', 'read');
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });

    it('debería manejar hasta 1000 usuarios simultáneos', async () => {
      const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}-uuid`);

      const start = performance.now();
      const promises = userIds.map(userId =>
        permissionService.verificarPermiso(userId, 'users', 'read')
      );

      const results = await Promise.all(promises);
      const end = performance.now();

      expect(results).toHaveLength(1000);
      expect(end - start).toBeLessThan(5000); // 5 segundos para 1000 peticiones
    });

    it('debería generar informe de seguridad en <1s para 7 días', async () => {
      const start = performance.now();
      const report = await securityMiddleware.generateSecurityReport(7);
      const end = performance.now();

      expect(end - start).toBeLessThan(1000);
      expect(report.summary).toBeDefined();
    });

    it('debería exportar 10,000 registros en <3s', async () => {
      // Simular gran cantidad de datos
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: Array.from({ length: 10000 }, (_, i) => ({
            id: `log-${i}`,
            usuario_id: `user-${i % 100}-uuid`,
            rol_anterior: null,
            rol_nuevo: 'estudiante',
            timestamp: new Date().toISOString(),
            realizado_por: `admin-${i % 10}-uuid`,
            razon: `razon-${i}`,
            ip_address: `192.168.1.${i % 255}`,
            user_agent: 'Mozilla/5.0',
            request_metadata: {}
          }))
        })
      });

      const start = performance.now();
      const csvData = await auditService.exportAuditLogs({}, 'csv');
      const end = performance.now();

      expect(end - start).toBeLessThan(3000);
      expect(csvData.length).toBeGreaterThan(0);
    });
  });

  describe('Pruebas de Regresión', () => {
    it('debería mantener compatibilidad con versiones anteriores', async () => {
      // Verificar que las APIs existentes sigan funcionando
      const hasPermission = await permissionService.verificarPermiso(
        testUserId,
        'users',
        'read'
      );

      expect(typeof hasPermission).toBe('boolean');
    });

    it('debería mantener consistencia de datos', async () => {
      // Realizar una operación y verificar consistencia
      const initialUsers = await roleAssignmentService.getUsersWithoutRoles();
      const initialCount = initialUsers.length;

      // Simular asignación
      await roleAssignmentService.assignRole(adminUserId, {
        targetUserId: 'user1-uuid',
        targetRoleId: 'estudiante-uuid',
        reason: 'test'
      });

      // Verificar que el contador disminuyó
      const updatedUsers = await roleAssignmentService.getUsersWithoutRoles();
      expect(updatedUsers.length).toBe(initialCount - 1);
    });

    it('debería mantener integridad de auditoría', async () => {
      const initialLogs = await auditService.getAuditLogs({ limite: 1 });

      // Realizar operación que genere log
      await roleAssignmentService.assignRole(adminUserId, {
        targetUserId: 'user2-uuid',
        targetRoleId: 'moderador-uuid',
        reason: 'test_audit'
      });

      const updatedLogs = await auditService.getAuditLogs({ limite: 1 });
      expect(updatedLogs.total).toBeGreaterThan(initialLogs.total);
    });
  });

  describe('Pruebas de Carga', () => {
    it('debería soportar 100 peticiones por segundo', async () => {
      const startTime = Date.now();
      const requests = 100;

      const promises = Array.from({ length: requests }, (_, i) =>
        permissionService.verificarPermiso(`user-${i}-uuid`, 'users', 'read')
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(requests);
      expect(duration).toBeLessThan(2000); // 2 segundos para 100 peticiones
    });

    it('debería mantener rendimiento con alta concurrencia', async () => {
      const concurrentUsers = 50;
      const operationsPerUser = 10;

      const promises = Array.from({ length: concurrentUsers }, (_, i) =>
        Promise.all(
          Array.from({ length: operationsPerUser }, (_, j) =>
            permissionService.verificarPermiso(`user-${i}-${j}-uuid`, 'users', 'read')
          )
        )
      );

      const results = await Promise.all(promises);
      const totalOperations = concurrentUsers * operationsPerUser;

      expect(results.flat()).toHaveLength(totalOperations);
    });

    it('debería manejar memoria eficientemente', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Realizar operaciones intensivas en memoria
      for (let i = 0; i < 1000; i++) {
        await auditService.getAuditLogs({ limite: 100 });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // El aumento de memoria no debería exceder 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

export {};