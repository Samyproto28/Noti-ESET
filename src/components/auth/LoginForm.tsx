'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'

interface LoginFormProps {
  redirectTo?: string
  showOAuth?: boolean
  className?: string
}

export const LoginForm: React.FC<LoginFormProps> = ({
  redirectTo = '/',
  showOAuth = false, // Deshabilitado por ahora para uso institucional
  className
}) => {
  const router = useRouter()
  const { signIn, signInWithOAuth, loading, error } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const validateEmail = (email: string) => {
    // Solo permitir correos institucionales @eset.edu.ar
    const re = /^[^\s@]+@eset\.edu\.ar$/
    return re.test(email)
  }

  const isEmailValid = validateEmail(formData.email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación básica
    if (!formData.email || !formData.password) {
      setLoginError('Por favor, completa todos los campos')
      return
    }

    if (!isEmailValid) {
      setLoginError('Solo se permiten correos institucionales (@eset.edu.ar)')
      return
    }

    if (formData.password.length < 6) {
      setLoginError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)
    setLoginError(null)

    try {
      const { error } = await signIn(formData.email, formData.password)

      if (error) {
        setLoginError(error.message || 'Error al iniciar sesión')
        return
      }

      // Redirigir al destino o página principal
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setLoginError('Error inesperado. Por favor intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await signInWithOAuth(provider)

      if (error) {
        setLoginError(error.message || 'Error con el inicio de sesión OAuth')
      }
    } catch (err) {
      setLoginError('Error inesperado con el inicio de sesión OAuth')
    }
  }

  return (
    <Card className={`${className} max-w-md mx-auto`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Iniciar Sesión
        </CardTitle>
        <CardDescription className="text-center">
          Acceso exclusivo para usuarios institucionales ESET
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Alerta de seguridad */}
        <Alert className="mb-4 border-eset-red/20 bg-eset-red/5">
          <Shield className="h-4 w-4 text-eset-red" />
          <AlertDescription className="text-sm text-eset-red/80">
            Esta es una plataforma institucional. Solo se permiten accesos con correos @eset.edu.ar
          </AlertDescription>
        </Alert>

        {/* Alerta de error */}
        {(loginError || error) && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {loginError || error}
            </AlertDescription>
          </Alert>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Institucional</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu@eset.edu.ar"
                className={`pl-10 ${formData.email && !isEmailValid ? 'border-red-500 focus:border-red-500' : ''}`}
                required
                disabled={isLoading}
              />
            </div>
            {formData.email && !isEmailValid && (
              <p className="text-sm text-red-600">
                Solo se permiten correos institucionales (@eset.edu.ar)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="pl-10 pr-10"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="h-4 w-4 text-eset-red focus:ring-eset-red border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Recordarme
              </label>
            </div>

            <Link
              href="/forgot-password"
              className="text-sm text-eset-red hover:text-red-700"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full bg-eset-red hover:bg-red-700"
            disabled={isLoading || !formData.email || !formData.password || !isEmailValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión Institucional'
            )}
          </Button>
        </form>

        {/* Opciones OAuth (deshabilitadas por ahora) */}
        {showOAuth && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">O continuar con</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthLogin('google')}
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthLogin('github')}
                disabled={isLoading}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="text-center">
        <p className="text-sm text-gray-600">
          ¿No tienes una cuenta?{' '}
          <Link
            href="/register"
            className="font-medium text-eset-red hover:text-red-700"
          >
            Regístrate
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}