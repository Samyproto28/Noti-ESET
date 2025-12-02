-- Migración para tablas de monitoreo de seguridad
-- Crea tablas para registrar intentos de acceso, actividades sospechosas y alertas de seguridad

-- Tabla para registrar todos los intentos de acceso al sistema
CREATE TABLE security_access_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    granted BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    INDEX idx_user_id (user_id),
    INDEX idx_resource_action (resource, action),
    INDEX idx_timestamp (timestamp),
    INDEX idx_ip_address (ip_address),
    INDEX idx_granted (granted)
);

-- Tabla para registrar actividades sospechosas detectadas por el middleware
CREATE TABLE security_suspicious_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (
        activity_type IN (
            'privilege_escalation',
            'permission_bypass',
            'role_modification',
            'suspicious_pattern'
        )
    ),
    severity VARCHAR(20) NOT NULL CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (
        status IN ('pending_review', 'investigating', 'resolved', 'false_positive')
    ),
    assigned_to UUID REFERENCES profiles(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_severity (severity),
    INDEX idx_timestamp (timestamp),
    INDEX idx_status (status)
);

-- Tabla para reglas de seguridad personalizables
CREATE TABLE security_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    condition TEXT NOT NULL, -- Expresión condicional para evaluar la regla
    severity VARCHAR(20) NOT NULL CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    action VARCHAR(20) NOT NULL CHECK (
        action IN ('block', 'log', 'alert', 'escalate')
    ),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    INDEX idx_enabled (enabled),
    INDEX idx_severity (severity)
);

-- Tabla para historial de cambios de roles del usuario (auditoría de seguridad extendida)
CREATE TABLE security_role_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    old_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    new_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    change_reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    security_impact VARCHAR(50) CHECK (
        security_impact IN ('low', 'medium', 'high', 'critical', 'unknown')
    ) DEFAULT 'unknown',
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_security_impact (security_impact)
);

-- Tabla para alertas de seguridad críticas
CREATE TABLE security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    ),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resource VARCHAR(100),
    action VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'acknowledged', 'resolved', 'dismissed')
    ),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert_type (alert_type),
    INDEX idx_severity (severity),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Tabla para sesiones de seguridad y detección de session hijacking
CREATE TABLE security_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_token UUID NOT NULL UNIQUE,
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    location_city VARCHAR(100),
    location_country VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_suspicious BOOLEAN NOT NULL DEFAULT false,
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_last_activity (last_activity),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
);

-- Crear disparadores para auditoría automática

