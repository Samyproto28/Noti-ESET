'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'student' | 'teacher' | 'admin'
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login')
      } else if (requiredRole) {
        // Check if user has required role
        const userRole = user.user_metadata?.role || 'student'
        if (userRole !== requiredRole) {
          router.push('/unauthorized')
        }
      }
    }
  }, [user, loading, router, requiredRole])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  if (requiredRole) {
    const userRole = user.user_metadata?.role || 'student'
    if (userRole !== requiredRole) {
      return null // Will redirect to unauthorized
    }
  }

  return <>{children}</>
}