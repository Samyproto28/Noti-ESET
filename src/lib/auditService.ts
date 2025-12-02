import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { permissionService } from './permissions';

export interface AuditLogFilter {
  usuario_id?: string;
  desde?: string;
  hasta?: string;
  limite?: number;
  pagina?: number;
  rol_anterior?: string;
  rol_nuevo?: string;
  realizado_por?: string;
  razon?: string;
}

export interface AuditLogEntry {
  id: string;
  usuario_id: string;
  usuario_email: string;
  usuario_nombre: string;
  rol_anterior: string | null;
  rol_nuevo: string;
  realizado_por: string;
  realizado_por_email: string;
  realizado_por_nombre: string;
  timestamp: string;
  razon: string;
  ip_address: string | null;
  user_agent: string | null;
  request_metadata: Database['public']['Tables']['auditoria_cambios_rol']['Row']['request_metadata'];
}

export interface AuditStatistics {
  total_cambios: number;
  cambios_por_rol: Array<{
    rol_anterior: string | null;
    rol_nuevo: string;
    count: number;
  }>;
  cambios_por_usuario: Array<{
    usuario_id: string;
    usuario_email: string;
    usuario_nombre: string;
    count: number;
  }>;
  cambios_por_periodo: Array<{
    periodo: string;
    count: number;
  }>;
  actividades_recientes: Array<{
    fecha: string;
    count: number;
  }>;
}

export interface BulkAuditOperation {
  ids: string[];
  action: 'export' | 'delete' | 'annotate';
  annotation?: string;
  export_format?: 'csv' | 'json' | 'pdf';
}

/**
 * Servicio avanzado de auditoría para cambios de roles
 * Provee consultas complejas, estadísticas y análisis de tendencias
 */
