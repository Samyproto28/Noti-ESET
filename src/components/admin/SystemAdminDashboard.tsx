'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Database,
  Users,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface SystemStats {
  total_users: number;
  active_users: number;
  total_news: number;
  published_news: number;
  system_uptime: string;
  last_backup: string;
  security_alerts: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

export function SystemAdminDashboard() {
  const { hasPermission, user } = usePermissions();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setIsRefreshing(true);

      // Cargar estadísticas del sistema
      const statsResponse = await fetch('/api/admin/system-stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Cargar alertas del sistema
      const alertsResponse = await fetch('/api/admin/system-alerts');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error('Error al cargar datos del sistema:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'info':
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertVariant = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'success':
        return 'default';
      case 'info':
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Cargando datos del sistema...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel del Sistema</h2>
          <p className="text-gray-600">Monitoreo y gestión del sistema completo</p>
        </div>
        <Button
          onClick={loadSystemData}
          disabled={isRefreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </Button>
      </div>

      {/* Alertas del sistema */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Alertas del Sistema</h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant={getAlertVariant(alert.type)}>
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <span className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                    </div>
                    <AlertDescription className="text-sm text-gray-600 mt-1">
                      {alert.message}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_users} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Artículos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_news}</div>
            <p className="text-xs text-muted-foreground">
              {stats.published_news} publicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo de Operación</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.system_uptime}</div>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Seguridad</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.security_alerts}</div>
            <p className="text-xs text-muted-foreground">Activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Panel de control rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuración del sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Configuración del Sistema</span>
            </CardTitle>
            <CardDescription>
              Gestión global de configuraciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPermission('system', 'manage') && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/admin/settings'}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración General
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Gestión de Base de Datos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Respaldo y Restauración
                </Button>
              </div>
            )}
            {!hasPermission('system', 'manage') && (
              <p className="text-sm text-gray-500">
                No tiene permisos para gestionar la configuración del sistema.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Seguridad y monitoreo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Seguridad y Monitoreo</span>
            </CardTitle>
            <CardDescription>
              Monitoreo de seguridad y actividad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPermission('security', 'monitor') && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Auditoría del Sistema
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Logs de Seguridad
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Gestión de Alertas
                </Button>
              </div>
            )}
            {!hasPermission('security', 'monitor') && (
              <p className="text-sm text-gray-500">
                No tiene permisos para monitorear la seguridad del sistema.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
          <CardDescription>
            Detalles técnicos y estado actual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Último respaldo:</span>
              <p className="text-gray-600">{stats.last_backup}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Versión del sistema:</span>
              <p className="text-gray-600">v2.1.0</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Base de datos:</span>
              <p className="text-gray-600">PostgreSQL 14.7</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Estado:</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Operativo
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}