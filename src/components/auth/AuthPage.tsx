'use client'

import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignUpForm } from './SignUpForm'

export type AuthMode = 'login' | 'signup'

interface AuthPageProps {
  mode?: AuthMode
  onSuccess?: () => void
}

export const AuthPage = ({ mode = 'login', onSuccess }: AuthPageProps) => {
  const [authMode, setAuthMode] = useState<AuthMode>(mode)

  const switchMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login')
  }

  const handleAuthSuccess = () => {
    onSuccess?.()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ESET Notificaciones
          </h1>
          <p className="text-gray-600">
            Sistema de notificaciones institucional
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setAuthMode('login')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                authMode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {authMode === 'login' ? (
            <LoginForm onSuccess={handleAuthSuccess} />
          ) : (
            <SignUpForm onSuccess={handleAuthSuccess} />
          )}
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center text-sm text-gray-600">
          {authMode === 'login' ? (
            <p>
              ¿No tienes cuenta?{' '}
              <button
                onClick={switchMode}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Regístrate aquí
              </button>
            </p>
          ) : (
            <p>
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={switchMode}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Inicia sesión aquí
              </button>
            </p>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            Esta plataforma es exclusiva para el uso institucional de ESET.
            Solo se permiten correos del dominio @eset.edu.ar
          </p>
        </div>
      </div>
    </div>
  )
}