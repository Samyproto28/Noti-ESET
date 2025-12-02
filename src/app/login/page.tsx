'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const error = searchParams.get('error')
  const reset = searchParams.get('reset')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error === 'session_invalid' && 'Tu sesión ha expirado o no es válida. Por favor, inicia sesión de nuevo.'}
              {error === 'middleware_error' && 'Ha ocurrido un error al verificar tu sesión. Por favor, intenta de nuevo.'}
              {error === 'access_denied' && 'No tienes permiso para acceder a este recurso.'}
              {error === 'unauthorized' && 'No estás autorizado para acceder a esta página.'}
            </AlertDescription>
          </Alert>
        )}

        {reset && (
          <Alert className="border-green-500 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
            </AlertDescription>
          </Alert>
        )}

        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  )
}