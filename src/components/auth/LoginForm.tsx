'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

interface LoginFormProps {
  onSuccess?: () => void
}

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message || 'Error al iniciar sesión')
      } else {
        onSuccess?.()
      }
    } catch (err) {
      setError('Error inesperado. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const validateEmail = (email: string) => {
    // Only allow @eset.edu.ar emails for institutional access
    const re = /^[^\s@]+@eset\.edu\.ar$/
    return re.test(email)
  }

  const isEmailValid = validateEmail(email)

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Iniciar Sesión
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Institucional
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              email && !isEmailValid
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
            placeholder="tu.email@eset.edu.ar"
            disabled={loading}
          />
          {email && !isEmailValid && (
            <p className="mt-1 text-sm text-red-600">
              Solo se permiten correos institucionales (@eset.edu.ar)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="••••••••"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password || !isEmailValid}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed disabled:hover:bg-blue-300"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span>Iniciando sesión...</span>
            </div>
          ) : (
            'Iniciar Sesión'
          )}
        </button>
      </form>
    </div>
  )
}