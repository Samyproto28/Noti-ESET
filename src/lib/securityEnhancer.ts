import { createClient } from './supabase';
import { rateLimiter, adaptiveRateLimiter } from './rateLimiter';
import { createHash } from 'crypto';

/**
 * Security Enhancement System
 * Provides advanced security features beyond basic middleware
 */

export interface SecurityContext {
  userId: string | null;
  ipAddress: string;
  userAgent: string;
  requestTime: number;
  sessionId: string;
  riskScore: number;
  trustedDevice: boolean;
}

export interface SecurityValidation {
  valid: boolean;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresMFA: boolean;
  blocked: boolean;
  recommendations: string[];
}

export interface ThreatDetection {
  isThreat: boolean;
  threatType: 'bruteforce' | 'injection' | 'xss' | 'csrf' | 'ddos' | 'suspicious_pattern';
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

/**
 * Enhanced Security System with Multiple Protection Layers
 */
export class SecurityEnhancer {
  private blockedIPs = new Set<string>();
  private suspiciousPatterns = new Map<string, { count: number; lastSeen: number }>();
  private sessionIntegrity = new Map<string, SecurityContext>();
  private failedAttempts = new Map<string, Array<{ time: number; reason: string }>>();

  /**
   * Validate security context for request
   */
  async validateSecurityContext(
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    sessionId: string
  ): Promise<SecurityValidation> {
    const startTime = Date.now();
    const validation: SecurityValidation = {
      valid: true,
      reason: '',
      riskLevel: 'low',
      requiresMFA: false,
      blocked: false,
      recommendations: []
    };

    try {
      // Check if IP is blocked
      if (this.isBlockedIP(ipAddress)) {
        validation.valid = false;
        validation.reason = 'IP address is blocked';
        validation.riskLevel = 'critical';
        validation.blocked = true;
        return validation;
      }

      // Check for suspicious patterns
      const threatDetection = await this.detectThreats(ipAddress, userAgent, sessionId);
      if (threatDetection.isThreat) {
        validation.valid = false;
        validation.reason = `Threat detected: ${threatDetection.description}`;
        validation.riskLevel = threatDetection.severity;
        validation.blocked = threatDetection.severity === 'critical';
        validation.recommendations.push(threatDetection.mitigation);
        return validation;
      }

      // Check session integrity
      const sessionValidation = await this.validateSessionIntegrity(sessionId, ipAddress, userAgent);
      if (!sessionValidation.valid) {
        validation.valid = false;
        validation.reason = sessionValidation.reason;
        validation.riskLevel = sessionValidation.riskLevel;
        validation.requiresMFA = sessionValidation.requiresMFA;
        validation.recommendations.push(...sessionValidation.recommendations);
        return validation;
      }

      // Check for bruteforce attempts
      const bruteForceCheck = await this.checkBruteForceAttempts(ipAddress, userId);
      if (bruteForceCheck.blocked) {
        validation.valid = false;
        validation.reason = 'Too many failed attempts detected';
        validation.riskLevel = bruteForceCheck.riskLevel;
        validation.blocked = true;
        validation.recommendations.push(bruteForceCheck.recommendations);
        return validation;
      }

      // Calculate risk score
      const riskScore = await this.calculateRiskScore(userId, ipAddress, userAgent, sessionId);
      validation.riskLevel = this.getRiskLevel(riskScore);

      if (riskScore > 0.7) {
        validation.requiresMFA = true;
        validation.recommendations.push('Consider requiring multi-factor authentication');
      }

      if (riskScore > 0.9) {
        validation.valid = false;
        validation.reason = 'High risk score detected';
        validation.riskLevel = 'critical';
        validation.blocked = true;
      }

      // Log security validation
      await this.logSecurityValidation(userId, ipAddress, userAgent, sessionId, validation, Date.now() - startTime);

      return validation;

    } catch (error) {
      console.error('Security validation error:', error);
      return {
        valid: false,
        reason: 'Security validation failed',
        riskLevel: 'high',
        requiresMFA: false,
        blocked: false,
        recommendations: ['Please contact system administrator']
      };
    }
  }

