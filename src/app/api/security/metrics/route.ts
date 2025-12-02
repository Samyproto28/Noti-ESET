import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/securityMiddleware';
import { rateLimiter, adaptiveRateLimiter } from '@/lib/rateLimiter';
import { securityEnhancer } from '@/lib/securityEnhancer';

/**
 * GET /api/security/metrics - Comprehensive security metrics and status
 * Provides real-time security metrics across all protection layers
 */

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Extract authentication and authorization
    const { user } = await (await import('@/lib/supabase')).createClient().auth.getUser();

    // Check if user has permission to view security metrics
    if (!user || (user.email !== 'superadmin@notieset.com' && user.email !== 'admin@notieset.com')) {
      return NextResponse.json(
        { error: 'Unauthorized - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get all metrics concurrently
    const [
      enhancedSecurityMetrics,
      rateMetrics,
      adaptiveMetrics,
      securityValidationMetrics
    ] = await Promise.all([
      securityMiddleware.getEnhancedSecurityMetrics(),
      rateLimiter.getMetrics(),
      adaptiveRateLimiter.getMetrics(),
      securityEnhancer.getSecurityMetrics()
    ]);

    // Calculate system health
    const systemHealth = calculateSystemHealth(enhancedSecurityMetrics);

    // Get recent security events
    const recentEvents = await getRecentSecurityEvents();

    // Generate recommendations
    const recommendations = await generateSecurityRecommendations(enhancedSecurityMetrics);

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        system_health: systemHealth,
        metrics: {
          enhanced_security: enhancedSecurityMetrics,
          rate_limiting: rateMetrics,
          adaptive_limiting: adaptiveMetrics,
          security_validation: securityValidationMetrics
        },
        recent_events: recentEvents,
        recommendations: recommendations,
        status_summary: {
          total_requests: enhancedSecurityMetrics.combined.totalRequests,
          blocked_requests: enhancedSecurityMetrics.combined.blockedRequests,
          suspicious_activities: enhancedSecurityMetrics.combined.suspiciousActivities,
          risk_score: enhancedSecurityMetrics.combined.riskScore,
          security_score: enhancedSecurityMetrics.combined.securityScore
        }
      }
    });

  } catch (error) {
    console.error('Error fetching security metrics:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch security metrics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate system health based on various metrics
 */
function calculateSystemHealth(metrics: any): {
  overall: 'excellent' | 'good' | 'warning' | 'critical' | 'error';
  components: {
    security_validation: 'excellent' | 'good' | 'warning' | 'critical' | 'error';
    rate_limiting: 'excellent' | 'good' | 'warning' | 'critical' | 'error';
    adaptive_limiting: 'excellent' | 'good' | 'warning' | 'critical' | 'error';
    overall_system: 'excellent' | 'good' | 'warning' | 'critical' | 'error';
  };
  details: string[];
} {
  const details: string[] = [];
  const components = {
    security_validation: 'good' as const,
    rate_limiting: 'good' as const,
    adaptive_limiting: 'good' as const,
    overall_system: 'good' as const
  };

  // Check security validation health
  const securityRisk = metrics.securityValidation.riskDistribution.critical / 100;
  if (securityRisk > 0.1) {
    components.security_validation = 'critical';
    details.push('High critical risk in security validation');
  } else if (securityRisk > 0.05) {
    components.security_validation = 'warning';
    details.push('Elevated risk in security validation');
  }

  // Check rate limiting health
  const blockRate = metrics.rateLimiting.blockedRequests / (metrics.rateLimiting.hits + metrics.rateLimiting.misses || 1);
  if (blockRate > 0.3) {
    components.rate_limiting = 'warning';
    details.push('High block rate in rate limiting');
  } else if (blockRate > 0.5) {
    components.rate_limiting = 'critical';
    details.push('Very high block rate in rate limiting');
  }

  // Check adaptive limiting health
  const adaptiveMisses = adaptiveRateLimiter.getMetrics().misses;
  const adaptiveHits = adaptiveRateLimiter.getMetrics().hits;
  const adaptiveHitRate = adaptiveHits / (adaptiveHits + adaptiveMisses || 1);
  if (adaptiveHitRate < 0.8) {
    components.adaptive_limiting = 'warning';
    details.push('Low hit rate in adaptive limiting');
  }

  // Determine overall system health
  const criticalComponents = Object.values(components).filter(status => status === 'critical').length;
  const warningComponents = Object.values(components).filter(status => status === 'warning').length;

  if (criticalComponents > 0) {
    components.overall_system = 'critical';
    details.unshift('System has critical security issues requiring immediate attention');
  } else if (warningComponents > 1) {
    components.overall_system = 'warning';
    details.unshift('System has multiple security warnings');
  } else if (warningComponents > 0) {
    components.overall_system = 'good';
    details.unshift('System operational with minor security warnings');
  } else {
    components.overall_system = 'excellent';
    details.unshift('System operating with excellent security posture');
  }

  return {
    overall: components.overall_system,
    components,
    details
  };
}

/**
 * Get recent security events
 */
async function getRecentSecurityEvents(): Promise<Array<{
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  description: string;
  resolved: boolean;
}>> {
  try {
    const supabase = await (await import('@/lib/supabase')).createClient();

    const { data, error } = await supabase
      .from('security_events')
      .select('id, event_type as type, severity, created_at as timestamp, description, resolved')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) {
      return [];
    }

    return data.map(event => ({
      ...event,
      timestamp: event.timestamp
    }));

  } catch (error) {
    console.error('Error fetching recent security events:', error);
    return [];
  }
}

/**
 * Generate security recommendations based on metrics
 */
async function generateSecurityRecommendations(metrics: any): Promise<string[]> {
  const recommendations: string[] = [];

  // Analyze risk score
  if (metrics.combined.riskScore > 0.7) {
    recommendations.push('Critical risk level detected. Implement immediate security measures and consider system lockdown.');
  } else if (metrics.combined.riskScore > 0.5) {
    recommendations.push('High risk level detected. Review security policies and increase monitoring.');
  } else if (metrics.combined.riskScore > 0.3) {
    recommendations.push('Medium risk level detected. Monitor for suspicious activities and review access patterns.');
  }

  // Analyze security score
  if (metrics.combined.securityScore < 50) {
    recommendations.push('Low security score detected. Comprehensive security review recommended.');
  } else if (metrics.combined.securityScore < 75) {
    recommendations.push('Moderate security score. Consider implementing additional security measures.');
  }

  // Analyze blocked requests
  const blockRate = metrics.combined.blockedRequests / metrics.combined.totalRequests;
  if (blockRate > 0.4) {
    recommendations.push('High block rate detected. Review authentication policies and consider implementing CAPTCHA.');
  } else if (blockRate > 0.2) {
    recommendations.push('Elevated block rate. Monitor for potential attacks and review rate limiting policies.');
  }

  // Analyze suspicious activities
  if (metrics.combined.suspiciousActivities > 50) {
    recommendations.push('High number of suspicious activities. Implement enhanced monitoring and user verification.');
  } else if (metrics.combined.suspiciousActivities > 20) {
    recommendations.push('Moderate suspicious activities. Monitor patterns and consider additional validation.');
  }

  // System-specific recommendations
  if (metrics.traditionalSecurity.suspiciousActivities > 10) {
    recommendations.push('Multiple suspicious activities detected. Review user access patterns and consider behavioral analysis.');
  }

  if (metrics.rateLimiting.evictionCount > 100) {
    recommendations.push('High cache eviction rate. Consider optimizing memory usage and cache configuration.');
  }

  // Always include general recommendations
  recommendations.push('Regular security audits and penetration testing recommended.');
  recommendations.push('Keep security systems updated with latest patches and threat intelligence.');
  recommendations.push('Implement regular security awareness training for administrators.');

  return recommendations;
}