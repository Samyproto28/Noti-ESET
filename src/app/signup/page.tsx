'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuthPage, AuthMode } from '@/components/auth/AuthPage'
import { useAuth } from '@/hooks/useAuth'

export default function SignupPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // Check if user is already authenticated
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleAuthSuccess = () => {
    // Redirect to login after successful signup (user needs to verify email)
    router.push('/login?success=signup')
  }

  return (
    <AuthPage
      mode="signup"
      onSuccess={handleAuthSuccess}
    />
  )
}