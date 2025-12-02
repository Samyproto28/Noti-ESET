'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, AuthSession } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: AuthSession | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, name?: string) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: { name?: string; avatar?: string }) => Promise<{ error: any }>
  updatePassword: (newPassword: string) => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
  hasRole: (role: User['role']) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener sesión inicial al montar
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        setLoading(true)

        // Obtener sesión actual
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        setSession(currentSession)

        // Si hay sesión, obtener usuario con datos de la tabla users
        if (currentSession) {
          const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

          if (userError) {
            throw userError
          }

          // Verificar y obtener rol de la tabla users
          if (currentUser) {
            const { data: userData, error: userDataError } = await supabase
              .from('users')
              .select('role, status')
              .eq('id', currentUser.id)
              .single()

            if (userDataError || !userData || userData.status !== 'active') {
              throw userDataError || new Error('Usuario no activo')
            }

            // Combinar datos del usuario con el rol
            const userWithRole: User = {
              ...currentUser,
              role: userData.role
            }

            setUser(userWithRole)
          }
        }
      } catch (err) {
        console.error('Error inicializando sesión:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Escuchar cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)

      if (session) {
        try {
          const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

          if (userError) {
            throw userError
          }

          if (currentUser) {
            const { data: userData, error: userDataError } = await supabase
              .from('users')
              .select('role, status')
              .eq('id', currentUser.id)
              .single()

            if (userDataError || !userData || userData.status !== 'active') {
              throw userDataError || new Error('Usuario no activo')
            }

            const userWithRole: User = {
              ...currentUser,
              role: userData.role
            }

            setUser(userWithRole)
          }
        } catch (err) {
          console.error('Error manejando cambio de estado:', err)
          setUser(null)
        }
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Funciones de autenticación
  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'user', // Rol por defecto
        },
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setError(null)
    }

    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      setError(null)
    }

    return { data, error }
  }

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setError(error.message)
    }

    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
    } else {
      setUser(null)
      setSession(null)
      setError(null)
    }

    return { error }
  }

  const updateProfile = async (updates: { name?: string; avatar?: string }) => {
    const { error } = await supabase.auth.updateUser(updates)

    if (error) {
      setError(error.message)
      return { error }
    }

    // Actualizar localmente
    if (user) {
      setUser({ ...user, ...updates })
    }

    setError(null)
    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setError(error.message)
    } else {
      setError(null)
    }

    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=true`,
    })

    if (error) {
      setError(error.message)
    } else {
      setError(null)
    }

    return { error }
  }

  const refreshUser = async () => {
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (currentUser) {
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('role, status')
          .eq('id', currentUser.id)
          .single()

        if (userDataError || !userData || userData.status !== 'active') {
          throw userDataError || new Error('Usuario no activo')
        }

        const userWithRole: User = {
          ...currentUser,
          role: userData.role
        }

        setUser(userWithRole)
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Error refrescando usuario:', err)
      setUser(null)
    }
  }

  // Helper functions
  const isAuthenticated = !!user && user.status === 'active'

  const hasRole = (requiredRole: User['role']): boolean => {
    return !!(user && (
      user.role === requiredRole ||
      user.role === 'super_admin' || // super_admin tiene acceso a todo
      (requiredRole === 'user' && user.role !== 'blocked') || // user puede acceder a user-level si no está bloqueado
      (requiredRole === 'editor' && (user.role === 'editor' || user.role === 'admin' || user.role === 'super_admin')) ||
      (requiredRole === 'admin' && (user.role === 'admin' || user.role === 'super_admin'))
    ))
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
    refreshUser,
    isAuthenticated,
    hasRole,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }

  return context
}

// Hook para proteger rutas
export const useAuthRoute = (requiredRole?: User['role']) => {
  const { user, loading, hasRole } = useAuth()

  return {
    user,
    loading,
    isAuthorized: !loading && user && (!requiredRole || hasRole(requiredRole)),
    isLoading: loading,
  }
}