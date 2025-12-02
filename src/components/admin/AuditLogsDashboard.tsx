'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { auditService, type AuditLogEntry, type AuditStatistics } from '@/lib/auditService';

interface AuditLogsDashboardProps {
  compact?: boolean;
}

interface FilterState {
  usuario_id: string;
  desde: string;
  hasta: string;
  rol_anterior: string;
  rol_nuevo: string;
  razon: string;
}

export function AuditLogsDashboard({ compact = false }: AuditLogsDashboardProps) {
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Estados de filtros
  const [filters, setFilters] = useState<FilterState>({
    usuario_id: '',
    desde: '',
    hasta: '',
    rol_anterior: '',
    rol_nuevo: '',
    razon: ''
  });

  const [pagination, setPagination] = useState({
    pagina: 1,
    limite: 20,
    total_registros: 0,
    total_paginas: 1
  });

  // Verificar permisos
  const canViewAudit = hasPermission('audit', 'read');

  useEffect(() => {
    if (canViewAudit) {
      loadDashboardData();
    }
  }, [canViewAudit]);

  const loadDashboardData = useCallback(async () => {
    if (!canViewAudit) return;

    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        auditService.getAuditLogs({ limite: 10 }),
        auditService.getAuditStatistics()
      ]);

      setLogs(logsData.logs);
      setStatistics(statsData);
      setPagination(pagination);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [canViewAudit]);

  const loadLogs = useCallback(async (pagina = 1) => {
    if (!canViewAudit) return;

    setLoading(true);
    try {
      const filterData: any = {
        ...filters,
        limite: pagination.limite,
        pagina
      };

      // Remover filtros vacíos
      Object.keys(filterData).forEach(key => {
        if (!filterData[key]) delete filterData[key];
      });

      const logsData = await auditService.getAuditLogs(filterData);
      setLogs(logsData.logs);
      setPagination(logsData.paginacion);
    } catch (error) {
      console.error('Error al cargar logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limite, canViewAudit]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      usuario_id: '',
      desde: '',
      hasta: '',
      rol_anterior: '',
      rol_nuevo: '',
      razon: ''
    });
  };

  const exportLogs = async (format: 'csv' | 'json') => {
    if (!canViewAudit) return;

    try {
      const filterData: any = { ...filters };
      Object.keys(filterData).forEach(key => {
        if (!filterData[key]) delete filterData[key];
      });

      const exportedData = await auditService.exportAuditLogs(filterData, format);

      const blob = new Blob([exportedData], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al exportar logs:', error);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES');
  };

  const getRoleBadgeColor = (roleName: string) => {
    const colors: Record<string, string> = {
      'estudiante': 'bg-gray-100 text-gray-800',
      'moderador': 'bg-blue-100 text-blue-800',
      'admin': 'bg-orange-100 text-orange-800',
      'superadmin': 'bg-red-100 text-red-800'
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800';
  };

  if (!canViewAudit) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-yellow-800 font-medium">
            No tiene permisos para ver la auditoría
          </span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Estadísticas rápidas */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-blue-600">{statistics.total_cambios}</div>
              <div className="text-sm text-gray-600">Cambios Totales</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-green-600">{statistics.actividades_recientes[0]?.count || 0}</div>
              <div className="text-sm text-gray-600">Cambios Hoy</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-purple-600">{statistics.cambios_por_usuario.length}</div>
              <div className="text-sm text-gray-600">Usuarios Activos</div>
            </div>
          </div>
        )}

        {/* Logs recientes */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
          </div>
          <div className="divide-y">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(log)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{log.usuario_nombre || log.usuario_email}</span>
                      <span className="text-gray-500">→</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(log.rol_nuevo)}`}>
                        {log.rol_nuevo}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {log.razon} • {formatDate(log.timestamp)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLog(log);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal de detalle */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Detalle de Cambio</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Usuario</label>
                      <p className="text-sm text-gray-900">{selectedLog.usuario_nombre || selectedLog.usuario_email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Realizado Por</label>
                      <p className="text-sm text-gray-900">{selectedLog.realizado_por_nombre || selectedLog.realizado_por_email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Rol Anterior</label>
                      <p className="text-sm text-gray-600">{selectedLog.rol_anterior || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Rol Nuevo</label>
                      <p className={`text-sm font-medium ${getRoleBadgeColor(selectedLog.rol_nuevo).replace('bg-', 'text-').replace('100', '600')}`}>
                        {selectedLog.rol_nuevo}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Razón</label>
                    <p className="text-sm text-gray-900">{selectedLog.razon}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="text-sm text-gray-600">{formatDate(selectedLog.timestamp)}</p>
                  </div>

                  {selectedLog.ip_address && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">IP Address</label>
                      <p className="text-sm text-gray-600">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista completa
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de Auditoría</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => exportLogs('csv')}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => exportLogs('json')}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Exportar JSON
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{statistics.total_cambios}</div>
            <div className="text-sm text-gray-600">Cambios Totales</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">{statistics.actividades_recientes[0]?.count || 0}</div>
            <div className="text-sm text-gray-600">Cambios Hoy</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-purple-600">{statistics.cambios_por_usuario.length}</div>
            <div className="text-sm text-gray-600">Usuarios Activos</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-orange-600">{statistics.cambios_por_rol.length}</div>
            <div className="text-sm text-gray-600">Tipos de Cambio</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4">Filtros de Búsqueda</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              value={filters.usuario_id}
              onChange={(e) => handleFilterChange('usuario_id', e.target.value)}
              placeholder="ID de usuario..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol Nuevo</label>
            <select
              value={filters.rol_nuevo}
              onChange={(e) => handleFilterChange('rol_nuevo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            >
              <option value="">Todos los roles</option>
              <option value="estudiante">Estudiante</option>
              <option value="moderador">Moderador</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razón</label>
            <input
              type="text"
              value={filters.razon}
              onChange={(e) => handleFilterChange('razon', e.target.value)}
              placeholder="Buscar en razón..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex justify-between mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Limpiar Filtros
          </button>
          <button
            onClick={() => loadLogs(1)}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Registro de Cambios</h3>
          <p className="text-sm text-gray-600">Mostrando {logs.length} de {pagination.total_registros} registros</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Cargando logs...</p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-3">
                    <div className="font-medium text-gray-900">{log.usuario_nombre || log.usuario_email}</div>
                    <div className="text-sm text-gray-600">{formatDate(log.timestamp)}</div>
                  </div>
                  <div className="md:col-span-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(log.rol_anterior || 'none')}`}>
                      {log.rol_anterior || 'N/A'}
                    </span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(log.rol_nuevo)}`}>
                      {log.rol_nuevo}
                    </span>
                  </div>
                  <div className="md:col-span-3">
                    <div className="text-sm text-gray-900">{log.razon}</div>
                    <div className="text-xs text-gray-600">por {log.realizado_por_nombre || log.realizado_por_email}</div>
                  </div>
                  <div className="md:col-span-2">
                    {log.ip_address && (
                      <div className="text-xs text-gray-600">{log.ip_address}</div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Ver Detalle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Página {pagination.pagina} de {pagination.total_paginas}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => loadLogs(pagination.pagina - 1)}
              disabled={pagination.pagina <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => loadLogs(pagination.pagina + 1)}
              disabled={pagination.pagina >= pagination.total_paginas}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal de detalle (similar a la vista compacta) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Detalle de Cambio</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Usuario</label>
                    <p className="text-sm text-gray-900">{selectedLog.usuario_nombre || selectedLog.usuario_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Realizado Por</label>
                    <p className="text-sm text-gray-900">{selectedLog.realizado_por_nombre || selectedLog.realizado_por_email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rol Anterior</label>
                    <p className="text-sm text-gray-600">{selectedLog.rol_anterior || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Rol Nuevo</label>
                    <p className={`text-sm font-medium ${getRoleBadgeColor(selectedLog.rol_nuevo).replace('bg-', 'text-').replace('100', '600')}`}>
                      {selectedLog.rol_nuevo}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Razón</label>
                  <p className="text-sm text-gray-900">{selectedLog.razon}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-600">{formatDate(selectedLog.timestamp)}</p>
                </div>

                {selectedLog.ip_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">IP Address</label>
                    <p className="text-sm text-gray-600">{selectedLog.ip_address}</p>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">User Agent</label>
                    <p className="text-xs text-gray-600 break-all">{selectedLog.user_agent}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}