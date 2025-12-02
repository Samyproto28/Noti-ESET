'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'

interface RegisterFormProps {
  redirectTo?: string
  className?: string
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  redirectTo = '/',
  className
}) => {
  const router = useRouter()
  const { signUp, loading, error } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    agreeToTerms: false,
    privacyPolicy: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [registerSuccess, setRegisterSuccess] = useState(false)

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

  const validatePassword = (password: string) => {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[^A-Za-z0-9]/.test(password)
  }

  const passwordsMatch = formData.password === formData.confirmPassword
  const isPasswordStrong = validatePassword(formData.password)

  const isFormValid = () => {
    return formData.email &&
           formData.password &&
           formData.confirmPassword &&
           formData.name &&
           formData.agreeToTerms &&
           formData.privacyPolicy &&
           isEmailValid &&
           passwordsMatch &&
           isPasswordStrong
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación final
    if (!isFormValid()) {
      setRegisterError('Por favor, completa todos los campos correctamente')
      return
    }

    setIsLoading(true)
    setRegisterError(null)

    try {
      const { error } = await signUp(formData.email, formData.password, formData.name)

      if (error) {
        setRegisterError(error.message || 'Error al registrarse')
        return
      }

      setRegisterSuccess(true)

      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push(redirectTo)
      }, 2000)

    } catch (err) {
      setRegisterError('Error inesperado. Por favor intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={`${className} max-w-md mx-auto`}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Crear Cuenta
        </CardTitle>
        <CardDescription className="text-center">
          Regístrate con tu correo institucional ESET
        </CardDescription>
      </CardHeader>

      <CardContent>
        {registerSuccess ? (
          <Alert className="mb-4 border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">
              ¡Registro exitoso! Se ha enviado un correo de confirmación a tu dirección institucional.
              Serás redirigido en breve...
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Alerta de requisitos */}
            <Alert className="mb-4 border-blue-500 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700 text-sm">
                <strong>Requisitos de la cuenta:</strong><br/>
                • Correo institucional @eset.edu.ar<br/>
                • Contraseña mínima 8 caracteres con mayúscula, minúscula, número y símbolo
              </AlertDescription>
            </Alert>

            {/* Alerta de error */}
            {(registerError || error) && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {registerError || error}
                </AlertDescription>
              </Alert>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Juan Pérez"
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

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
                {formData.password && (
                  <div className="text-xs space-y-1">
                    <div className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-red-500'}`} />
                      Mínimo 8 caracteres
                    </div>
                    <div className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-red-500'}`} />
                      Al menos una mayúscula (A-Z)
                    </div>
                    <div className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-red-500'}`} />
                      Al menos una minúscula (a-z)
                    </div>
                    <div className={`flex items-center ${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${/[0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-red-500'}`} />
                      Al menos un número (0-9)
                    </div>
                    <div className={`flex items-center ${/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${/[^A-Za-z0-9]/.test(formData.password) ? 'bg-green-500' : 'bg-red-500'}`} />
                      Al menos un símbolo (!@#$% etc.)
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-red-600">
                    Las contraseñas no coinciden
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start">
                  <input
                    id="agreeToTerms"
                    name="agreeToTerms"
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-eset-red focus:ring-eset-red border-gray-300 rounded"
                    required
                    disabled={isLoading}
                  />
                  <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-700">
                    Acepto los{' '}
                    <Link href="/terms" className="text-eset-red hover:text-red-700">
                      Términos y Condiciones
                    </Link>
                  </label>
                </div>

                <div className="flex items-start">
                  <input
                    id="privacyPolicy"
                    name="privacyPolicy"
                    type="checkbox"
                    checked={formData.privacyPolicy}
                    onChange={handleInputChange}
                    className="mt-1 h-4 w-4 text-eset-red focus:ring-eset-red border-gray-300 rounded"
                    required
                    disabled={isLoading}
                  />
                  <label htmlFor="privacyPolicy" className="ml-2 text-sm text-gray-700">
                    Acepto la{' '}
                    <Link href="/privacy" className="text-eset-red hover:text-red-700">
                      Política de Privacidad
                    </Link>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-eset-red hover:bg-red-700"
                disabled={isLoading || !isFormValid()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear Cuenta Institucional'
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>

      <CardFooter className="text-center">
        <p className="text-sm text-gray-600">
          ¿Ya tienes una cuenta?{' '}
          <Link
            href="/login"
            className="font-medium text-eset-red hover:text-red-700"
          >
            Inicia Sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}