-- Disparador para registrar cambios de roles en la tabla de seguridad
CREATE OR REPLACE FUNCTION trigger_security_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.rol_id IS DISTINCT FROM NEW.rol_id THEN
        INSERT INTO security_role_changes (
            user_id, old_role_id, new_role_id, changed_by,
            change_reason, timestamp, ip_address, user_agent,
            metadata, security_impact
        ) VALUES (
            NEW.user_id,
            (SELECT id FROM roles WHERE id = OLD.rol_id),
            (SELECT id FROM roles WHERE id = NEW.rol_id),
            NEW.asignado_por,
            NEW.razon,
            CURRENT_TIMESTAMP,
            NEW.ip_address,
            NEW.user_agent,
            NEW.metadata,
            CASE
                WHEN NEW.rol_id IN (SELECT id FROM roles WHERE level >= 3) THEN 'critical'
                WHEN NEW.rol_id IN (SELECT id FROM roles WHERE level = 2) THEN 'medium'
                ELSE 'low'
            END
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar disparador a la tabla user_roles
CREATE TRIGGER security_role_change_trigger
    AFTER UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_security_role_change();

-- Disparador para detectar intentos de SQL injection en metadata
CREATE OR REPLACE FUNCTION validate_metadata_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Buscar patrones de inyección SQL en los campos de metadata
    IF TG_TABLE_NAME = 'security_access_attempts' AND NEW.metadata IS NOT NULL THEN
        IF NEW.metadata::text ~* '(?i)(select|insert|update|delete|drop|alter|truncate|exec|execute|xp_cmdshell|sp_oacreate)' THEN
            -- Marcar como sospechoso y registrar alerta
            INSERT INTO security_suspicious_activities (
                user_id, activity_type, severity, description,
                ip_address, metadata, status
            ) VALUES (
                NEW.user_id,
                'permission_bypass',
                'high',
                'Posible intento de inyección SQL detectado en metadata',
                NEW.ip_address,
                NEW.metadata,
                'investigating'
            );

            INSERT INTO security_alerts (
                alert_type, severity, title, message,
                user_id, status, metadata
            ) VALUES (
                'sql_injection_attempt',
                'critical',
                'Intento de Inyección SQL Detectado',
                'Se detectó un posible intento de inyección SQL en los metadatos de acceso',
                NEW.user_id,
                'active',
                jsonb_build_object(
                    'resource', NEW.resource,
                    'action', NEW.action,
                    'metadata_content', NEW.metadata
                )
            );
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar disparador a la tabla de intentos de acceso
CREATE TRIGGER validate_metadata_content_trigger
    BEFORE INSERT OR UPDATE ON security_access_attempts
    FOR EACH ROW
    EXECUTE FUNCTION validate_metadata_content();

-- Crear función para análisis de patrones de comportamiento
CREATE OR REPLACE FUNCTION analyze_user_behavior_patterns(
    p_user_id UUID,
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    pattern_type VARCHAR(50),
    occurrence_count INTEGER,
    severity VARCHAR(20),
    first_detected TIMESTAMP,
    last_detected TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH user_attempts AS (
        SELECT
            resource,
            action,
            granted,
            timestamp,
            ip_address
        FROM security_access_attempts
        WHERE user_id = p_user_id
        AND timestamp >= CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL
        ORDER BY timestamp
    ),
    patterns AS (
        -- Detectar patrones rápidos de acceso
        SELECT
            'rapid_access'::VARCHAR(50) AS pattern_type,
            COUNT(*)::INTEGER AS occurrence_count,
            'medium'::VARCHAR(20) AS severity,
            MIN(timestamp)::TIMESTAMP AS first_detected,
            MAX(timestamp)::TIMESTAMP AS last_detected
        FROM user_attempts
        WHERE timestamp >= CURRENT_TIMESTAMP - '5 minutes'::INTERVAL

        UNION ALL

        -- Detectar múltiples IPs
        SELECT
            'multiple_ips'::VARCHAR(50) AS pattern_type,
            COUNT(DISTINCT ip_address)::INTEGER AS occurrence_count,
            CASE
                WHEN COUNT(DISTINCT ip_address) > 3 THEN 'high'
                ELSE 'medium'
            END::VARCHAR(20) AS severity,
            CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL::TIMESTAMP AS first_detected,
            CURRENT_TIMESTAMP AS last_detected
        FROM user_attempts
        GROUP BY user_id
        HAVING COUNT(DISTINCT ip_address) > 1

        UNION ALL

        -- Detectar intentos fallidos consecutivos
        SELECT
            'failed_attempts'::VARCHAR(50) AS pattern_type,
            COUNT(*)::INTEGER AS occurrence_count,
            CASE
                WHEN COUNT(*) > 5 THEN 'high'
                WHEN COUNT(*) > 2 THEN 'medium'
                ELSE 'low'
            END::VARCHAR(20) AS severity,
            MIN(timestamp)::TIMESTAMP AS first_detected,
            MAX(timestamp)::TIMESTAMP AS last_detected
        FROM user_attempts
        WHERE granted = false
        AND timestamp >= CURRENT_TIMESTAMP - '15 minutes'::INTERVAL
        GROUP BY user_id
    )
    SELECT * FROM patterns
    ORDER BY occurrence_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Crear función para generar informe de seguridad automatizado
CREATE OR REPLACE FUNCTION generate_security_report(
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
    report_date DATE,
    total_attempts INTEGER,
    blocked_attempts INTEGER,
    suspicious_activities INTEGER,
    critical_threats INTEGER,
    block_rate DECIMAL(5,2),
    top_threat_type VARCHAR(50),
    recommendations TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH security_metrics AS (
        SELECT
            DATE(timestamp) AS report_date,
            COUNT(*)::INTEGER AS total_attempts,
            COUNT(CASE WHEN granted = false THEN 1 END)::INTEGER AS blocked_attempts,
            COUNT(DISTINCT activity_id)::INTEGER AS suspicious_activities,
            COUNT(CASE WHEN severity = 'critical' THEN 1 END)::INTEGER AS critical_threats,
            (COUNT(CASE WHEN granted = false THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0))::DECIMAL(5,2) AS block_rate
        FROM (
            SELECT
                DATE(sa.timestamp) AS timestamp,
                TRUE AS granted,
                NULL::UUID AS activity_id
            FROM security_access_attempts sa
            WHERE sa.timestamp >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL

            UNION ALL

            SELECT
                DATE(sra.timestamp) AS timestamp,
                NULL AS granted,
                sra.id AS activity_id
            FROM security_role_changes sra
            WHERE sra.timestamp >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
        ) combined_data
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp) DESC
    ),
    threat_analysis AS (
        SELECT
            activity_type,
            COUNT(*)::INTEGER as threat_count,
            severity
        FROM security_suspicious_activities
        WHERE timestamp >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
        GROUP BY activity_type, severity
        ORDER BY threat_count DESC
        LIMIT 1
    ),
    recommendations_array AS (
        SELECT
            ARRAY[
                CASE
                    WHEN block_rate > 30 THEN 'Alta tasa de bloqueos. Considera revisar políticas de seguridad.'
                    ELSE NULL
                END,
                CASE
                    WHEN critical_threats > 0 THEN 'Amenazas críticas detectadas. Requiere atención inmediata.'
                    ELSE NULL
                END,
                CASE
                    WHEN suspicious_activities > 10 THEN 'Alta actividad sospechosa. Considera implementar MFA.'
                    ELSE NULL
                END
            ] FILTER (WHERE element IS NOT NULL) AS recommendations
        FROM security_metrics
        LIMIT 1
    )
    SELECT
        sm.report_date,
        sm.total_attempts,
        sm.blocked_attempts,
        sm.suspicious_activities,
        sm.critical_threats,
        sm.block_rate,
        COALESCE(tha.activity_type, 'N/A') AS top_threat_type,
        COALESCE(ra.recommendations, ARRAY[]::TEXT[]) AS recommendations
    FROM security_metrics sm
    LEFT JOIN threat_analysis tha ON 1=1
    LEFT JOIN recommendations_array ra ON 1=1
    WHERE sm.total_attempts > 0;
END;
$$ LANGUAGE plpgsql;

-- Insertar reglas de seguridad por defecto
INSERT INTO security_rules (name, description, condition, severity, action) VALUES
(
    'rate_limit_protection',
    'Protección contra ataques de fuerza bruta',
    'attempts >= 5 AND time_window <= 900000',
    'medium',
    'block'
),
(
    'privilege_escalation_detection',
    'Detección de intentos de escalamiento de privilegios',
    'target_role_level >= admin_level AND admin_level < 4',
    'critical',
    'escalate'
),
(
    'sql_injection_detection',
    'Detección de intentos de inyección SQL',
    'metadata ~* (select|insert|update|delete)',
    'critical',
    'block'
),
(
    'session_hijacking_detection',
    'Detección de session hijacking',
    'unique_ips >= 3 AND time_window <= 7200000',
    'high',
    'alert'
),
(
    'bulk_operation_monitoring',
    'Monitoreo de operaciones masivas',
    'batch_size >= 50 AND user_not_admin',
    'medium',
    'log'
);

-- Crear índices para mejorar rendimiento de consultas de seguridad
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_access_attempts_composite
    ON security_access_attempts (user_id, timestamp, granted);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_suspicious_activities_composite
    ON security_suspicious_activities (user_id, activity_type, severity);

-- Crear vista para consulta rápida de eventos de seguridad
CREATE OR REPLACE VIEW security_events_overview AS
SELECT
    DATE_TRUNC('day', timestamp) AS event_date,
    COUNT(*)::INTEGER AS total_events,
    COUNT(CASE WHEN granted = false THEN 1 END)::INTEGER AS blocked_events,
    COUNT(CASE WHEN activity_type = 'privilege_escalation' THEN 1 END)::INTEGER AS escalation_attempts,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END)::INTEGER AS critical_events,
    COUNT(DISTINCT user_id)::INTEGER AS unique_users_affected
FROM (
    SELECT timestamp, granted, NULL::VARCHAR AS activity_type, NULL::VARCHAR AS severity FROM security_access_attempts
    UNION ALL
    SELECT timestamp, NULL AS granted, activity_type, severity FROM security_suspicious_activities
) combined_events
WHERE timestamp >= CURRENT_TIMESTAMP - '7 days'::INTERVAL
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY event_date DESC;

-- Otorgar permisos necesarios al servicio de rol para auditoría de seguridad
GRANT INSERT, SELECT ON security_access_attempts TO authenticated;
GRANT INSERT, SELECT ON security_suspicious_activities TO authenticated;
GRANT INSERT, SELECT, UPDATE ON security_role_changes TO authenticated;
GRANT SELECT ON security_rules TO authenticated;
GRANT INSERT, SELECT ON security_alerts TO authenticated;
GRANT INSERT, SELECT, UPDATE ON security_sessions TO authenticated;

-- NOTA: Esta migración crea un sistema completo de monitoreo de seguridad
-- con detección de patrones, análisis de comportamiento y auditoría extendida.
-- Las funciones disparadores aseguran que todos los eventos críticos sean registrados automáticamente.