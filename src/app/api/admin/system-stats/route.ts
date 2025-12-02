import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (service role para acceso completo)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  return NextResponse.json(
    { error: 'Server configuration error' },
    { status: 500 }
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Obtener estadísticas del sistema
    const [
      { data: users, error: usersError },
      { data: news, error: newsError },
      { data: sessions, error: sessionsError }
    ] = await Promise.all([
      supabase.from('users').select('id, status, created_at'),
      supabase.from('news').select('id, is_published, created_at'),
      supabase.from('auth.sessions').select('created_at', { count: 'exact', head: true })
    ]);

    if (usersError || newsError || sessionsError) {
      throw new Error('Error al cargar estadísticas');
    }

    // Calcular estadísticas
    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter(u => u.status === 'active').length || 0;
    const totalNews = news?.length || 0;
    const publishedNews = news?.filter(n => n.is_published === true).length || 0;

    // Simular uptime y última fecha de respaldo
    const systemUptime = '15d 8h 32m';
    const lastBackup = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Contar alertas de seguridad (simulado)
    const securityAlerts = Math.floor(Math.random() * 5);

    return NextResponse.json({
      total_users: totalUsers,
      active_users: activeUsers,
      total_news: totalNews,
      published_news: publishedNews,
      system_uptime: systemUptime,
      last_backup: lastBackup,
      security_alerts: securityAlerts
    });

  } catch (error) {
    console.error('Error en system-stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}