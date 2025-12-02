'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export const AuthNavigation = () => {
  const { user, loading, signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  if (!user) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                ESET Notificaciones
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              ESET Notificaciones
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {user.user_metadata?.role === 'student' && 'Estudiante'}
                  {user.user_metadata?.role === 'teacher' && 'Profesor'}
                  {user.user_metadata?.role === 'admin' && 'Administrador'}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user.user_metadata?.full_name || user.email).charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              {user.user_metadata?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Admin
                </Link>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                  <span>Cerrando...</span>
                </div>
              ) : (
                'Cerrar Sesión'
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}