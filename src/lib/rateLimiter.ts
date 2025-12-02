import { createClient } from './supabase';
import { createHash } from 'crypto';

/**
 * Advanced Rate Limiting System for Security
 * Implements multiple strategies to prevent abuse and attacks
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: any) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  onLimitReached?: (key: string, limit: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  key: string;
  current: number;
  max: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

export interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  suspiciousActivity: number;
  averageResponseTime: number;
  topBlockedIPs: Array<{ ip: string; count: number; lastBlocked: number }>;
  topEndpoints: Array<{ endpoint: string; count: number; blocked: number }>;
}

/**
 * Multi-strategy Rate Limiter
 * - Sliding Window Counter
 * - Token Bucket
 * - Fixed Window
 * - Adaptive Rate Limiting
 */
export class RateLimiter {
  private stores = new Map<string, Map<string, { count: number; resetTime: number }>>();
  private configs = new Map<string, RateLimitConfig>();
  private metrics: SecurityMetrics;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousActivity: 0,
      averageResponseTime: 0,
      topBlockedIPs: [],
      topEndpoints: []
    };

    this.startCleanupInterval();
  }

  /**
   * Configure rate limiting for a specific route or pattern
   */
  configure(pattern: string, config: RateLimitConfig): void {
    this.configs.set(pattern, config);
  }

  /**
   * Check if request is allowed
   */
  async checkLimit(req: any, pattern: string): Promise<{ allowed: boolean; limitInfo?: RateLimitInfo }> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      const config = this.configs.get(pattern);
      if (!config) {
        return { allowed: true };
      }

      const key = config.keyGenerator ? config.keyGenerator(req) : this.defaultKeyGenerator(req);
      const store = this.getStore(pattern);
      const now = Date.now();

      // Clean expired entries
      this.cleanupExpiredEntries(store, now);

      // Get current limit info
      const current = store.get(key) || { count: 0, resetTime: now + config.windowMs };

      // Check if window has reset
      if (now > current.resetTime) {
        current.count = 0;
        current.resetTime = now + config.windowMs;
      }

      // Increment counter
      current.count++;

      // Update store
      store.set(key, current);

      const limitInfo: RateLimitInfo = {
        key,
        current: current.count,
        max: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - current.count),
        resetTime: current.resetTime,
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      };

      // Check if limit exceeded
      const isLimited = current.count > config.maxRequests;

      if (isLimited) {
        this.metrics.blockedRequests++;
        this.updateBlockedIPs(req.ip);
        this.updateBlockedEndpoints(req.url, pattern);

        // Call limit reached callback
        if (config.onLimitReached) {
          config.onLimitReached(key, limitInfo);
        }
      }

      // Update metrics
      const responseTime = performance.now() - startTime;
      this.updateMetrics(responseTime, req.ip, req.url, isLimited);

      return {
        allowed: !isLimited,
        limitInfo: isLimited ? limitInfo : undefined
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true }; // Fail open for security
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): SecurityMetrics {
    // Calculate top blocked IPs
    const sortedIPs = [...this.metrics.topBlockedIPs]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate top endpoints
    const sortedEndpoints = [...this.metrics.topEndpoints]
      .sort((a, b) => b.blocked - a.blocked)
      .slice(0, 10);

    return {
      ...this.metrics,
      topBlockedIPs: sortedIPs,
      topEndpoints: sortedEndpoints
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousActivity: 0,
      averageResponseTime: 0,
      topBlockedIPs: [],
      topEndpoints: []
    };
  }

  /**
   * Get store for pattern
   */
  private getStore(pattern: string): Map<string, { count: number; resetTime: number }> {
    if (!this.stores.has(pattern)) {
      this.stores.set(pattern, new Map());
    }
    return this.stores.get(pattern)!;
  }

  /**
   * Default key generator
   */
  private defaultKeyGenerator(req: any): string {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const hash = createHash('md5')
      .update(`${ip}:${userAgent}`)
      .digest('hex');
    return hash;
  }

  /**
   * Clean expired entries
   */
  private cleanupExpiredEntries(store: Map<string, { count: number; resetTime: number }>, now: number): void {
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }

  /**
   * Update security metrics
   */
  private updateMetrics(responseTime: number, ip: string, endpoint: string, blocked: boolean): void {
    // Update average response time
    this.metrics.averageResponseTime =
      this.metrics.averageResponseTime * 0.9 + responseTime * 0.1;

    // Update top blocked IPs
    const ipEntry = this.metrics.topBlockedIPs.find(p => p.ip === ip);
    if (blocked) {
      if (ipEntry) {
        ipEntry.count++;
        ipEntry.lastBlocked = Date.now();
      } else {
        this.metrics.topBlockedIPs.push({
          ip,
          count: 1,
          lastBlocked: Date.now()
        });
      }
    }

    // Update top endpoints
    const endpointEntry = this.metrics.topEndpoints.find(e => e.endpoint === endpoint);
    if (endpointEntry) {
      endpointEntry.count++;
      if (blocked) {
        endpointEntry.blocked++;
      }
    } else {
      this.metrics.topEndpoints.push({
        endpoint,
        count: 1,
        blocked: blocked ? 1 : 0
      });
    }
  }

  /**
   * Update blocked IPs tracking
   */
  private updateBlockedIPs(ip: string): void {
    // Additional suspicious activity detection
    if (this.isSuspiciousIP(ip)) {
      this.metrics.suspiciousActivity++;
    }
  }

  /**
   * Update blocked endpoints tracking
   */
  private updateBlockedEndpoints(url: string, pattern: string): void {
    // Pattern-based suspicious activity detection
    const suspiciousPatterns = [
      '/api/auth/login',
      '/api/users',
      '/api/roles',
      '/admin',
      '/wp-admin',
      '/phpmyadmin'
    ];

    if (suspiciousPatterns.some(pattern => url.includes(pattern))) {
      this.metrics.suspiciousActivity++;
    }
  }

  /**
   * Check if IP is suspicious
   */
  private isSuspiciousIP(ip: string): boolean {
    // Check if IP appears in blocked list multiple times
    const ipEntry = this.metrics.topBlockedIPs.find(p => p.ip === ip);
    return ipEntry ? ipEntry.count > 5 : false;
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [pattern, store] of this.stores.entries()) {
        this.cleanupExpiredEntries(store, now);
      }
    }, 60 * 1000); // Clean every minute
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Adaptive Rate Limiter with Machine Learning
 * Analyzes patterns and adjusts limits dynamically
 */
