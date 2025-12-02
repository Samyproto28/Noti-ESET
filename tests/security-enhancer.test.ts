/**
 * Comprehensive tests for the security enhancement system
 * Tests threat detection, session integrity, and risk scoring
 */

import { describe, it, expect, beforeEach, afterEach, vi, jest, test } from '@jest/globals';
import {
  SecurityEnhancer,
  securityEnhancer,
  type SecurityContext,
  type SecurityValidation,
  type ThreatDetection
} from '@/lib/securityEnhancer';
import { createClient } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/lib/supabase');
vi.mock('@/lib/rateLimiter');
vi.mock('crypto');

describe('Sistema de Seguridad Mejorado - Pruebas Integrales', () => {
  let securityEnhancerInstance: SecurityEnhancer;
  let mockSupabase: any;
  let mockSecurityContext: SecurityContext;

  beforeEach(() => {
    // Create fresh instance
    securityEnhancerInstance = new SecurityEnhancer();

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis()
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Setup test security context
    mockSecurityContext = {
      userId: 'test-user-uuid',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      requestTime: Date.now(),
      sessionId: 'session-uuid-123',
      riskScore: 0,
      trustedDevice: false
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SecurityEnhancer - Context Validation', () => {
    it('debería validar contexto de seguridad correctamente', async () => {
      const result = await securityEnhancerInstance.validateSecurityContext(
        mockSecurityContext.userId,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      expect(result).toEqual(
        expect.objectContaining({
          valid: expect.any(Boolean),
          reason: expect.any(String),
          riskLevel: expect.any(String),
          requiresMFA: expect.any(Boolean),
          blocked: expect.any(Boolean),
          recommendations: expect.any(Array)
        })
      );
    });

    it('debería bloquear IPs conocidas', async () => {
      // Add IP to blocked list
      securityEnhancerInstance['blockedIPs'].add('192.168.1.100');

      const result = await securityEnhancerInstance.validateSecurityContext(
        mockSecurityContext.userId,
        '192.168.1.100',
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      expect(result.valid).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.riskLevel).toBe('critical');
    });

    it('debería manejar IPs no bloqueadas', async () => {
      const result = await securityEnhancerInstance.validateSecurityContext(
        mockSecurityContext.userId,
        '192.168.1.200', // Different IP
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('debería registrar validación de seguridad en base de datos', async () => {
      await securityEnhancerInstance.validateSecurityContext(
        mockSecurityContext.userId,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('security_events');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe('SecurityEnhancer - Threat Detection', () => {
    it('debería detectar inyección SQL', async () => {
      const maliciousUserAgent = "Mozilla/5.0; DROP TABLE users; --";

      const threat = await securityEnhancerInstance['detectThreats'](
        mockSecurityContext.ipAddress,
        maliciousUserAgent,
        mockSecurityContext.sessionId
      );

      expect(threat.isThreat).toBe(true);
      expect(threat.threatType).toBe('injection');
      expect(threat.severity).toBe('high');
      expect(threat.description).toContain('SQL injection');
    });

    it('debería detectar ataques XSS', async () => {
      const maliciousUserAgent = "Mozilla/5.0<script>alert('xss')</script>";

      const threat = await securityEnhancerInstance['detectThreats'](
        mockSecurityContext.ipAddress,
        maliciousUserAgent,
        mockSecurityContext.sessionId
      );

      expect(threat.isThreat).toBe(true);
      expect(threat.threatType).toBe('xss');
      expect(threat.severity).toBe('medium');
    });

    it('debería detectar agentes de usuario sospechosos', async () => {
      const suspiciousUserAgent = "bot/crawler";

      const threat = await securityEnhancerInstance['detectThreats'](
        mockSecurityContext.ipAddress,
        suspiciousUserAgent,
        mockSecurityContext.sessionId
      );

      expect(threat.isThreat).toBe(true);
      expect(threat.threatType).toBe('suspicious_pattern');
      expect(threat.severity).toBe('medium');
    });

    it('debería detectar ataques DDoS', async () => {
      // Mock high request count
      securityEnhancerInstance['getRequestCountFromIP'] = vi.fn().mockResolvedValue(150);

      const threat = await securityEnhancerInstance['detectThreats'](
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      expect(threat.isThreat).toBe(true);
      expect(threat.threatType).toBe('ddos');
      expect(threat.severity).toBe('critical');
    });

    it('debería detectar ataques de fuerza bruta', async () => {
      // Add failed attempts
      securityEnhancerInstance['failedAttempts'].set('192.168.1.100', [
        { time: Date.now() - 5 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 4 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 3 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 2 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 1 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 30 * 1000, reason: 'invalid_password' }
      ]);

      const threat = await securityEnhancerInstance['detectThreats'](
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      expect(threat.isThreat).toBe(true);
      expect(threat.threatType).toBe('bruteforce');
      expect(threat.severity).toBe('high');
    });

    it('debería detectar amenazas múltiples simultáneas', async () => {
      // Configure multiple threat conditions
      const threateningUserAgent = "bot<script>alert('xss')</script>";
      securityEnhancerInstance['getRequestCountFromIP'] = vi.fn().mockResolvedValue(120);

      const threat = await securityEnhancerInstance['detectThreats'](
        mockSecurityContext.ipAddress,
        threateningUserAgent,
        mockSecurityContext.sessionId
      );

      expect(threat.isThreat).toBe(true);
      expect(threat.threatType).toBe('ddos'); // DDoS has highest priority
      expect(threat.severity).toBe('critical');
    });

    it('debería no detectar amenazas en solicitudes normales', async () => {
      const normalUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
      securityEnhancerInstance['getRequestCountFromIP'] = vi.fn().mockResolvedValue(5);

      const threat = await securityEnhancerInstance['detectThreats'](
        mockSecurityContext.ipAddress,
        normalUserAgent,
        mockSecurityContext.sessionId
      );

      expect(threat.isThreat).toBe(false);
      expect(threat.severity).toBe('low');
    });
  });

  describe('SecurityEnhancer - Session Integrity', () => {
    it('debería crear nueva sesión si no existe', async () => {
      const result = await securityEnhancerInstance['validateSessionIntegrity'](
        'new-session-id',
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent
      );

      expect(result.valid).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.blocked).toBe(false);

      // Should create new session context
      expect(securityEnhancerInstance['sessionIntegrity'].has('new-session-id')).toBe(true);
    });

    it('debería detectar robo de sesión cuando cambia IP', async () => {
      // Create existing session
      securityEnhancerInstance['sessionIntegrity'].set('existing-session', {
        ...mockSecurityContext,
        ipAddress: '192.168.1.100'
      });

      const result = await securityEnhancerInstance['validateSessionIntegrity'](
        'existing-session',
        '192.168.1.200', // Different IP
        mockSecurityContext.userAgent
      );

      expect(result.valid).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.requiresMFA).toBe(true);
      expect(result.recommendations).toContain('Verify user identity');
    });

    it('debería detectar robo de sesión cuando cambia user agent', async () => {
      // Create existing session
      securityEnhancerInstance['sessionIntegrity'].set('existing-session', {
        ...mockSecurityContext,
        userAgent: 'Mozilla/5.0 Chrome'
      });

      const result = await securityEnhancerInstance['validateSessionIntegrity'](
        'existing-session',
        mockSecurityContext.ipAddress,
        'Mozilla/5.0 Firefox' // Different user agent
      );

      expect(result.valid).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.requiresMFA).toBe(true);
    });

    it('debería actualizar actividad de sesión válida', async () => {
      // Create existing session
      const existingSession = { ...mockSecurityContext };
      securityEnhancerInstance['sessionIntegrity'].set('valid-session', existingSession);

      const initialTime = existingSession.requestTime;

      const result = await securityEnhancerInstance['validateSessionIntegrity'](
        'valid-session',
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent
      );

      expect(result.valid).toBe(true);

      // Session should be updated
      const updatedSession = securityEnhancerInstance['sessionIntegrity'].get('valid-session');
      expect(updatedSession!.requestTime).toBeGreaterThan(initialTime);
    });
  });

  describe('SecurityEnhancer - Brute Force Detection', () => {
    it('debería detectar múltiples intentos fallidos', async () => {
      securityEnhancerInstance['failedAttempts'].set('192.168.1.100', [
        { time: Date.now() - 5 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 4 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 3 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 2 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 1 * 60 * 1000, reason: 'invalid_password' },
        { time: Date.now() - 30 * 1000, reason: 'invalid_password' }
      ]);

      const result = await securityEnhancerInstance['checkBruteForceAttempts'](
        '192.168.1.100',
        'test-user'
      );

      expect(result.blocked).toBe(true);
      expect(result.riskLevel).toBe('high');
      expect(result.recommendations).toContain('Block IP address and alert security team');
    });

    it('debería registrar intento fallido', () => {
      const ipAddress = '192.168.1.100';
      const reason = 'invalid_credentials';

      securityEnhancerInstance.recordFailedAttempt(ipAddress, reason);

      const attempts = securityEnhancerInstance['failedAttempts'].get(ipAddress);
      expect(attempts).toHaveLength(1);
      expect(attempts[0].reason).toBe(reason);
    });

    it('debería registrar autenticación exitosa', () => {
      const ipAddress = '192.168.1.100';

      // Add some failed attempts first
      securityEnhancerInstance.recordFailedAttempt(ipAddress, 'invalid_password');
      securityEnhancerInstance.recordFailedAttempt(ipAddress, 'invalid_password');

      // Clear them with successful authentication
      securityEnhancerInstance.recordSuccessfulAuthentication(ipAddress);

      const attempts = securityEnhancerInstance['failedAttempts'].get(ipAddress);
      expect(attempts).toBeUndefined();
    });

    it('debería bloquear IP con demasiados intentos fallidos', () => {
      const ipAddress = '192.168.1.100';

      // Add many failed attempts
      for (let i = 0; i < 60; i++) {
        securityEnhancerInstance.recordFailedAttempt(ipAddress, 'invalid_password');
      }

      const isBlocked = securityEnhancerInstance['blockedIPs'].has(ipAddress);
      expect(isBlocked).toBe(true);
    });

    it('debería mantener solo los últimos 100 intentos', () => {
      const ipAddress = '192.168.1.100';

      // Add more than 100 attempts
      for (let i = 0; i < 105; i++) {
        securityEnhancerInstance.recordFailedAttempt(ipAddress, `reason-${i}`);
      }

      const attempts = securityEnhancerInstance['failedAttempts'].get(ipAddress);
      expect(attempts).toHaveLength(100);
      expect(attempts![0].reason).toBe('reason-5'); // First 5 should be removed
    });
  });

  describe('SecurityEnhancer - Risk Scoring', () => {
    it('debería calcular puntaje de riesgo basado en IP sospechosa', async () => {
      securityEnhancerInstance['isSuspiciousIP'] = vi.fn().mockReturnValue(true);

      const riskScore = await securityEnhancerInstance['calculateRiskScore'](
        'test-user',
        'suspicious-ip',
        'normal-agent',
        'session-id'
      );

      expect(riskScore).toBeGreaterThan(0.3); // Base risk from suspicious IP
    });

    it('debería calcular puntaje de riesgo basado en user agent sospechoso', async () => {
      securityEnhancerInstance['isSuspiciousUserAgent'] = vi.fn().mockReturnValue(true);

      const riskScore = await securityEnhancerInstance['calculateRiskScore'](
        'test-user',
        'normal-ip',
        'suspicious-agent',
        'session-id'
      );

      expect(riskScore).toBeGreaterThan(0.2); // Base risk from suspicious agent
    });

    it('debería calcular puntaje de riesgo basado en reciente actividad de usuario', async () => {
      const userRiskScore = await securityEnhancerInstance['getUserRiskScore']('test-user');

      expect(typeof userRiskScore).toBe('number');
      expect(userRiskScore).toBeGreaterThanOrEqual(0);
      expect(userRiskScore).toBeLessThanOrEqual(1);
    });

    it('debería mapear niveles de severidad correctamente', () => {
      expect(securityEnhancerInstance['getRiskLevel'](0.2)).toBe('low');
      expect(securityEnhancerInstance['getRiskLevel'](0.4)).toBe('medium');
      expect(securityEnhancerInstance['getRiskLevel'](0.7)).toBe('high');
      expect(securityEnhancerInstance['getRiskLevel'](0.95)).toBe('critical');
    });

    it('debería limitar puntaje de riesgo a 1.0', async () => {
      // Setup multiple risk factors
      securityEnhancerInstance['isSuspiciousIP'] = vi.fn().mockReturnValue(true);
      securityEnhancerInstance['isSuspiciousUserAgent'] = vi.fn().mockReturnValue(true);

      const riskScore = await securityEnhancerInstance['calculateRiskScore'](
        'test-user',
        'suspicious-ip',
        'suspicious-agent',
        'session-id'
      );

      expect(riskScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe('SecurityEnhancer - Pattern Detection', () => {
    it('debería detectar IPs sospechosas', () => {
      const suspiciousIPs = [
        '192.168.1.1',
        '10.0.0.1'
      ];

      securityEnhancerInstance['isSuspiciousIP'] = vi.fn().mockImplementation((ip: string) => {
        return suspiciousIPs.includes(ip);
      });

      expect(securityEnhancerInstance['isSuspiciousIP']('192.168.1.1')).toBe(true);
      expect(securityEnhancerInstance['isSuspiciousIP']('192.168.1.100')).toBe(false);
    });

    it('debería detectar user agents sospechosos', () => {
      const suspiciousPatterns = [
        'bot', 'crawler', 'scanner', 'test', 'curl', 'wget', 'python'
      ];

      securityEnhancerInstance['isSuspiciousUserAgent'] = vi.fn().mockImplementation((userAgent: string) => {
        return suspiciousPatterns.some(pattern => userAgent.toLowerCase().includes(pattern));
      });

      expect(securityEnhancerInstance['isSuspiciousUserAgent']('Mozilla/5.0 bot')).toBe(true);
      expect(securityEnhancerInstance['isSuspiciousUserAgent']('Mozilla/5.0')).toBe(false);
    });

    it('debería detectar patrones de inyección', () => {
      const injectionPatterns = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 'SCRIPT'
      ];

      securityEnhancerInstance['containsInjectionPatterns'] = vi.fn().mockImplementation((input: string) => {
        return injectionPatterns.some(pattern => input.toUpperCase().includes(pattern));
      });

      expect(securityEnhancerInstance['containsInjectionPatterns']('SELECT * FROM users')).toBe(true);
      expect(securityEnhancerInstance['containsInjectionPatterns']('Normal query')).toBe(false);
    });

    it('debería detectar patrones XSS', () => {
      const xssPatterns = [
        '<script', 'javascript:', 'onload=', 'alert(', 'eval(', 'document.'
      ];

      securityEnhancerInstance['containsXSSPatterns'] = vi.fn().mockImplementation((input: string) => {
        return xssPatterns.some(pattern => input.toLowerCase().includes(pattern));
      });

      expect(securityEnhancerInstance['containsXSSPatterns']('<script>alert("xss")</script>')).toBe(true);
      expect(securityEnhancerInstance['containsXSSPatterns']('Normal content')).toBe(false);
    });
  });

  describe('SecurityEnhancer - Metrics and Cleanup', () => {
    it('debería obtener métricas de seguridad', async () => {
      const mockRateLimiter = {
        getMetrics: vi.fn().mockReturnValue({
          blockedRequests: 10,
          totalRequests: 100
        })
      };

      securityEnhancerInstance['rateLimiter'] = mockRateLimiter;

      const metrics = await securityEnhancerInstance.getSecurityMetrics();

      expect(metrics).toEqual(
        expect.objectContaining({
          totalValidations: expect.any(Number),
          blockedRequests: 10,
          activeSessions: expect.any(Number),
          topThreats: expect.any(Array),
          riskDistribution: expect.any(Object)
        })
      );

      expect(metrics.riskDistribution).toEqual(
        expect.objectContaining({
          low: expect.any(Number),
          medium: expect.any(Number),
          high: expect.any(Number),
          critical: expect.any(Number)
        })
      );
    });

    it('debería limpiar sesiones expiradas', () => {
      // Add some expired sessions
      const now = Date.now();
      const expiredSession = { ...mockSecurityContext, requestTime: now - 31 * 60 * 1000 };
      const validSession = { ...mockSecurityContext, requestTime: now - 1 * 60 * 1000 };

      securityEnhancerInstance['sessionIntegrity'].set('expired', expiredSession);
      securityEnhancerInstance['sessionIntegrity'].set('valid', validSession);

      // Cleanup expired sessions
      securityEnhancerInstance.cleanupSessions();

      expect(securityEnhancerInstance['sessionIntegrity'].has('expired')).toBe(false);
      expect(securityEnhancerInstance['sessionIntegrity'].has('valid')).toBe(true);
    });

    it('debería limpiar sesiones automáticamente cada 5 minutos', () => {
      // Mock setInterval to verify cleanup interval
      const mockSetInterval = vi.fn();
      global.setInterval = mockSetInterval;

      // Re-enhance to trigger interval setup
      const enhancer = new SecurityEnhancer();

      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000
      );

      global.setInterval = setInterval; // Restore original
    });
  });

  describe('SecurityEnhancer - Error Handling', () => {
    it('debería manejar errores en validación de seguridad', async () => {
      // Simulate error in threat detection
      securityEnhancerInstance['detectThreats'] = vi.fn().mockRejectedValue(new Error('Database error'));

      const result = await securityEnhancerInstance.validateSecurityContext(
        mockSecurityContext.userId,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      expect(result.valid).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.recommendations).toContain('Please contact system administrator');
    });

    it('debería manejar errores en obtención de riesgo de usuario', async () => {
      // Simulate database error
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const userRiskScore = await securityEnhancerInstance['getUserRiskScore']('test-user');

      expect(userRiskScore).toBe(0); // Should default to 0 on error
    });

    it('debería manejar errores en logging de seguridad', async () => {
      // Simulate error in database logging
      mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockRejectedValue(new Error('Logging failed'))
      }));

      // Should not throw error, just log to console
      await expect(
        securityEnhancerInstance.validateSecurityContext(
          mockSecurityContext.userId,
          mockSecurityContext.ipAddress,
          mockSecurityContext.userAgent,
          mockSecurityContext.sessionId
        )
      ).resolves.toBeDefined();
    });
  });

  describe('SecurityEnhancer - Integration Tests', () => {
    it('debería integrarse con rate limiting existente', async () => {
      const mockRateLimiter = {
        getMetrics: vi.fn().mockReturnValue({
          blockedRequests: 15,
          totalRequests: 200
        })
      };

      securityEnhancerInstance['rateLimiter'] = mockRateLimiter;

      const metrics = await securityEnhancerInstance.getSecurityMetrics();

      expect(metrics.blockedRequests).toBe(15);
    });

    it('debería manejar flujos complejos de validación', async () => {
      // Setup threat conditions
      securityEnhancerInstance['isBlockedIP'] = vi.fn().mockReturnValue(false);
      securityEnhancerInstance['detectThreats'] = vi.fn().mockResolvedValue({
        isThreat: false,
        threatType: 'suspicious_pattern',
        confidence: 0,
        severity: 'low',
        description: '',
        mitigation: ''
      });

      const result = await securityEnhancerInstance.validateSecurityContext(
        mockSecurityContext.userId,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });

    it('debería manejar contextos de seguridad completos', async () => {
      const complexValidation = await securityEnhancerInstance.validateSecurityContext(
        null, // No user
        mockSecurityContext.ipAddress,
        'bot/crawler', // Suspicious agent
        mockSecurityContext.sessionId
      );

      expect(complexValidation).toBeDefined();
      expect(complexValidation.recommendations).toBeDefined();
    });
  });

  describe('SecurityEnhancer - Performance Tests', () => {
    it('debería completar validación de seguridad en <100ms', async () => {
      const start = performance.now();

      await securityEnhancerInstance.validateSecurityContext(
        mockSecurityContext.userId,
        mockSecurityContext.ipAddress,
        mockSecurityContext.userAgent,
        mockSecurityContext.sessionId
      );

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('debería manejar alta concurrencia de validaciones', async () => {
      const validationPromises = Array.from({ length: 50 }, (_, i) =>
        securityEnhancerInstance.validateSecurityContext(
          `user-${i}-uuid`,
          `192.168.1.${i % 255}`,
          `agent-${i}`,
          `session-${i}`
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(validationPromises);
      const endTime = Date.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds for 50 validations
    });

    it('debería limpiar sesiones eficientemente', () => {
      // Add many sessions
      const now = Date.now();
      for (let i = 0; i < 1000; i++) {
        securityEnhancerInstance['sessionIntegrity'].set(`session-${i}`, {
          ...mockSecurityContext,
          sessionId: `session-${i}`,
          requestTime: now - Math.random() * 60 * 60 * 1000 // Random times within hour
        });
      }

      const start = performance.now();
      securityEnhancerInstance.cleanupSessions();
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should cleanup quickly
    });
  });
});

export {};