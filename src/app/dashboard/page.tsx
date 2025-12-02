'use client'

import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) {
    return <ProtectedRoute />
  }

  const userName = user.user_metadata?.full_name || user.email
  const userRole = user.user_metadata?.role || 'student'

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Bienvenido de vuelta, {userName}!
            </p>
          </div>

          {/* User Role Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Rol
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {userRole === 'student' && 'Estudiante'}
                  {userRole === 'teacher' && 'Profesor'}
                  {userRole === 'admin' && 'Administrador'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-gray-900">
                  {user.email}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ✓ Verificado
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>
                  Gestiona tus notificaciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-4">
                  Visualiza y administra tus notificaciones institucionales
                </div>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  Ver Notificaciones
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cursos</CardTitle>
                <CardDescription>
                  Accede a tus cursos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-4">
                  Visualiza tus cursos matriculados
                </div>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                  Mis Cursos
                </button>
              </CardContent>
            </Card>

            {userRole === 'teacher' && (
              <Card>
                <CardHeader>
                  <CardTitle>Administrar</CardTitle>
                  <CardDescription>
                    Gestiona tus cursos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 mb-4">
                    Crea y administra tus cursos
                  </div>
                  <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors">
                    Administrar Cursos
                  </button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Admin Section */}
          {userRole === 'admin' && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Panel de Administración</CardTitle>
                  <CardDescription>
                    Herramientas de administración del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors">
                      Gestión de Usuarios
                    </button>
                    <button className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors">
                      Configuración del Sistema
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}