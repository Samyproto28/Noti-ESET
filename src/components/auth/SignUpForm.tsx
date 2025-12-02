'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface SignUpFormProps {
  onSuccess?: () => void
}

export const SignUpForm = ({ onSuccess }: SignUpFormProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'student' as 'student' | 'teacher'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signUp } = useAuth()

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@eset\.edu\.ar$/
    return re.test(email)
  }

  const validatePassword = (password: string) => {
    // Minimum 8 characters, at least one letter and one number
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/
    return re.test(password)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!validateEmail(formData.email)) {
      setError('Solo se permiten correos institucionales (@eset.edu.ar)')
      setLoading(false)
      return
    }

    if (!validatePassword(formData.password)) {
      setError('La contraseña debe tener al menos 8 caracteres con letras y números')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        role: formData.role
      })
      if (error) {
        setError(error.message || 'Error al crear la cuenta')
      } else {
        // Success - user will need to verify their email
        onSuccess?.()
      }
    } catch (err) {
      setError('Error inesperado. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const isEmailValid = validateEmail(formData.email)
  const isPasswordValid = validatePassword(formData.password)
  const passwordsMatch = formData.password === formData.confirmPassword

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Crear Cuenta
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Completo
          </label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Juan Pérez"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Institucional
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              formData.email && !isEmailValid
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
            placeholder="tu.email@eset.edu.ar"
            disabled={loading}
          />
          {formData.email && !isEmailValid && (
            <p className="mt-1 text-sm text-red-600">
              Solo se permiten correos institucionales (@eset.edu.ar)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Rol
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="student">Estudiante</option>
            <option value="teacher">Profesor</option>
          </select>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              formData.password && !isPasswordValid
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
            placeholder="••••••••"
            disabled={loading}
          />
          {formData.password && !isPasswordValid && (
            <p className="mt-1 text-sm text-red-600">
              Mínimo 8 caracteres con letras y números
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar Contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              formData.confirmPassword && !passwordsMatch
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
            placeholder="••••••••"
            disabled={loading}
          />
          {formData.confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-sm text-red-600">
              Las contraseñas no coinciden
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            !formData.email ||
            !formData.password ||
            !formData.confirmPassword ||
            !formData.fullName ||
            !isEmailValid ||
            !isPasswordValid ||
            !passwordsMatch
          }
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed disabled:hover:bg-blue-300"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span>Creando cuenta...</span>
            </div>
          ) : (
            'Crear Cuenta'
          )}
        </button>
      </form>
    </div>
  )
}