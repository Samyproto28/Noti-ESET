'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { SecurityAlert, type SecurityStats, type SecurityThreat } from '@/lib/securityMiddleware';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const securityReportSchema = z.object({
  days: z.number().int().min(1).max(30).default(7),
  include_user_activity: z.boolean().default(false),
  include_recommendations: z.boolean().default(true)
});

type SecurityReportFormData = z.infer<typeof securityReportSchema>;

interface SecurityDashboardProps {
  compact?: boolean;
  onThreatClick?: (threat: SecurityThreat) => void;
}

export function SecurityDashboard({ compact = false, onThreatClick }: SecurityDashboardProps) {
  const { hasPermission, hasRole, user } = usePermissions();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState<SecurityThreat | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<SecurityReportFormData>({
    resolver: zodResolver(securityReportSchema),
    defaultValues: {
      days: 7,
      include_user_activity: false,
      include_recommendations: true
    }
  });

  const watchedDays = watch('days');

  // Cargar datos iniciales
  useEffect(() => {
    if (!user) return;

    loadSecurityData();

    if (autoRefresh) {
      const interval = setInterval(loadSecurityData, 30000); // Refrescar cada 30 segundos
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [user, autoRefresh]);

  const loadSecurityData = async () => {
    if (!user) return;

    try {
      const [statsResponse, threatsResponse] = await Promise.all([
        fetch('/api/security/access?action=stats', {
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/security/access?action=threats', {
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [statsData, threatsData] = await Promise.all([
        statsResponse.json(),
        threatsResponse.json()
      ]);

      if (statsData.success) {
        setStats(statsData.data);
      }

      if (threatsData.success) {
        setThreats(threatsData.data.threats);
      }
    } catch (error) {
      console.error('Error al cargar datos de seguridad:', error);
    }
  };

  const handleSecurityAccess = async (resource: string, action: string, metadata?: any) => {
    try {
      const response = await fetch('/api/security/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource, action, metadata: metadata || {} })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error en validación de seguridad:', error);
      return { success: false, allowed: false, reason: 'Error en validación' };
    }
  };

  const generateReport = async (data: SecurityReportFormData) => {
    setIsGeneratingReport(true);

    try {
      const response = await fetch(`/api/security/access?action=report&days=${data.days}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        alert('Informe de seguridad generado exitosamente');
        // Aquí podría abrir un modal o nueva página con el informe
      } else {
        alert('Error al generar informe: ' + result.error);
      }
    } catch (error) {
      console.error('Error al generar informe:', error);
      alert('Error al generar informe');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'privilege_escalation': return '🔥';
      case 'permission_bypass': return '🚫';
      case 'role_modification': return '👤';
      case 'suspicious_pattern': return '⚠️';
      default: return '❓';
    }
  };

  const getSecurityScore = () => {
    if (!stats) return 0;

    const blockRate = stats.totalAttempts > 0 ? (stats.blockedAttempts / stats.totalAttempts) : 0;
    const suspiciousRate = stats.totalAttempts > 0 ? (stats.suspiciousActivities / stats.totalAttempts) : 0;

    // Calcular puntaje de seguridad (0-100)
    let score = 100;
    score -= blockRate * 50; // Penalizar bloqueos
    score -= suspiciousRate * 30; // Penalizar actividades sospechosas

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const securityScore = getSecurityScore();
  const scoreColor = securityScore >= 90 ? 'text-green-600' :
                    securityScore >= 70 ? 'text-yellow-600' : 'text-red-600';

  if (compact) {
    return (
      <div className=\"p-4 bg-white rounded-lg shadow border border-gray-200\">
        <div className=\"flex items-center justify-between mb-4\">
          <h3 className=\"text-lg font-semibold text-gray-900\">Estado de Seguridad</h3>
          <div className=\"flex items-center space-x-2\">
            <span className={`text-2xl font-bold ${scoreColor}`}>{securityScore}</span>
            <span className=\"text-sm text-gray-500\">puntaje</span>
          </div>
        </div>

        <div className=\"grid grid-cols-3 gap-4 text-center\">
          <div>
            <div className=\"text-2xl font-bold text-blue-600\">{stats?.totalAttempts || 0}</div>
            <div className=\"text-xs text-gray-500\">Intentos</div>
          </div>
          <div>
            <div className=\"text-2xl font-bold text-red-600\">{stats?.blockedAttempts || 0}</div>
            <div className=\"text-xs text-gray-500\">Bloqueados</div>
          </div>
          <div>
            <div className=\"text-2xl font-bold text-orange-600\">{stats?.suspiciousActivities || 0}</div>
            <div className=\"text-xs text-gray-500\">Sospechosos</div>
          </div>
        </div>

        <div className=\"mt-4 flex justify-between items-center\">
          <label className=\"flex items-center space-x-2 text-sm text-gray-600\">
            <input
              type=\"checkbox\"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className=\"rounded border-gray-300\"
            />
            <span>Auto refrescar</span>
          </label>
          <button
            onClick={loadSecurityData}
            className=\"text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors\"
          >
            Actualizar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      <div className=\"flex items-center justify-between\">
        <h2 className=\"text-2xl font-bold text-gray-900\">Panel de Seguridad</h2>
        <div className=\"flex items-center space-x-4\">
          <div className=\"flex items-center space-x-2\">
            <span className=\"text-sm text-gray-500\">Puntaje de seguridad:</span>
            <span className={`text-2xl font-bold ${scoreColor}`}>{securityScore}</span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-sm rounded ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } transition-colors`}
          >
            {autoRefresh ? 'Auto refrescar: ON' : 'Auto refrescar: OFF'}
          </button>
        </div>
      </div>

      {/* Estadísticas de seguridad */}
      {stats && (
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
          <div className=\"bg-blue-50 p-4 rounded-lg\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm text-blue-600 font-medium\">Intentos Totales</p>
                <p className=\"text-2xl font-bold text-blue-900\">{stats.totalAttempts}</p>
              </div>
              <div className=\"text-blue-500\">📊</div>
            </div>
          </div>

          <div className=\"bg-red-50 p-4 rounded-lg\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm text-red-600 font-medium\">Bloqueados</p>
                <p className=\"text-2xl font-bold text-red-900\">{stats.blockedAttempts}</p>
              </div>
              <div className=\"text-red-500\">🚫</div>
            </div>
          </div>

          <div className=\"bg-orange-50 p-4 rounded-lg\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm text-orange-600 font-medium\">Sospechosos</p>
                <p className=\"text-2xl font-bold text-orange-900\">{stats.suspiciousActivities}</p>
              </div>
              <div className=\"text-orange-500\">⚠️</div>
            </div>
          </div>

          <div className=\"bg-purple-50 p-4 rounded-lg\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm text-purple-600 font-medium\">Tasa de Bloqueo</p>
                <p className=\"text-2xl font-bold text-purple-900\">{stats.block_rate}</p>
              </div>
              <div className=\"text-purple-500\">📈</div>
            </div>
          </div>
        </div>
      )}

      {/* Amenazas recientes */}
      <div className=\"bg-white rounded-lg shadow border border-gray-200\">
        <div className=\"px-6 py-4 border-b border-gray-200\">
          <div className=\"flex items-center justify-between\">
            <h3 className=\"text-lg font-semibold text-gray-900\">Amenazas Recientes</h3>
            <span className=\"text-sm text-gray-500\">Últimas 24 horas</span>
          </div>
        </div>

        <div className=\"divide-y divide-gray-200\">
          {threats.length === 0 ? (
            <div className=\"p-6 text-center text-gray-500\">
              No hay amenazas detectadas en las últimas 24 horas
            </div>
          ) : (
            threats.slice(0, 10).map((threat) => (
              <div
                key={threat.id}
                className=\"p-4 hover:bg-gray-50 cursor-pointer transition-colors\"
                onClick={() => onThreatClick?.(threat)}
              >
                <div className=\"flex items-center justify-between\">
                  <div className=\"flex items-center space-x-3\">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(threat.severity)}`} />
                    <span className=\"text-lg\">{getActivityTypeIcon(threat.activity_type)}</span>
                    <div>
                      <p className=\"font-medium text-gray-900\">{threat.activity_type.replace(/_/g, ' ')}</p>
                      <p className=\"text-sm text-gray-500\">{threat.description}</p>
                    </div>
                  </div>
                  <div className=\"text-right\">
                    <p className=\"text-sm text-gray-500\">{new Date(threat.timestamp).toLocaleTimeString()}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(threat.severity)} text-white`}>
                      {threat.severity}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Formulario de generación de informes */}
      <div className=\"bg-white rounded-lg shadow border border-gray-200\">
        <div className=\"px-6 py-4 border-b border-gray-200\">
          <h3 className=\"text-lg font-semibold text-gray-900\">Generar Informe de Seguridad</h3>
        </div>

        <form onSubmit={handleSubmit(generateReport)} className=\"p-6 space-y-4\">
          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                Período (días)
              </label>
              <input
                type=\"number\"
                min=\"1\"
                max=\"30\"
                {...register('days', { valueAsNumber: true })}
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500\"
              />
              {errors.days && (
                <p className=\"mt-1 text-sm text-red-600\">{errors.days.message}</p>
              )}
            </div>

            <div className=\"flex items-center space-x-2\">
              <input
                type=\"checkbox\"
                {...register('include_user_activity')}
                className=\"rounded border-gray-300\"
              />
              <label className=\"text-sm text-gray-700\">Actividad por usuario</label>
            </div>

            <div className=\"flex items-center space-x-2\">
              <input
                type=\"checkbox\"
                {...register('include_recommendations')}
                defaultChecked
                className=\"rounded border-gray-300\"
              />
              <label className=\"text-sm text-gray-700\">Recomendaciones</label>
            </div>
          </div>

          <div className=\"flex justify-end\">
            <button
              type=\"submit\"
              disabled={isGeneratingReport}
              className=\"px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors\"
            >
              {isGeneratingReport ? (
                <span className=\"flex items-center\">
                  <svg className=\"animate-spin -ml-1 mr-2 h-4 w-4 text-white\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\">
                    <circle className=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" strokeWidth=\"4\"></circle>
                    <path className=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\"></path>
                  </svg>
                  Generando...
                </span>
              ) : 'Generar Informe'}
            </button>
          </div>
        </form>
      </div>

      {/* Prueba de validación de seguridad */}
      <div className=\"bg-white rounded-lg shadow border border-gray-200\">
        <div className=\"px-6 py-4 border-b border-gray-200\">
          <h3 className=\"text-lg font-semibold text-gray-900\">Prueba de Validación de Seguridad</h3>
        </div>

        <div className=\"p-6\">
          <p className=\"text-sm text-gray-600 mb-4\">
            Usa este formulario para probar el middleware de seguridad y ver cómo valida diferentes acciones.
          </p>

          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                Recurso
              </label>
              <select className=\"w-full px-3 py-2 border border-gray-300 rounded-md\">
                <option value=\"users\">Usuarios</option>
                <option value=\"roles\">Roles</option>
                <option value=\"permissions\">Permisos</option>
                <option value=\"audit\">Auditoría</option>
                <option value=\"security\">Seguridad</option>
              </select>
            </div>

            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                Acción
              </label>
              <select className=\"w-full px-3 py-2 border border-gray-300 rounded-md\">
                <option value=\"read\">Leer</option>
                <option value=\"create\">Crear</option>
                <option value=\"update\">Actualizar</option>
                <option value=\"delete\">Eliminar</option>
                <option value=\"assign\">Asignar</option>
              </select>
            </div>
          </div>

          <div className=\"mt-4\">
            <button
              onClick={() => handleSecurityAccess('users', 'read')}
              className=\"px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors mr-2\"
            >
              Probar Acceso Seguro
            </button>
            <button
              onClick={() => handleSecurityAccess('security', 'admin')}
              className=\"px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors\"
            >
              Probar Acceso Peligroso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}