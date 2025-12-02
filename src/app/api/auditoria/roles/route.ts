import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { z } from 'zod';
import { permissionService } from '@/lib/permissions';

// Esquema de validación para filtros
const auditFiltersSchema = z.object({
  usuario_id: z.string().uuid().optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
  limite: z.number().int().min(1).max(1000).default(100),
  pagina: z.number().int().min(1).default(1)
});

/**
 * GET /api/auditoria/roles
 * Obtiene el historial de cambios de roles con filtros opcionales
 * Requiere: audit.read (Admin+)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user } = await supabase.auth.getUser();

    // Verificar autenticación
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permiso de lectura de auditoría (solo Admin y Superadmin)
    const tienePermiso = await permissionService.verificarPermiso(
      user.id,
      'audit',
      'read'
    );

    if (!tienePermiso) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Admin puede ver auditoría' },
        { status: 403 }
      );
    }

    // Obtener parámetros de filtrado
    const { searchParams } = new URL(req.url);
    const filters = auditFiltersSchema.parse({
      usuario_id: searchParams.get('usuario_id'),
      desde: searchParams.get('desde'),
      hasta: searchParams.get('hasta'),
      limite: searchParams.get('limite'),
      pagina: searchParams.get('pagina')
    });

    // Construir consulta base
    let query = supabase
      .from('auditoria_cambios_rol')
      .select(`
        id,
        usuario_id,
        profiles!auditoria_cambios_rol_usuario_id_fkey(email, full_name),
        rol_anterior,
        rol_nuevo,
        timestamp,
        realizado_por,
        profiles!auditoria_cambios_rol_realizado_por_fkey(email, full_name) as realizado_por_email,
        ip_address,
        user_agent,
        razon,
        request_metadata
      `, { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(
        (filters.pagina - 1) * filters.limite,
        filters.pagina * filters.limite - 1
      );

    // Aplicar filtros opcionales
    if (filters.usuario_id) {
      query = query.eq('usuario_id', filters.usuario_id);
    }

    if (filters.desde) {
      query = query.gte('timestamp', filters.desde);
    }

    if (filters.hasta) {
      query = query.lte('timestamp', filters.hasta);
    }

    // Ejecutar consulta
    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error al obtener logs de auditoría:', error);
      return NextResponse.json(
        { error: 'Error al obtener logs de auditoría' },
        { status: 500 }
      );
    }

    // Formatear respuesta para mejor legibilidad
    const formattedLogs = logs?.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      usuario: {
        id: log.usuario_id,
        email: log.profiles?.email,
        full_name: log.profiles?.full_name
      },
      cambios: {
        rol_anterior: log.rol_anterior,
        rol_nuevo: log.rol_nuevo
      },
      realizado_por: {
        id: log.realizado_por,
        email: log.realizado_por_email,
        full_name: log.realizado_por_email
      },
      metadata: {
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        razon: log.razon,
        request_metadata: log.request_metadata
      }
    })) || [];

    // Obtener estadísticas básicas
    const { data: stats } = await supabase
      .from('auditoria_cambios_rol')
      .select('rol_anterior, rol_nuevo, count(*)', { count: 'exact' })
      .eq('realizado_por', user.id)
      .group('rol_anterior, rol_nuevo');

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        paginacion: {
          pagina: filters.pagina,
          limite: filters.limite,
          total_registros: count || 0,
          total_paginas: Math.ceil((count || 0) / filters.limite)
        },
        filtros_aplicados: {
          usuario_id: filters.usuario_id,
          desde: filters.desde,
          hasta: filters.hasta
        },
        estadisticas: {
          total_cambios: count || 0,
          cambios_por_rol: stats || []
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Parámetros inválidos',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error en GET /api/auditoria/roles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auditoria/roles
 * Agrega un registro manual de auditoría (para uso interno)
 * Requiere: audit.manage (Superadmin)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user } = await supabase.auth.getUser();

    // Verificar autenticación
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permiso de gestión de auditoría (solo Superadmin)
    const tienePermiso = await permissionService.verificarPermiso(
      user.id,
      'audit',
      'manage'
    );

    if (!tienePermiso) {
      return NextResponse.json(
        { error: 'Permiso insuficiente: Solo Superadmin puede agregar registros de auditoría' },
        { status: 403 }
      );
    }

    // Obtener datos de la request
    const body = await req.json();
    const {
      usuario_id,
      rol_anterior,
      rol_nuevo,
      razon,
      ip_address,
      user_agent,
      request_metadata
    } = body;

    // Validar datos requeridos
    if (!usuario_id || !rol_nuevo || !razon) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: usuario_id, rol_nuevo, razon' },
        { status: 400 }
      );
    }

    // Insertar registro de auditoría
    const { data: newLog, error } = await supabase
      .from('auditoria_cambios_rol')
      .insert({
        usuario_id,
        rol_anterior,
        rol_nuevo,
        realizado_por: user.id,
        razon,
        ip_address,
        user_agent,
        request_metadata: request_metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error al agregar log de auditoría:', error);
      return NextResponse.json(
        { error: 'Error al agregar registro de auditoría' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newLog,
      message: 'Registro de auditoría agregado exitosamente'
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST /api/auditoria/roles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}