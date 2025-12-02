'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthPage, AuthMode } from '@/components/auth/AuthPage'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const { user } = useAuth()

  useEffect(() => {
    // Check if user is already authenticated
    if (user) {
      router.push('/dashboard')
    }

    // Set mode from URL parameter if provided
    const signupParam = searchParams.get('signup')
    if (signupParam === 'true') {
      setMode('signup')
    }
  }, [user, router, searchParams])

  const handleAuthSuccess = () => {
    // Redirect to dashboard after successful auth
    router.push('/dashboard')
  }

  return (
    <AuthPage
      mode={mode}
      onSuccess={handleAuthSuccess}
    />
  )
}