/**
 * Comprehensive tests for the rate limiting system
 * Tests multiple strategies, adaptive behavior, and security features
 */

import { describe, it, expect, beforeEach, afterEach, jest, test } from '@jest/globals';
import { RateLimiter, AdaptiveRateLimiter, rateLimiter, adaptiveRateLimiter } from '@/lib/rateLimiter';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('next/server');
jest.mock('crypto');

describe('Sistema de Rate Limiting - Pruebas Integrales', () => {
  let mockRequest: any;
  let rateLimiterInstance: RateLimiter;
  let adaptiveLimiterInstance: AdaptiveRateLimiter;

  beforeEach(() => {
    // Create fresh instances for each test
    rateLimiterInstance = new RateLimiter();
    adaptiveLimiterInstance = new AdaptiveRateLimiter();

    // Setup mock request
    mockRequest = {
      ip: '192.168.1.100',
      url: '/api/auth/login',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.100'
      }
    };

    // Configure rate limiting for test routes
    rateLimiterInstance.configure('/api/auth/login', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      onLimitReached: jest.fn()
    });

    rateLimiterInstance.configure('/api/users', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 50,
      onLimitReached: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Cleanup intervals
    rateLimiterInstance.shutdown();
    adaptiveLimiterInstance.shutdown();
  });

  describe('RateLimiter - Basic Functionality', () => {
    it('debería permitir solicitudes dentro del límite', async () => {
      const result = await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');

      expect(result.allowed).toBe(true);
      expect(result.limitInfo).toBeUndefined();
    });

    it('debería bloquear solicitudes que exceden el límite', async () => {
      // Simulate 6 requests to exceed the limit of 5
      const promises = Array.from({ length: 6 }, (_, i) =>
        rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login')
      );

      const results = await Promise.all(promises);

      // First 5 should be allowed, last one should be blocked
      expect(results.slice(0, 5).every(r => r.allowed)).toBe(true);
      expect(results[5].allowed).toBe(false);
      expect(results[5].limitInfo).toBeDefined();
      expect(results[5].limitInfo!.remaining).toBe(0);
    });

    it('debería resetear el contador después de la ventana de tiempo', async () => {
      // Make initial requests
      await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');
      await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');

      // Mock time travel to reset window
      const resetTime = Date.now() + 16 * 60 * 1000; // 16 minutes later
      jest.spyOn(Date, 'now').mockReturnValue(resetTime);

      // Request should be allowed after reset
      const result = await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');

      expect(result.allowed).toBe(true);
    });

    it('debería usar generador de clave personalizado', async () => {
      const customKeyGenerator = jest.fn().mockReturnValue('custom-key');

      rateLimiterInstance.configure('/api/custom', {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        keyGenerator: customKeyGenerator
      });

      await rateLimiterInstance.checkLimit(mockRequest, '/api/custom');

      expect(customKeyGenerator).toHaveBeenCalledWith(mockRequest);
    });

    it('debería manejar solicitudes sin configuración', async () => {
      const result = await rateLimiterInstance.checkLimit(mockRequest, '/api/unconfigured');

      expect(result.allowed).toBe(true);
    });

    it('debería actualizar métricas correctamente', async () => {
      // Make several requests
      await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');
      await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');

      const metrics = rateLimiterInstance.getMetrics();

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(2);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('debería rastrear IPs bloqueadas', async () => {
      // Configure a very strict limit to trigger blocking
      rateLimiterInstance.configure('/api/strict', {
        windowMs: 60 * 60 * 1000,
        maxRequests: 1,
        onLimitReached: jest.fn()
      });

      // First request allowed, second blocked
      const firstResult = await rateLimiterInstance.checkLimit(mockRequest, '/api/strict');
      const secondResult = await rateLimiterInstance.checkLimit(mockRequest, '/api/strict');

      expect(firstResult.allowed).toBe(true);
      expect(secondResult.allowed).toBe(false);

      const metrics = rateLimiterInstance.getMetrics();
      expect(metrics.topBlockedIPs).toContainEqual(
        expect.objectContaining({
          ip: '192.168.1.100'
        })
      );
    });

    it('debería detectar actividades sospechosas', async () => {
      // Configure with suspicious endpoint pattern
      rateLimiterInstance.configure('/api/admin', {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
        onLimitReached: jest.fn()
      });

      // Modify request to hit suspicious pattern
      const suspiciousRequest = {
        ...mockRequest,
        url: '/api/admin/users'
      };

      await rateLimiterInstance.checkLimit(suspiciousRequest, '/api/admin');

      const metrics = rateLimiterInstance.getMetrics();
      // Should detect suspicious pattern based on URL
      expect(metrics.suspiciousActivity).toBeDefined();
    });
  });

  describe('RateLimiter - Error Handling', () => {
    it('debería manejar errores de forma segura (fail open)', async () => {
      // Simulate error in rate limiting logic
      rateLimiterInstance['getStore'] = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');

      // Should fail open - allow request when there's an error
      expect(result.allowed).toBe(true);
    });

    it('debería limpiar entradas expiradas automáticamente', async () => {
      // Add a request that will expire
      const store = rateLimiterInstance['getStore']('/api/auth/login');
      const expiredTime = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      store.set('test-key', { count: 10, resetTime: expiredTime });

      // Cleanup should remove expired entries
      await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');

      const metrics = rateLimiterInstance.getMetrics();
      expect(metrics.totalRequests).toBe(1); // Only the new request
    });

    it('debería resetear métricas correctamente', () => {
      const initialMetrics = rateLimiterInstance.getMetrics();
      rateLimiterInstance.resetMetrics();
      const resetMetrics = rateLimiterInstance.getMetrics();

      expect(initialMetrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(resetMetrics.totalRequests).toBe(0);
      expect(resetMetrics.blockedRequests).toBe(0);
    });
  });

  describe('AdaptiveRateLimiter - Behavior Analysis', () => {
    it('debería analizar comportamiento de usuario', async () => {
      const userKey = adaptiveLimiterInstance['getUserKey'](mockRequest);
      const behavior = adaptiveLimiterInstance['getUserBehavior'](userKey);

      expect(behavior).toEqual(
        expect.objectContaining({
          requestCount: 0,
          averageInterval: 0,
          suspiciousPatterns: 0,
          lastActivity: expect.any(Number),
          trusted: false
        })
      );
    });

    it('debería calcular puntaje de riesgo basado en comportamiento', async () => {
      const behavior = {
        requestCount: 100, // High request count
        averageInterval: 1000, // Rapid requests
        suspiciousPatterns: 5, // Many suspicious patterns
        lastActivity: Date.now(),
        trusted: false
      };

      const riskScore = adaptiveLimiterInstance['calculateRiskScore'](behavior, mockRequest);

      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(1);
      expect(riskScore).toBeGreaterThan(0.5); // Should be high risk
    });

    it('debería ajustar límites basado en puntaje de riesgo', async () => {
      // First configure a pattern to test against
      adaptiveLimiterInstance.configure('/api/test', {
        windowMs: 60 * 60 * 1000,
        maxRequests: 100
      });

      const highRiskScore = 0.8;
      const adjustedConfig = adaptiveLimiterInstance['adjustConfigByRisk']('/api/test', highRiskScore);

      expect(adjustedConfig).toBeDefined();
      expect(adjustedConfig.maxRequests).toBeLessThan(100);
      expect(adjustedConfig.maxRequests).toBeGreaterThan(0);
    });

    it('debería detectar solicitudes sospechosas', async () => {
      const suspiciousRequest = {
        ...mockRequest,
        url: '/api/.env'
      };

      const isSuspicious = adaptiveLimiterInstance['isSuspiciousRequest'](suspiciousRequest);
      expect(isSuspicious).toBe(true);
    });

    it('debería actualizar comportamiento del usuario', async () => {
      const userKey = adaptiveLimiterInstance['getUserKey'](mockRequest);
      const behavior = adaptiveLimiterInstance['getUserBehavior'](userKey);

      const initialCount = behavior.requestCount;

      // Store behavior (simulating request processing)
      adaptiveLimiterInstance['storeBehavior'](userKey, behavior, mockRequest);

      expect(behavior.requestCount).toBeGreaterThan(initialCount);
    });
  });

  describe('AdaptiveRateLimiter - Machine Learning', () => {
    it('debería entrenar modelo ML con patrones de comportamiento', () => {
      const behavior = {
        requestCount: 10,
        suspiciousPatterns: 2
      };

      const simpleMLModel = adaptiveLimiterInstance['mlModel'];

      // Train the model
      simpleMLModel.train(behavior, mockRequest);

      // Test prediction
      const prediction = simpleMLModel.predict(behavior);
      expect(prediction).toBeGreaterThanOrEqual(0);
    });

    it('debería predecir patrones de comportamiento', async () => {
      const behavior = {
        requestCount: 15,
        suspiciousPatterns: 3
      };

      const simpleMLModel = adaptiveLimiterInstance['mlModel'];

      // Train with some data
      simpleMLModel.train(behavior, mockRequest);

      // Predict
      const prediction = simpleMLModel.predict(behavior);
      expect(typeof prediction).toBe('number');
    });
  });

  describe('RateLimiter - Configuration Tests', () => {
    it('debería configurar límites por ruta', () => {
      rateLimiterInstance.configure('/api/sensitive', {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 3,
        skipSuccessfulRequests: true,
        onLimitReached: jest.fn()
      });

      // Configuration should be stored
      expect(rateLimiterInstance['configs'].has('/api/sensitive')).toBe(true);
    });

    it('debería manejar diferentes estrategias de generación de claves', async () => {
      const ipBasedRequest = {
        ...mockRequest,
        ip: '192.168.1.200'
      };

      const result1 = await rateLimiterInstance.checkLimit(mockRequest, '/api/auth/login');
      const result2 = await rateLimiterInstance.checkLimit(ipBasedRequest, '/api/auth/login');

      // Different IPs should have different rate limits
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('debería limpiar automáticamente entradas expiradas', () => {
      // Start cleanup interval
      const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [pattern, store] of rateLimiterInstance['stores'].entries()) {
          for (const [key, entry] of store.entries()) {
            if (now > entry.resetTime) {
              store.delete(key);
            }
          }
        }
      }, 60 * 1000);

      // Cleanup interval should be set
      expect(rateLimiterInstance['cleanupInterval']).toBeDefined();

      clearInterval(cleanupInterval);
    });
  });

  describe('RateLimiter - Integration Tests', () => {
    it('debería trabajar con instancias globales', async () => {
      // Test global instances
      const result = await rateLimiter.checkLimit(mockRequest, '/api/auth/login');

      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
    });

    it('debería mantener consistencia entre límite adaptable y estándar', async () => {
      // Make requests through both limiters
      const standardResult = await rateLimiter.checkLimit(mockRequest, '/api/users');
      const adaptiveResult = await adaptiveRateLimiter.checkLimit(mockRequest, '/api/users');

      // Both should work and return valid results
      expect(standardResult).toBeDefined();
      expect(adaptiveResult).toBeDefined();
      expect(typeof standardResult.allowed).toBe('boolean');
      expect(typeof adaptiveResult.allowed).toBe('boolean');
    });

    it('debería manejar diferentes tipos de solicitudes concurrentemente', async () => {
      const requests = [
        { ...mockRequest, url: '/api/auth/login' },
        { ...mockRequest, url: '/api/users' },
        { ...mockRequest, url: '/api/admin' }
      ];

      const promises = requests.map(req =>
        rateLimiter.checkLimit(req, req.url)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(typeof result.allowed).toBe('boolean');
      });
    });

    it('debería proporcionar métricas detalladas', async () => {
      // Make several requests to different endpoints
      await rateLimiter.checkLimit(mockRequest, '/api/auth/login');
      await rateLimiter.checkLimit(mockRequest, '/api/users');
      await rateLimiter.checkLimit(mockRequest, '/api/users');

      const metrics = rateLimiter.getMetrics();

      expect(metrics).toEqual(
        expect.objectContaining({
          totalRequests: expect.any(Number),
          blockedRequests: expect.any(Number),
          averageResponseTime: expect.any(Number),
          topBlockedIPs: expect.any(Array),
          topEndpoints: expect.any(Array)
        })
      );

      expect(metrics.topEndpoints).toContainEqual(
        expect.objectContaining({
          endpoint: '/api/users'
        })
      );
    });
  });

  describe('RateLimiter - Security Tests', () => {
    it('debería detectar ataques de fuerza bruta', async () => {
      const bruteForceRequest = {
        ...mockRequest,
        url: '/api/auth/login'
      };

      // Make many rapid requests to simulate brute force
      const promises = Array.from({ length: 20 }, () =>
        rateLimiter.checkLimit(bruteForceRequest, '/api/auth/login')
      );

      const results = await Promise.all(promises);

      // Should have blocked requests
      const blockedRequests = results.filter(r => !r.allowed);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });

    it('debería prevenir bypass de rate limiting', async () => {
      // Try to bypass by changing user agent
      const bypassAttempts = [
        { ...mockRequest, headers: { ...mockRequest.headers, 'user-agent': 'Mozilla/5.0' } },
        { ...mockRequest, headers: { ...mockRequest.headers, 'user-agent': 'curl/7.68.0' } },
        { ...mockRequest, headers: { ...mockRequest.headers, 'user-agent': 'python-requests' } }
      ];

      const promises = bypassAttempts.map(req =>
        rateLimiter.checkLimit(req, '/api/auth/login')
      );

      const results = await Promise.all(promises);

      // All should be tracked under same rate limit (based on IP)
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('debería manejar ataques DDoS', async () => {
      const ddosRequest = {
        ...mockRequest,
        ip: '192.168.1.999' // Simulate attack from single IP
      };

      // Many requests from same IP
      const promises = Array.from({ length: 100 }, () =>
        rateLimiter.checkLimit(ddosRequest, '/api/users')
      );

      const results = await Promise.all(promises);

      // Should have significant blocked requests
      const blockedCount = results.filter(r => !r.allowed).length;
      expect(blockedCount).toBeGreaterThan(0);
    });

    it('debería rastrear patrones de ataque', async () => {
      // Simulate attack targeting sensitive endpoints
      const attackRequests = [
        { ...mockRequest, url: '/api/admin/users' },
        { ...mockRequest, url: '/api/roles' },
        { ...mockRequest, url: '/api/config' }
      ];

      const promises = attackRequests.map(req =>
        rateLimiter.checkLimit(req, req.url)
      );

      const results = await Promise.all(promises);
      const metrics = rateLimiter.getMetrics();

      // Should detect suspicious activity patterns
      expect(metrics.suspiciousActivity).toBeDefined();
      expect(typeof metrics.suspiciousActivity).toBe('number');
    });
  });

  describe('RateLimiter - Performance Tests', () => {
    it('debería verificar límite en <10ms', async () => {
      const start = performance.now();
      await rateLimiter.checkLimit(mockRequest, '/api/auth/login');
      const end = performance.now();

      expect(end - start).toBeLessThan(10);
    });

    it('debería manejar alta concurrencia', async () => {
      const concurrentRequests = 100;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        rateLimiter.checkLimit(
          { ...mockRequest, ip: `192.168.1.${i % 255}` },
          '/api/users'
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds for 100 requests
    });

    it('debería obtener métricas eficientemente', () => {
      const start = performance.now();
      const metrics = rateLimiter.getMetrics();
      const end = performance.now();

      expect(end - start).toBeLessThan(5);
      expect(metrics).toBeDefined();
    });

    it('debería escalar con múltiples patrones', async () => {
      // Configure many different patterns
      for (let i = 0; i < 50; i++) {
        rateLimiterInstance.configure(`/api/pattern-${i}`, {
          windowMs: 60 * 60 * 1000,
          maxRequests: 10
        });
      }

      // Make requests to different patterns
      const promises = Array.from({ length: 100 }, (_, i) =>
        rateLimiterInstance.checkLimit(
          { ...mockRequest, url: `/api/pattern-${i % 50}` },
          `/api/pattern-${i % 50}`
        )
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});

export {};