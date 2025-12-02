import { NextRequest, NextResponse } from 'next/server';

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    // Simular alertas del sistema
    const alerts: SystemAlert[] = [
      {
        id: '1',
        type: 'info',
        title: 'Sistema Operativo',
        message: 'Todos los servicios del sistema están funcionando correctamente.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        id: '2',
        type: 'warning',
        title: 'Actualización Disponible',
        message: 'Hay una nueva versión del sistema disponible (v2.1.1).',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: '3',
        type: 'success',
        title: 'Respaldo Completado',
        message: 'El respaldo automático del sistema se ha completado exitosamente.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        id: '4',
        type: 'error',
        title: 'Alerta de Seguridad',
        message: 'Se detectó un intento de acceso no autorizado desde IP 192.168.1.100.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
      }
    ];

    // Ordenar alertas por timestamp (más reciente primero)
    const sortedAlerts = alerts.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(sortedAlerts);

  } catch (error) {
    console.error('Error en system-alerts API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}