export class AuditService {
  /**
   * Obtiene logs de auditoría con filtros avanzados
   * @param filter Filtros de búsqueda
   * @returns Promise<{ logs: AuditLogEntry[]; total: number; paginacion: any }>
   */
  async getAuditLogs(filter: AuditLogFilter = {}): Promise<{
    logs: AuditLogEntry[];
    total: number;
    paginacion: {
      pagina: number;
      limite: number;
      total_registros: number;
      total_paginas: number;
    };
  }> {
    try {
      const supabase = await createClient();

      // Construir consulta base
      let query = supabase
        .from('auditoria_cambios_rol')
        .select(`
          id,
          usuario_id,
          rol_anterior,
          rol_nuevo,
          timestamp,
          realizado_por,
          ip_address,
          user_agent,
          razon,
          request_metadata,
          profiles!auditoria_cambios_rol_usuario_id_fkey(email, full_name) as usuario_info,
          profiles!auditoria_cambios_rol_realizado_por_fkey(email, full_name) as realizado_por_info
        `, { count: 'exact' })
        .order('timestamp', { ascending: false });

      // Aplicar filtros
      if (filter.usuario_id) {
        query = query.eq('usuario_id', filter.usuario_id);
      }

      if (filter.rol_anterior) {
        query = query.eq('rol_anterior', filter.rol_anterior);
      }

      if (filter.rol_nuevo) {
        query = query.eq('rol_nuevo', filter.rol_nuevo);
      }

      if (filter.realizado_por) {
        query = query.eq('realizado_por', filter.realizado_por);
      }

      if (filter.razon) {
        query = query.ilike('razon', `%${filter.razon}%`);
      }

      if (filter.desde) {
        query = query.gte('timestamp', filter.desde);
      }

      if (filter.hasta) {
        query = query.lte('timestamp', filter.hasta);
      }

      // Aplicar paginación
      const limite = filter.limite || 100;
      const pagina = filter.pagina || 1;
      const offset = (pagina - 1) * limite;

      query = query.range(offset, offset + limite - 1);

      // Ejecutar consulta
      const { data: logs, error, count } = await query;

      if (error) {
        console.error('Error al obtener logs de auditoría:', error);
        throw new Error(`Error al obtener logs: ${error.message}`);
      }

      // Formatear logs
      const formattedLogs = logs?.map(log => ({
        id: log.id,
        usuario_id: log.usuario_id,
        usuario_email: log.usuario_info?.email || '',
        usuario_nombre: log.usuario_info?.full_name || '',
        rol_anterior: log.rol_anterior,
        rol_nuevo: log.rol_nuevo,
        realizado_por: log.realizado_por,
        realizado_por_email: log.realizado_por_info?.email || '',
        realizado_por_nombre: log.realizado_por_info?.full_name || '',
        timestamp: log.timestamp,
        razon: log.razon,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        request_metadata: log.request_metadata
      })) || [];

      return {
        logs: formattedLogs,
        total: count || 0,
        paginacion: {
          pagina,
          limite,
          total_registros: count || 0,
          total_paginas: Math.ceil((count || 0) / limite)
        }
      };

    } catch (error) {
      console.error('Error en getAuditLogs:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas detalladas de auditoría
   * @param userId ID del usuario actual (para filtrar si no es superadmin)
   * @returns Promise<AuditStatistics>
   */
  async getAuditStatistics(userId?: string): Promise<AuditStatistics> {
    try {
      const supabase = await createClient();

      let baseQuery = supabase.from('auditoria_cambios_rol');

      // Si no es superadmin, filtrar solo por sus actividades
      if (userId && !(await permissionService.verificarPermiso(userId, 'audit', 'read'))) {
        baseQuery = baseQuery.or(`usuario_id.eq.${userId},realizado_por.eq.${userId}`);
      }

      // Obtener estadísticas básicas
      const [{ data: totalCambios }, { data: cambiosPorRol }, { data: cambiosPorUsuario }, { data: actividadesRecientes }] = await Promise.all([
        baseQuery.select('count', { count: 'exact', head: true }),
        baseQuery.select('rol_anterior, rol_nuevo, count(*)').group('rol_anterior, rol_nuevo'),
        baseQuery
          .select(`
            usuario_id,
            profiles!auditoria_cambios_rol_usuario_id_fkey(email, full_name)
          `)
          .group('usuario_id')
          .select(`
            usuario_id,
            profiles!auditoria_cambios_rol_usuario_id_fkey(email, full_name),
            count
          `),
        baseQuery
          .select('timestamp')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 30 días
          .select('timestamp', { count: 'exact' })
      ]);

      // Obtener cambios por período (últimos 7 días)
      const { data: cambiosPorPeriodo } = await supabase
        .from('auditoria_cambios_rol')
        .select('timestamp')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Agrupar por día
      const cambiosPorDia = cambiosPorPeriodo?.reduce((acc, log) => {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Formatear estadísticas
      return {
        total_cambios: totalCambios.count || 0,
        cambios_por_rol: cambiosPorRol || [],
        cambios_por_usuario: cambiosPorUsuario?.map((item: any) => ({
          usuario_id: item.usuario_id,
          usuario_email: item.profiles?.email || '',
          usuario_nombre: item.profiles?.full_name || '',
          count: item.count || 0
        })) || [],
        cambios_por_periodo: Object.entries(cambiosPorDia).map(([fecha, count]) => ({
          fecha,
          count
        })).sort((a, b) => a.fecha.localeCompare(b.fecha)) || [],
        actividades_recientes: actividadesRecientes ? [
          { fecha: 'hoy', count: actividadesRecientes.count },
          { fecha: 'últimos_7_días', count: (cambiosPorPeriodo?.length || 0) },
          { fecha: 'últimos_30_días', count: (await baseQuery.select('id', { count: 'exact' })).count || 0 }
        ] : []
      };

    } catch (error) {
      console.error('Error al obtener estadísticas de auditoría:', error);
      throw error;
    }
  }

  /**
   * Busca logs de auditoría con criterios complejos
   * @param searchTerm Término de búsqueda
   * @param filters Filtros adicionales
   * @returns Promise<AuditLogEntry[]>
   */
  async searchAuditLogs(searchTerm: string, filters: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
    try {
      const supabase = await createClient();

      // Búsqueda en múltiples campos
      const searchQuery = supabase
        .from('auditoria_cambios_rol')
        .select(`
          id,
          usuario_id,
          rol_anterior,
          rol_nuevo,
          timestamp,
          realizado_por,
          ip_address,
          user_agent,
          razon,
          request_metadata,
          profiles!auditoria_cambios_rol_usuario_id_fkey(email, full_name) as usuario_info,
          profiles!auditoria_cambios_rol_realizado_por_fkey(email, full_name) as realizado_por_info
        `)
        .or(`usuario_info.ilike.%${searchTerm}%,realizado_por_info.ilike.%${searchTerm}%,razon.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%`);

      // Aplicar filtros adicionales
      if (filters.desde) searchQuery.gte('timestamp', filters.desde);
      if (filters.hasta) searchQuery.lte('timestamp', filters.hasta);
      if (filters.limite) searchQuery.limit(filters.limite);

      const { data, error } = await searchQuery.order('timestamp', { ascending: false });

      if (error) {
        console.error('Error en búsqueda de logs:', error);
        throw error;
      }

      return data?.map(log => ({
        id: log.id,
        usuario_id: log.usuario_id,
        usuario_email: log.usuario_info?.email || '',
        usuario_nombre: log.usuario_info?.full_name || '',
        rol_anterior: log.rol_anterior,
        rol_nuevo: log.rol_nuevo,
        realizado_por: log.realizado_por,
        realizado_por_email: log.realizado_por_info?.email || '',
        realizado_por_nombre: log.realizado_por_info?.full_name || '',
        timestamp: log.timestamp,
        razon: log.razon,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        request_metadata: log.request_metadata
      })) || [];

    } catch (error) {
      console.error('Error en searchAuditLogs:', error);
      throw error;
    }
  }

  /**
   * Agrega un registro manual de auditoría
   * @param auditData Datos del registro de auditoría
   * @returns Promise<AuditLogEntry>
   */
  async addAuditLog(auditData: {
    usuario_id: string;
    rol_anterior?: string | null;
    rol_nuevo: string;
    realizado_por: string;
    razon: string;
    ip_address?: string | null;
    user_agent?: string | null;
    request_metadata?: Record<string, any>;
  }): Promise<AuditLogEntry> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('auditoria_cambios_rol')
        .insert({
          usuario_id: auditData.usuario_id,
          rol_anterior: auditData.rol_anterior,
          rol_nuevo: auditData.rol_nuevo,
          realizado_por: auditData.realizado_por,
          razon: auditData.razon,
          ip_address: auditData.ip_address,
          user_agent: auditData.user_agent,
          request_metadata: auditData.request_metadata || {}
        })
        .select(`
          id,
          usuario_id,
          rol_anterior,
          rol_nuevo,
          timestamp,
          realizado_por,
          ip_address,
          user_agent,
          razon,
          request_metadata,
          profiles!auditoria_cambios_rol_usuario_id_fkey(email, full_name) as usuario_info,
          profiles!auditoria_cambios_rol_realizado_por_fkey(email, full_name) as realizado_por_info
        `)
        .single();

      if (error) {
        console.error('Error al agregar log de auditoría:', error);
        throw new Error(`Error al agregar log: ${error.message}`);
      }

      return {
        id: data.id,
        usuario_id: data.usuario_id,
        usuario_email: data.usuario_info?.email || '',
        usuario_nombre: data.usuario_info?.full_name || '',
        rol_anterior: data.rol_anterior,
        rol_nuevo: data.rol_nuevo,
        realizado_por: data.realizado_por,
        realizado_por_email: data.realizado_por_info?.email || '',
        realizado_por_nombre: data.realizado_por_info?.full_name || '',
        timestamp: data.timestamp,
        razon: data.razon,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        request_metadata: data.request_metadata
      };

    } catch (error) {
      console.error('Error en addAuditLog:', error);
      throw error;
    }
  }

  /**
   * Obtiene detalle de un registro específico
   * @param logId ID del registro de auditoría
   * @returns Promise<AuditLogEntry | null>
   */
  async getAuditLogDetail(logId: string): Promise<AuditLogEntry | null> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('auditoria_cambios_rol')
        .select(`
          id,
          usuario_id,
          rol_anterior,
          rol_nuevo,
          timestamp,
          realizado_por,
          ip_address,
          user_agent,
          razon,
          request_metadata,
          profiles!auditoria_cambios_rol_usuario_id_fkey(email, full_name) as usuario_info,
          profiles!auditoria_cambios_rol_realizado_por_fkey(email, full_name) as realizado_por_info
        `)
        .eq('id', logId)
        .single();

      if (error) {
        console.error('Error al obtener detalle de log:', error);
        return null;
      }

      return {
        id: data.id,
        usuario_id: data.usuario_id,
        usuario_email: data.usuario_info?.email || '',
        usuario_nombre: data.usuario_info?.full_name || '',
        rol_anterior: data.rol_anterior,
        rol_nuevo: data.rol_nuevo,
        realizado_por: data.realizado_por,
        realizado_por_email: data.realizado_por_info?.email || '',
        realizado_por_nombre: data.realizado_por_info?.full_name || '',
        timestamp: data.timestamp,
        razon: data.razon,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        request_metadata: data.request_metadata
      };

    } catch (error) {
      console.error('Error en getAuditLogDetail:', error);
      return null;
    }
  }

  /**
   * Exporta logs de auditoría en formato especificado
   * @param filter Filtros de exportación
   * @param formato Formato de exportación
   * @returns Promise<string> Contenido exportado
   */
  async exportAuditLogs(filter: AuditLogFilter, formato: 'csv' | 'json' = 'csv'): Promise<string> {
    try {
      const { logs } = await this.getAuditLogs({ ...filter, limite: 10000 }); // Límite alto para exportación

      switch (formato) {
        case 'csv':
          return this.exportToCSV(logs);
        case 'json':
          return JSON.stringify(logs, null, 2);
        default:
          throw new Error('Formato no soportado');
      }

    } catch (error) {
      console.error('Error en exportAuditLogs:', error);
      throw error;
    }
  }

  /**
   * Convierte logs a formato CSV
   * @param logs Logs de auditoría
   * @returns string CSV formateado
   */
  private exportToCSV(logs: AuditLogEntry[]): string {
    const headers = [
      'ID',
      'Usuario ID',
      'Usuario Email',
      'Usuario Nombre',
      'Rol Anterior',
      'Rol Nuevo',
      'Realizado Por',
      'Realizado Por Email',
      'Realizado Por Nombre',
      'Timestamp',
      'Razón',
      'IP Address',
      'User Agent',
      'Request Metadata'
    ];

    const rows = logs.map(log => [
      log.id,
      log.usuario_id,
      log.usuario_email,
      log.usuario_nombre,
      log.rol_anterior || '',
      log.rol_nuevo,
      log.realizado_por,
      log.realizado_por_email,
      log.realizado_por_nombre,
      log.timestamp,
      log.razon,
      log.ip_address || '',
      log.user_agent || '',
      JSON.stringify(log.request_metadata).replace(/"/g, '""')
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Obtend resumen de actividades para dashboard
   * @param userId ID del usuario actual
   * @returns Promise<any> Resumen de actividades
   */
  async getActivityDashboard(userId?: string): Promise<any> {
    try {
      const [estadisticas, logsRecientes] = await Promise.all([
        this.getAuditStatistics(userId),
        this.getAuditLogs({ limite: 5 })
      ]);

      return {
        summary: {
          total_cambios: estadisticas.total_cambios,
          cambios_hoy: estadisticas.actividades_recientes[0]?.count || 0,
          cambios_semana: estadisticas.actividades_recientes[1]?.count || 0
        },
        top_users: estadisticas.cambios_por_usuario.slice(0, 5),
        top_changes: estadisticas.cambios_por_rol.slice(0, 5),
        recent_activities: logsRecientes.logs
      };

    } catch (error) {
      console.error('Error en getActivityDashboard:', error);
      throw error;
    }
  }
}

// Instancia global para uso en toda la aplicación
export const auditService = new AuditService();