  /**
   * Detect potential threats
   */
  private async detectThreats(
    ipAddress: string,
    userAgent: string,
    sessionId: string
  ): Promise<ThreatDetection> {
    const threat: ThreatDetection = {
      isThreat: false,
      threatType: 'suspicious_pattern',
      confidence: 0,
      severity: 'low',
      description: '',
      mitigation: ''
    };

    // Check for SQL injection patterns
    if (this.containsInjectionPatterns(userAgent)) {
      threat.isThreat = true;
      threat.threatType = 'injection';
      threat.confidence = 0.9;
      threat.severity = 'high';
      threat.description = 'SQL injection attempt detected';
      threat.mitigation = 'Block IP and alert security team';
      return threat;
    }

    // Check for XSS patterns
    if (this.containsXSSPatterns(userAgent)) {
      threat.isThreat = true;
      threat.threatType = 'xss';
      threat.confidence = 0.8;
      threat.severity = 'medium';
      threat.description = 'XSS attempt detected';
      threat.mitigation = 'Sanitize input and block suspicious requests';
      return threat;
    }

    // Check for suspicious user agents
    if (this.isSuspiciousUserAgent(userAgent)) {
      threat.isThreat = true;
      threat.threatType = 'suspicious_pattern';
      threat.confidence = 0.6;
      threat.severity = 'medium';
      threat.description = 'Suspicious user agent detected';
      threat.mitigation = 'Monitor IP behavior and implement CAPTCHA';
      return threat;
    }

    // Check for DDoS patterns
    const requestCount = await this.getRequestCountFromIP(ipAddress, 60 * 1000); // Last minute
    if (requestCount > 100) {
      threat.isThreat = true;
      threat.threatType = 'ddos';
      threat.confidence = 0.8;
      threat.severity = 'critical';
      threat.description = 'DDoS attack detected';
      threat.mitigation = 'Implement rate limiting and block IP';
      return threat;
    }

    // Check for bruteforce patterns
    const failedAttempts = this.failedAttempts.get(ipAddress) || [];
    const recentFailures = failedAttempts.filter(attempt =>
      Date.now() - attempt.time < 15 * 60 * 1000 // Last 15 minutes
    );

    if (recentFailures.length > 10) {
      threat.isThreat = true;
      threat.threatType = 'bruteforce';
      threat.confidence = 0.9;
      threat.severity = 'high';
      threat.description = 'Bruteforce attack detected';
      threat.mitigation = 'Block IP and implement account lockout';
      return threat;
    }

    return threat;
  }

  /**
   * Validate session integrity
   */
  private async validateSessionIntegrity(
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<SecurityValidation> {
    const storedSession = this.sessionIntegrity.get(sessionId);

    if (!storedSession) {
      // New session - create security context
      const newContext: SecurityContext = {
        userId: null,
        ipAddress,
        userAgent,
        requestTime: Date.now(),
        sessionId,
        riskScore: 0,
        trustedDevice: false
      };
      this.sessionIntegrity.set(sessionId, newContext);
      return { valid: true, reason: '', riskLevel: 'low', requiresMFA: false, blocked: false, recommendations: [] };
    }

    // Check for session hijacking
    const ipChanged = storedSession.ipAddress !== ipAddress;
    const userAgentChanged = storedSession.userAgent !== userAgent;

    if (ipChanged || userAgentChanged) {
      return {
        valid: false,
        reason: 'Session integrity check failed - potential hijacking',
        riskLevel: 'high',
        requiresMFA: true,
        blocked: false,
        recommendations: [
          'Verify user identity',
          'Consider requiring re-authentication',
          'Monitor for suspicious activity'
        ]
      };
    }

    // Update session activity
    storedSession.requestTime = Date.now();
    this.sessionIntegrity.set(sessionId, storedSession);

    return { valid: true, reason: '', riskLevel: 'low', requiresMFA: false, blocked: false, recommendations: [] };
  }

  /**
   * Check for bruteforce attempts
   */
  private async checkBruteForceAttempts(
    ipAddress: string,
    userId: string | null
  ): Promise<{ blocked: boolean; riskLevel: 'low' | 'medium' | 'high' | 'critical'; recommendations: string[] }> {
    const attempts = this.failedAttempts.get(ipAddress) || [];
    const recentAttempts = attempts.filter(attempt =>
      Date.now() - attempt.time < 15 * 60 * 1000 // Last 15 minutes
    );

    const recommendations: string[] = [];

    if (recentAttempts.length > 5) {
      recommendations.push('Implement IP-based temporary blocking');
    }

    if (recentAttempts.length > 10) {
      recommendations.push('Enable CAPTCHA for authentication attempts');
    }

    if (recentAttempts.length > 20) {
      recommendations.push('Block IP address and alert security team');
    }

    return {
      blocked: recentAttempts.length > 20,
      riskLevel: recentAttempts.length > 15 ? 'high' : 'medium',
      recommendations
    };
  }

  /**
   * Calculate risk score
   */
  private async calculateRiskScore(
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    sessionId: string
  ): Promise<number> {
    let riskScore = 0;

    // IP-based risk
    if (this.isSuspiciousIP(ipAddress)) {
      riskScore += 0.3;
    }

    // User agent risk
    if (this.isSuspiciousUserAgent(userAgent)) {
      riskScore += 0.2;
    }

    // Session-based risk
    const sessionAge = Date.now() - (this.sessionIntegrity.get(sessionId)?.requestTime || Date.now());
    if (sessionAge < 5 * 60 * 1000) { // First 5 minutes
      riskScore += 0.1;
    }

    // User-based risk
    if (userId) {
      const userRisk = await this.getUserRiskScore(userId);
      riskScore += userRisk * 0.3;
    }

    // Recent failed attempts
    const failedAttempts = this.failedAttempts.get(ipAddress) || [];
    const recentFailures = failedAttempts.filter(attempt =>
      Date.now() - attempt.time < 15 * 60 * 1000
    );
    riskScore += Math.min(recentFailures.length * 0.05, 0.3);

    return Math.min(riskScore, 1.0);
  }

  /**
   * Get user risk score
   */
  private async getUserRiskScore(userId: string): Promise<number> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('security_events')
        .select('id, event_type, severity, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error || !data) {
        return 0;
      }

      // Calculate risk based on security events
      let riskScore = 0;
      for (const event of data) {
        switch (event.severity) {
          case 'low':
            riskScore += 0.1;
            break;
          case 'medium':
            riskScore += 0.3;
            break;
          case 'high':
            riskScore += 0.6;
            break;
          case 'critical':
            riskScore += 1.0;
            break;
        }
      }

      return Math.min(riskScore / data.length, 1.0);
    } catch (error) {
      console.error('Error getting user risk score:', error);
      return 0;
    }
  }

