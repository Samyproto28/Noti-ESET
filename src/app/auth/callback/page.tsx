'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (error) {
        console.error('Auth error:', error)
        router.push('/login?error=auth_failed')
        return
      }

      if (code) {
        try {
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error('Error exchanging code for session:', error)
            router.push('/login?error=exchange_failed')
            return
          }

          // Redirect to the intended destination
          router.push(redirectTo)
        } catch (err) {
          console.error('Unexpected error during auth callback:', err)
          router.push('/login?error=unexpected_error')
        }
      } else {
        // No code provided, redirect to login
        router.push('/login')
      }
    }

    handleAuthCallback()
  }, [code, error, redirectTo, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Procesando autenticación...
        </h2>
        <p className="text-gray-600">
          Por favor, espera mientras completamos tu inicio de sesión.
        </p>
      </div>
    </div>
  )
}