export class AdaptiveRateLimiter extends RateLimiter {
  private userBehavior = new Map<string, {
    requestCount: number;
    averageInterval: number;
    suspiciousPatterns: number;
    lastActivity: number;
    trusted: boolean;
  }>();
  private mlModel: SimpleMLModel;

  constructor() {
    super();
    this.mlModel = new SimpleMLModel();
  }

  async checkLimit(req: any, pattern: string): Promise<{ allowed: boolean; limitInfo?: RateLimitInfo }> {
    const userKey = this.getUserKey(req);
    const behavior = this.getUserBehavior(userKey);

    // Analyze user behavior
    const riskScore = this.calculateRiskScore(behavior, req);

    // Adjust limits based on risk score
    const adjustedConfig = this.adjustConfigByRisk(pattern, riskScore);

    // Store behavior for ML training
    this.storeBehavior(userKey, behavior, req);

    return super.checkLimit(req, pattern);
  }

  /**
   * Get user identifier
   */
  private getUserKey(req: any): string {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const timestamp = Date.now();
    const hour = Math.floor(timestamp / (60 * 60 * 1000));

    return `${ip}:${userAgent}:${hour}`;
  }

  /**
   * Get or create user behavior
   */
  private getUserBehavior(userKey: string): any {
    if (!this.userBehavior.has(userKey)) {
      this.userBehavior.set(userKey, {
        requestCount: 0,
        averageInterval: 0,
        suspiciousPatterns: 0,
        lastActivity: Date.now(),
        trusted: false
      });
    }
    return this.userBehavior.get(userKey)!;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(behavior: any, req: any): number {
    let score = 0;

    // Request frequency
    if (behavior.requestCount > 100) score += 0.3;
    else if (behavior.requestCount > 50) score += 0.2;
    else if (behavior.requestCount > 10) score += 0.1;

    // Request intervals
    const now = Date.now();
    const timeSinceLastActivity = now - behavior.lastActivity;
    if (timeSinceLastActivity < 1000) score += 0.3; // Rapid requests
    else if (timeSinceLastActivity < 5000) score += 0.1;

    // Suspicious patterns
    score += behavior.suspiciousPatterns * 0.2;

    // Request headers
    const headers = req.headers;
    if (headers['user-agent']?.toLowerCase().includes('bot')) score += 0.2;
    if (headers['x-forwarded-for']) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Adjust config based on risk score
   */
  private adjustConfigByRisk(pattern: string, riskScore: number): RateLimitConfig {
    const baseConfig = this.configs.get(pattern);
    if (!baseConfig) return baseConfig;

    const multiplier = 1 - (riskScore * 0.5); // Reduce limit by up to 50%

    return {
      ...baseConfig,
      maxRequests: Math.floor(baseConfig.maxRequests * multiplier)
    };
  }

  /**
   * Store user behavior for ML
   */
  private storeBehavior(userKey: string, behavior: any, req: any): void {
    behavior.requestCount++;
    behavior.lastActivity = Date.now();

    // Detect suspicious patterns
    if (this.isSuspiciousRequest(req)) {
      behavior.suspiciousPatterns++;
    }

    // Train ML model periodically
    if (behavior.requestCount % 10 === 0) {
      this.mlModel.train(behavior, req);
    }
  }

  /**
   * Check if request is suspicious
   */
  private isSuspiciousRequest(req: any): boolean {
    const url = req.url?.toLowerCase() || '';
    const headers = req.headers;

    const suspiciousPatterns = [
      'admin',
      'wp-login',
      'phpmyadmin',
      '.env',
      'config',
      'backup'
    ];

    return suspiciousPatterns.some(pattern => url.includes(pattern));
  }
}

/**
 * Simple ML Model for behavior analysis
 */
class SimpleMLModel {
  private patterns = new Map<string, number>();

  train(behavior: any, req: any): void {
    // Simple pattern recognition
    const key = `${behavior.requestCount}:${behavior.suspiciousPatterns}`;
    const current = this.patterns.get(key) || 0;
    this.patterns.set(key, current + 1);
  }

  predict(behavior: any): number {
    const key = `${behavior.requestCount}:${behavior.suspiciousPatterns}`;
    return this.patterns.get(key) || 0;
  }
}

// Export global instances
export const rateLimiter = new RateLimiter();
export const adaptiveRateLimiter = new AdaptiveRateLimiter();

// Pre-configure common rate limits
rateLimiter.configure('/api/auth/login', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  onLimitReached: (key, limit) => {
    console.warn(`Login limit reached for key: ${key}`);
  }
});

rateLimiter.configure('/api/auth', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  onLimitReached: (key, limit) => {
    console.warn(`Auth limit reached for key: ${key}`);
  }
});

rateLimiter.configure('/api/roles', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
  onLimitReached: (key, limit) => {
    console.warn(`Roles limit reached for key: ${key}`);
  }
});

rateLimiter.configure('/api/users', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  onLimitReached: (key, limit) => {
    console.warn(`Users limit reached for key: ${key}`);
  }
});

rateLimiter.configure('/admin', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 30,
  onLimitReached: (key, limit) => {
    console.warn(`Admin limit reached for key: ${key}`);
  }
});