/**
 * Comprehensive tests for the security metrics API
 * Tests system health calculation, recommendations, and event tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi, jest, test } from '@jest/globals';
import { NextRequest } from 'next/server';
import { securityMiddleware } from '@/lib/securityMiddleware';
import { rateLimiter, adaptiveRateLimiter } from '@/lib/rateLimiter';
import { securityEnhancer } from '@/lib/securityEnhancer';

// Mock dependencies
vi.mock('@/lib/securityMiddleware');
vi.mock('@/lib/rateLimiter');
vi.mock('@/lib/securityEnhancer');
vi.mock('@/lib/supabase');
vi.mock('next/server');

describe('API de Métricas de Seguridad - Pruebas Integrales', () => {
  let mockRequest: any;
  let mockSupabase: any;

  beforeEach(() => {
    // Setup mock request
    mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('Bearer test-token')
      }
    } as unknown as NextRequest;

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    };

    const { createClient } = require('@/lib/supabase');
    (createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          user: {
            email: 'superadmin@notieset.com',
            id: 'superadmin-uuid'
          }
        })
      },
      ...mockSupabase
    });

    // Setup mock auth user for admin access
    const { createClient: createServerClient } = require('@/lib/supabase');
    (createServerClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          user: {
            email: 'admin@notieset.com',
            id: 'admin-uuid'
          }
        })
      },
      ...mockSupabase
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/security/metrics - Authentication', () => {
    it('debería rechazar solicitudes sin autenticación', async () => {
      // Mock no authenticated user
      const { createClient } = require('@/lib/supabase');
      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            user: null
          })
        },
        ...mockSupabase
      });

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized - Insufficient permissions');
    });

    it('debería rechazar usuarios sin permisos suficientes', async () => {
      // Mock regular user with insufficient permissions
      const { createClient } = require('@/lib/supabase');
      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            user: {
              email: 'regular@notieset.com',
              id: 'regular-uuid'
            }
          })
        },
        ...mockSupabase
      });

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized - Insufficient permissions');
    });

    it('debería permitir acceso a superadmin', async () => {
      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('debería permitir acceso a admin', async () => {
      // Mock admin user
      const { createClient } = require('@/lib/supabase');
      (createClient as jest.Mock).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            user: {
              email: 'admin@notieset.com',
              id: 'admin-uuid'
            }
          })
        },
        ...mockSupabase
      });

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/security/metrics - Metrics Collection', () => {
    it('debería recopilar todas las métricas de seguridad', async () => {
      // Mock all metric services
      const mockSecurityMetrics = {
        combined: {
          totalRequests: 1000,
          blockedRequests: 100,
          suspiciousActivities: 25,
          riskScore: 0.3,
          securityScore: 75
        },
        securityValidation: {
          riskDistribution: {
            critical: 5,
            high: 15,
            medium: 30,
            low: 50
          }
        },
        rateLimiting: {
          hits: 900,
          misses: 100,
          blockedRequests: 50,
          evictionCount: 10
        },
        traditionalSecurity: {
          suspiciousActivities: 25
        }
      };

      const mockRateMetrics = {
        totalRequests: 1000,
        blockedRequests: 50,
        suspiciousActivity: 10,
        averageResponseTime: 45.5,
        topBlockedIPs: [],
        topEndpoints: []
      };

      const mockAdaptiveMetrics = {
        hits: 850,
        misses: 150
      };

      const mockValidationMetrics = {
        totalValidations: 500,
        blockedRequests: 30,
        activeSessions: 45,
        topThreats: [],
        riskDistribution: { low: 60, medium: 25, high: 10, critical: 5 }
      };

      // Setup mock returns
      (securityMiddleware.getEnhancedSecurityMetrics as jest.Mock).mockResolvedValue(mockSecurityMetrics);
      (rateLimiter.getMetrics as jest.Mock).mockResolvedValue(mockRateMetrics);
      (adaptiveRateLimiter.getMetrics as jest.Mock).mockResolvedValue(mockAdaptiveMetrics);
      (securityEnhancer.getSecurityMetrics as jest.Mock).mockResolvedValue(mockValidationMetrics);

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toEqual(
        expect.objectContaining({
          timestamp: expect.any(String),
          system_health: expect.any(Object),
          metrics: expect.any(Object),
          recent_events: expect.any(Array),
          recommendations: expect.any(Array),
          status_summary: expect.any(Object)
        })
      );

      // Verify all metrics were collected
      expect(securityMiddleware.getEnhancedSecurityMetrics).toHaveBeenCalled();
      expect(rateLimiter.getMetrics).toHaveBeenCalled();
      expect(adaptiveRateLimiter.getMetrics).toHaveBeenCalled();
      expect(securityEnhancer.getSecurityMetrics).toHaveBeenCalled();
    });

    it('debería manejar errores en la recolección de métricas', async () => {
      // Mock one service to throw error
      (securityMiddleware.getEnhancedSecurityMetrics as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Other services still work
      (rateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        totalRequests: 1000,
        blockedRequests: 50,
        suspiciousActivity: 10,
        averageResponseTime: 45.5,
        topBlockedIPs: [],
        topEndpoints: []
      });

      (adaptiveRateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        hits: 850,
        misses: 150
      });

      (securityEnhancer.getSecurityMetrics as jest.Mock).mockResolvedValue({
        totalValidations: 500,
        blockedRequests: 30,
        activeSessions: 45,
        topThreats: [],
        riskDistribution: { low: 60, medium: 25, high: 10, critical: 5 }
      });

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(200); // Should still return partial data
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.metrics).toBeDefined();
    });
  });

  describe('System Health Calculation', () => {
    it('debería calcular estado del sistema como excelente', () => {
      const healthyMetrics = {
        securityValidation: {
          riskDistribution: {
            critical: 2 // Low critical risk
          }
        },
        rateLimiting: {
          hits: 1000,
          misses: 50,
          blockedRequests: 50
        }
      };

      const { calculateSystemHealth } = require('@/app/api/security/metrics/route');
      const health = calculateSystemHealth(healthyMetrics);

      expect(health.overall).toBe('excellent');
      expect(health.components.security_validation).toBe('good');
      expect(health.components.rate_limiting).toBe('good');
      expect(health.components.adaptive_limiting).toBe('good');
      expect(health.components.overall_system).toBe('excellent');
      expect(health.details[0]).toContain('excellent security posture');
    });

    it('debería detectar problemas críticos de seguridad', () => {
      const criticalMetrics = {
        securityValidation: {
          riskDistribution: {
            critical: 15 // High critical risk (>10%)
          }
        },
        rateLimiting: {
          hits: 100,
          misses: 100,
          blockedRequests: 70 // High block rate (>50%)
        }
      };

      const { calculateSystemHealth } = require('@/app/api/security/metrics/route');
      const health = calculateSystemHealth(criticalMetrics);

      expect(health.overall).toBe('critical');
      expect(health.components.security_validation).toBe('critical');
      expect(health.components.rate_limiting).toBe('critical');
      expect(health.components.overall_system).toBe('critical');
      expect(health.details[0]).toContain('critical security issues requiring immediate attention');
    });

    it('debería detectar múltiples advertencias', () => {
      const warningMetrics = {
        securityValidation: {
          riskDistribution: {
            critical: 6 // Medium critical risk (5-10%)
          }
        },
        rateLimiting: {
          hits: 200,
          misses: 100,
          blockedRequests: 80 // Medium block rate (30-50%)
        }
      };

      const { calculateSystemHealth } = require('@/app/api/security/metrics/route');
      const health = calculateSystemHealth(warningMetrics);

      expect(health.overall).toBe('warning');
      expect(health.components.security_validation).toBe('warning');
      expect(health.components.rate_limiting).toBe('warning');
      expect(health.details).toContain('Elevated risk in security validation');
      expect(health.details).toContain('High block rate in rate limiting');
    });

    it('debería manejar métricas de límite adaptativo', () => {
      const { calculateSystemHealth } = require('@/app/api/security/metrics/route');

      // Mock adaptive rate limiter metrics
      adaptiveRateLimiter.getMetrics = vi.fn().mockReturnValue({
        hits: 800,
        misses: 200
      });

      const metrics = {
        securityValidation: {
          riskDistribution: { critical: 1 }
        },
        rateLimiting: {
          hits: 1000,
          misses: 50,
          blockedRequests: 50
        }
      };

      const health = calculateSystemHealth(metrics);

      expect(health.components.adaptive_limiting).toBeDefined();
    });
  });

  describe('Recent Events Tracking', () => {
    it('debería obtener eventos de seguridad recientes', async () => {
      // Mock security events from database
      const mockEvents = [
        {
          id: '1',
          event_type: 'login_failed',
          severity: 'high',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          description: 'Failed login attempt',
          resolved: false
        },
        {
          id: '2',
          event_type: 'permission_violation',
          severity: 'medium',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          description: 'Permission violation detected',
          resolved: true
        }
      ];

      mockSupabase.select.mockResolvedValue({
        data: mockEvents
      });

      const { getRecentSecurityEvents } = require('@/app/api/security/metrics/route');
      const events = await getRecentSecurityEvents();

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(
        expect.objectContaining({
          id: '1',
          type: 'login_failed',
          severity: 'high',
          timestamp: expect.any(String),
          description: 'Failed login attempt',
          resolved: false
        })
      );
    });

    it('debería filtrar eventos de las últimas 24 horas', async () => {
      const recentEvents = [
        {
          id: '1',
          event_type: 'login_success',
          severity: 'low',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          description: 'Successful login',
          resolved: true
        }
      ];

      const oldEvents = [
        {
          id: '2',
          event_type: 'old_event',
          severity: 'low',
          created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          description: 'Old event',
          resolved: true
        }
      ];

      mockSupabase.select.mockResolvedValue({
        data: [...recentEvents, ...oldEvents]
      });

      const { getRecentSecurityEvents } = require('@/app/api/security/metrics/route');
      const events = await getRecentSecurityEvents();

      expect(events).toHaveLength(1); // Only recent event
      expect(events[0].id).toBe('1');
    });

    it('debería limitar a 20 eventos más recientes', async () => {
      // Create 25 recent events
      const manyEvents = Array.from({ length: 25 }, (_, i) => ({
        id: `event-${i}`,
        event_type: 'test_event',
        severity: 'low',
        created_at: new Date(Date.now() - i * 60 * 1000).toISOString(), // Each event 1 minute apart
        description: `Test event ${i}`,
        resolved: true
      }));

      mockSupabase.select.mockResolvedValue({
        data: manyEvents
      });

      const { getRecentSecurityEvents } = require('@/app/api/security/metrics/route');
      const events = await getRecentSecurityEvents();

      expect(events).toHaveLength(20); // Should limit to 20
    });

    it('debería manejar errores en obtención de eventos', async () => {
      mockSupabase.select.mockRejectedValue(new Error('Database error'));

      const { getRecentSecurityEvents } = require('@/app/api/security/metrics/route');
      const events = await getRecentSecurityEvents();

      expect(events).toEqual([]); // Should return empty array on error
    });
  });

  describe('Security Recommendations', () => {
    it('debería generar recomendaciones basado en puntaje de riesgo', async () => {
      const highRiskMetrics = {
        combined: {
          totalRequests: 1000,
          blockedRequests: 500, // 50% block rate
          suspiciousActivities: 100,
          riskScore: 0.8, // High risk
          securityScore: 30 // Low security score
        },
        traditionalSecurity: {
          suspiciousActivities: 75
        },
        rateLimiting: {
          evictionCount: 150 // High cache eviction
        }
      };

      const { generateSecurityRecommendations } = require('@/app/api/security/metrics/route');
      const recommendations = await generateSecurityRecommendations(highRiskMetrics);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations).toContain(
        expect.stringContaining('Critical risk level detected')
      );
      expect(recommendations).toContain(
        expect.stringContaining('Low security score detected')
      );
      expect(recommendations).toContain(
        expect.stringContaining('High block rate detected')
      );
    });

    it('debería generar recomendaciones para actividades sospechosas', async () => {
      const suspiciousMetrics = {
        combined: {
          totalRequests: 1000,
          blockedRequests: 200,
          suspiciousActivities: 60, // High suspicious activities
          riskScore: 0.4,
          securityScore: 65
        }
      };

      const { generateSecurityRecommendations } = require('@/app/api/security/metrics/route');
      const recommendations = await generateSecurityRecommendations(suspiciousMetrics);

      expect(recommendations).toContain(
        expect.stringContaining('High number of suspicious activities')
      );
    });

    it('debería incluir recomendaciones generales de seguridad', async () => {
      const normalMetrics = {
        combined: {
          totalRequests: 1000,
          blockedRequests: 100,
          suspiciousActivities: 10,
          riskScore: 0.2,
          securityScore: 80
        }
      };

      const { generateSecurityRecommendations } = require('@/app/api/security/metrics/route');
      const recommendations = await generateSecurityRecommendations(normalMetrics);

      // Should always include general security recommendations
      expect(recommendations).toContain(
        expect.stringContaining('Regular security audits')
      );
      expect(recommendations).toContain(
        expect.stringContaining('Keep security systems updated')
      );
      expect(recommendations).toContain(
        expect.stringContaining('security awareness training')
      );
    });

    it('debería manejar errores en generación de recomendaciones', async () => {
      const { generateSecurityRecommendations } = require('@/app/api/security/metrics/route');

      // Should handle missing or invalid metrics
      const recommendations = await generateSecurityRecommendations(null as any);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('API Response Structure', () => {
    it('debería devolver estructura de respuesta consistente', async () => {
      const mockMetrics = {
        combined: {
          totalRequests: 1000,
          blockedRequests: 100,
          suspiciousActivities: 25,
          riskScore: 0.3,
          securityScore: 75
        },
        securityValidation: {
          riskDistribution: { critical: 5, high: 15, medium: 30, low: 50 }
        },
        rateLimiting: {
          hits: 900,
          misses: 100,
          blockedRequests: 50
        },
        traditionalSecurity: {
          suspiciousActivities: 25
        }
      };

      (securityMiddleware.getEnhancedSecurityMetrics as jest.Mock).mockResolvedValue(mockMetrics);
      (rateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        totalRequests: 1000,
        blockedRequests: 50,
        suspiciousActivity: 10,
        averageResponseTime: 45.5,
        topBlockedIPs: [],
        topEndpoints: []
      });
      (adaptiveRateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        hits: 850,
        misses: 150
      });
      (securityEnhancer.getSecurityMetrics as jest.Mock).mockResolvedValue({
        totalValidations: 500,
        blockedRequests: 30,
        activeSessions: 45,
        topThreats: [],
        riskDistribution: { low: 60, medium: 25, high: 10, critical: 5 }
      });

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify response structure
      expect(data.success).toBe(true);
      expect(data.data.timestamp).toBeDefined();
      expect(data.data.system_health).toBeDefined();
      expect(data.data.metrics).toBeDefined();
      expect(data.data.recent_events).toBeDefined();
      expect(data.data.recommendations).toBeDefined();
      expect(data.data.status_summary).toBeDefined();

      // Verify status summary structure
      expect(data.data.status_summary).toEqual(
        expect.objectContaining({
          total_requests: expect.any(Number),
          blocked_requests: expect.any(Number),
          suspicious_activities: expect.any(Number),
          risk_score: expect.any(Number),
          security_score: expect.any(Number)
        })
      );
    });

    it('debería incluir timestamp ISO 8601', async () => {
      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      const data = await response.json();
      const timestamp = new Date(data.data.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 1000); // Within last second
    });

    it('debería manejar errores del servidor internos', async () => {
      // Mock unhandled error
      (securityMiddleware.getEnhancedSecurityMetrics as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();

      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Failed to fetch security metrics');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('debería responder en <100ms', async () => {
      const mockMetrics = {
        combined: {
          totalRequests: 1000,
          blockedRequests: 100,
          suspiciousActivities: 25,
          riskScore: 0.3,
          securityScore: 75
        },
        securityValidation: {
          riskDistribution: { critical: 5, high: 15, medium: 30, low: 50 }
        },
        rateLimiting: {
          hits: 900,
          misses: 100,
          blockedRequests: 50
        },
        traditionalSecurity: {
          suspiciousActivities: 25
        }
      };

      (securityMiddleware.getEnhancedSecurityMetrics as jest.Mock).mockResolvedValue(mockMetrics);
      (rateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        totalRequests: 1000,
        blockedRequests: 50,
        suspiciousActivity: 10,
        averageResponseTime: 45.5,
        topBlockedIPs: [],
        topEndpoints: []
      });
      (adaptiveRateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        hits: 850,
        misses: 150
      });
      (securityEnhancer.getSecurityMetrics as jest.Mock).mockResolvedValue({
        totalValidations: 500,
        blockedRequests: 30,
        activeSessions: 45,
        topThreats: [],
        riskDistribution: { low: 60, medium: 25, high: 10, critical: 5 }
      });

      const { GET } = require('@/app/api/security/metrics/route');
      const start = performance.now();
      const response = await GET(mockRequest);
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
      expect(response.status).toBe(200);
    });

    it('debería manejar solicitudes concurrentes', async () => {
      const mockMetrics = {
        combined: {
          totalRequests: 1000,
          blockedRequests: 100,
          suspiciousActivities: 25,
          riskScore: 0.3,
          securityScore: 75
        },
        securityValidation: {
          riskDistribution: { critical: 5, high: 15, medium: 30, low: 50 }
        },
        rateLimiting: {
          hits: 900,
          misses: 100,
          blockedRequests: 50
        },
        traditionalSecurity: {
          suspiciousActivities: 25
        }
      };

      (securityMiddleware.getEnhancedSecurityMetrics as jest.Mock).mockResolvedValue(mockMetrics);
      (rateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        totalRequests: 1000,
        blockedRequests: 50,
        suspiciousActivity: 10,
        averageResponseTime: 45.5,
        topBlockedIPs: [],
        topEndpoints: []
      });
      (adaptiveRateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        hits: 850,
        misses: 150
      });
      (securityEnhancer.getSecurityMetrics as jest.Mock).mockResolvedValue({
        totalValidations: 500,
        blockedRequests: 30,
        activeSessions: 45,
        topThreats: [],
        riskDistribution: { low: 60, medium: 25, high: 10, critical: 5 }
      });

      const { GET } = require('@/app/api/security/metrics/route');
      const concurrentRequests = Array.from({ length: 10 }, () => GET(mockRequest));

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      expect(endTime - startTime).toBeLessThan(2000); // Should handle 10 concurrent requests in under 2 seconds
    });
  });

  describe('Error Recovery', () => {
    it('debería recuperar de fallos parciales de servicio', async () => {
      // Mock partial service failures
      (securityMiddleware.getEnhancedSecurityMetrics as jest.Mock).mockRejectedValue(new Error('Service error'));
      (rateLimiter.getMetrics as jest.Mock).mockResolvedValue({
        totalRequests: 1000,
        blockedRequests: 50,
        suspiciousActivity: 10,
        averageResponseTime: 45.5,
        topBlockedIPs: [],
        topEndpoints: []
      });
      (adaptiveRateLimiter.getMetrics as jest.Mock).mockRejectedValue(new Error('Adaptive service error'));
      (securityEnhancer.getSecurityMetrics as jest.Mock).mockResolvedValue({
        totalValidations: 500,
        blockedRequests: 30,
        activeSessions: 45,
        topThreats: [],
        riskDistribution: { low: 60, medium: 25, high: 10, critical: 5 }
      });

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(200); // Should still succeed with partial data
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.metrics.rate_limiting).toBeDefined();
      expect(data.data.metrics.security_validation).toBeDefined();
    });

    it('debería manejar todas las fallas de servicio', async () => {
      // Mock all services to fail
      (securityMiddleware.getEnhancedSecurityMetrics as jest.Mock).mockRejectedValue(new Error('Service error'));
      (rateLimiter.getMetrics as jest.Mock).mockRejectedValue(new Error('Rate limiter error'));
      (adaptiveRateLimiter.getMetrics as jest.Mock).mockRejectedValue(new Error('Adaptive error'));
      (securityEnhancer.getSecurityMetrics as jest.Mock).mockRejectedValue(new Error('Security error'));

      const { GET } = require('@/app/api/security/metrics/route');
      const response = await GET(mockRequest);

      expect(response.status).toBe(500); // Should fail when all services fail
      const data = await response.json();

      expect(data.error).toBe('Internal server error');
    });
  });
});

export {};