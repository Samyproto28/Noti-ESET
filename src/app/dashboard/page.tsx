'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthRoute } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, LogOut, User, Shield, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const { isLoading, isAuthorized } = useAuthRoute()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si el usuario está autenticado
    if (authLoading) {
      return
    }

    if (!isAuthorized) {
      router.push('/login')
      return
    }

    setLoading(false)
  }, [isAuthorized, authLoading, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eset-red mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Esto no debería ocurrir debido al middleware
  }

  // Información del rol
  const roleInfo = {
    user: { name: 'Usuario', color: 'text-blue-600', bg: 'bg-blue-50', description: 'Acceso básico al contenido' },
    editor: { name: 'Editor', color: 'text-green-600', bg: 'bg-green-50', description: 'Puede crear y editar contenido' },
    admin: { name: 'Administrador', color: 'text-purple-600', bg: 'bg-purple-50', description: 'Gestión completa del sistema' },
    super_admin: { name: 'Super Administrador', color: 'text-red-600', bg: 'bg-red-50', description: 'Acceso total y configuración' }
  }

  const currentRole = roleInfo[user.role]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Panel de Control - ESET Noticias
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-eset-red rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{user.name || 'Usuario'}</p>
                  <p className={`text-xs ${currentRole.color}`}>{currentRole.name}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Bienvenida */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Bienvenido de vuelta, {user.name || 'Usuario'}!
            </h2>
            <p className="text-gray-600">
              Esta es tu área personal del sistema de noticias institucional ESET.
            </p>
          </div>

          {/* Información del usuario */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Información de Cuenta</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email:</span>
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Rol:</span>
                    <span className={`text-sm font-medium ${currentRole.color}`}>
                      {currentRole.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Miembro desde:</span>
                    <span className="text-sm font-medium">
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permisos</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${currentRole.bg.replace('bg-', 'bg-')}`} />
                    <span className="text-sm">{currentRole.description}</span>
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-xs text-gray-500">Acceso a:</p>
                    <ul className="text-xs space-y-1">
                      {user.role === 'user' && <li>• Contenido publicado</li>}
                      {['editor', 'admin', 'super_admin'].includes(user.role) && <li>• Crear y editar artículos</li>}
                      {['admin', 'super_admin'].includes(user.role) && <li>• Gestión de usuarios</li>}
                      {user.role === 'super_admin' && <li>• Configuración del sistema</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actividad</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Último acceso:</span>
                    <span className="text-sm font-medium">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString('es-ES')
                        : 'Primera sesión'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Estado:</span>
                    <span className="text-sm font-medium text-green-600">Activo</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acceso rápido según rol */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acceso Rápido</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Búsqueda de artículos */}
              <Button
                variant="outline"
                className="h-20 flex flex-col"
                onClick={() => router.push('/search')}
              >
                <BarChart3 className="h-6 w-6 mb-2" />
                <span className="text-sm">Buscar Artículos</span>
              </Button>

              {/* Crear nuevo artículo (solo para editor y superior) */}
              {['editor', 'admin', 'super_admin'].includes(user.role) && (
                <Button
                  variant="outline"
                  className="h-20 flex flex-col"
                  onClick={() => router.push('/create')}
                >
                  <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm">Crear Artículo</span>
                </Button>
              )}

              {/* Gestión de usuarios (solo para admin y super_admin) */}
              {['admin', 'super_admin'].includes(user.role) && (
                <Button
                  variant="outline"
                  className="h-20 flex flex-col"
                  onClick={() => router.push('/admin/users')}
                >
                  <User className="h-6 w-6 mb-2" />
                  <span className="text-sm">Gestionar Usuarios</span>
                </Button>
              )}

              {/* Configuración (solo para super_admin) */}
              {user.role === 'super_admin' && (
                <Button
                  variant="outline"
                  className="h-20 flex flex-col"
                  onClick={() => router.push('/admin/settings')}
                >
                  <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">Configuración</span>
                </Button>
              )}
            </div>
          </div>

          {/* Alerta de seguridad */}
          <Alert className="border-eset-red/20 bg-eset-red/5">
            <AlertCircle className="h-4 w-4 text-eset-red" />
            <AlertDescription className="text-eset-red/80 text-sm">
              Esta es una plataforma institucional. Tu actividad es monitoreada y registrada
              con fines de seguridad y auditoría.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </div>
  )
}