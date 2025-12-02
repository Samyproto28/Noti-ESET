'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, auth } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any, error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any, error: any }>
  signOut: () => Promise<{ error: any }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ data: any, error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (newPassword: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for active session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setUser(session?.user ?? null)
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    signUp: auth.signUp,
    signIn: auth.signIn,
    signOut: auth.signOut,
    signInWithOAuth: auth.signInWithOAuth,
    resetPassword: auth.resetPassword,
    updatePassword: auth.updatePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}