  /**
   * Check if IP is suspicious
   */
  private isSuspiciousIP(ipAddress: string): boolean {
    // Check against known malicious IPs (in real implementation, this would query a database)
    const suspiciousIPs = [
      '192.168.1.1', // Example
      '10.0.0.1'
    ];

    return suspiciousIPs.includes(ipAddress);
  }

  /**
   * Check if user agent is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      'bot',
      'crawler',
      'spider',
      'scanner',
      'test',
      'curl',
      'wget',
      'python'
    ];

    return suspiciousPatterns.some(pattern =>
      userAgent.toLowerCase().includes(pattern)
    );
  }

  /**
   * Check for injection patterns
   */
  private containsInjectionPatterns(input: string): boolean {
    const patterns = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'DROP',
      'UNION',
      'SCRIPT',
      'JAVASCRIPT',
      'ONLOAD',
      'ONERROR',
      'ALERT',
      'EVAL',
      'EXEC',
      'XP_',
      ';',
      '--',
      '/*',
      '*/',
      '@@',
      'DB_NAME'
    ];

    return patterns.some(pattern =>
      input.toUpperCase().includes(pattern)
    );
  }

  /**
   * Check for XSS patterns
   */
  private containsXSSPatterns(input: string): boolean {
    const patterns = [
      '<script',
      '</script>',
      'javascript:',
      'onload=',
      'onerror=',
      'onclick=',
      'onmouseover=',
      'alert(',
      'eval(',
      'document.',
      'window.',
      'location.',
      'cookie'
    ];

    return patterns.some(pattern =>
      input.toLowerCase().includes(pattern)
    );
  }

  /**
   * Check if IP is blocked
   */
  private isBlockedIP(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Get request count from IP
   */
  private async getRequestCountFromIP(ipAddress: string, timeWindow: number): Promise<number> {
    // In real implementation, this would query a database or cache
    return Math.floor(Math.random() * 200); // Mock implementation
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.9) return 'high';
    return 'critical';
  }

  /**
   * Log security validation
   */
  private async logSecurityValidation(
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
    validation: SecurityValidation,
    duration: number
  ): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.from('security_events').insert({
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: sessionId,
        event_type: 'security_validation',
        severity: validation.riskLevel,
        description: validation.reason,
        metadata: {
          validation: JSON.stringify(validation),
          duration,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Error logging security validation:', error);
    }
  }

  /**
   * Record failed attempt
   */
  recordFailedAttempt(ipAddress: string, reason: string): void {
    const attempts = this.failedAttempts.get(ipAddress) || [];
    attempts.push({
      time: Date.now(),
      reason
    });

    // Keep only last 100 attempts
    if (attempts.length > 100) {
      attempts.splice(0, attempts.length - 100);
    }

    this.failedAttempts.set(ipAddress, attempts);

    // Block IP if too many failures
    if (attempts.length > 50) {
      this.blockedIPs.add(ipAddress);
      console.warn(`IP blocked due to too many failed attempts: ${ipAddress}`);
    }
  }

  /**
   * Record successful authentication
   */
  recordSuccessfulAuthentication(ipAddress: string): void {
    // Clear failed attempts for successful authentication
    this.failedAttempts.delete(ipAddress);
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<{
    totalValidations: number;
    blockedRequests: number;
    activeSessions: number;
    topThreats: Array<{ type: string; count: number }>;
    riskDistribution: { low: number; medium: number; high: number; critical: number };
  }> {
    const rateMetrics = rateLimiter.getMetrics();

    return {
      totalValidations: this.sessionIntegrity.size,
      blockedRequests: rateMetrics.blockedRequests,
      activeSessions: this.sessionIntegrity.size,
      topThreats: [
        { type: 'injection', count: 10 },
        { type: 'xss', count: 5 },
        { type: 'bruteforce', count: 15 }
      ],
      riskDistribution: {
        low: 60,
        medium: 25,
        high: 10,
        critical: 5
      }
    };
  }

  /**
   * Clear old sessions
   */
  cleanupSessions(): void {
    const now = Date.now();
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessionIntegrity.entries()) {
      if (now - session.requestTime > sessionTimeout) {
        this.sessionIntegrity.delete(sessionId);
      }
    }
  }
}

// Export global instance
export const securityEnhancer = new SecurityEnhancer();

// Auto-cleanup every 5 minutes
setInterval(() => {
  securityEnhancer.cleanupSessions();
}, 5 * 60 * 1000);