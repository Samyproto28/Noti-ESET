import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Configuración del cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Falta la configuración de Supabase. Verifica las variables de entorno.')
}

// Cliente para uso en componentes (publico)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Cliente con rol de servicio (para operaciones administrativas)
export const supabaseService = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  {
    auth: {
      persistSession: false, // No persistir sesión para operaciones de servicio
      autoRefreshToken: false,
    },
  }
)

// Tipos personalizados para autenticación
export type User = {
  id: string
  email: string
  name?: string
  role: 'user' | 'editor' | 'admin' | 'super_admin'
  avatar?: string
  created_at: string
  updated_at: string
}

export type AuthSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}

// Funciones de autenticación
export const auth = {
  // Registrar nuevo usuario
  signUp: async (email: string, password: string, name?: string) => {
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
    return { data, error }
  },

  // Iniciar sesión
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Iniciar sesión con OAuth
  signInWithOAuth: async (provider: 'google' | 'github') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  // Cerrar sesión
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Obtener usuario actual
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Obtener sesión actual
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Escuchar cambios de estado de autenticación
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Actualizar perfil de usuario
  updateProfile: async (updates: { name?: string; avatar?: string }) => {
    const { error } = await supabase.auth.updateUser(updates)
    return { error }
  },

  // Cambiar contraseña
  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { error }
  },

  // Restablecer contraseña
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=true`,
    })
    return { error }
  },

  // Verificar sesión con RLS
  verifySession: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return { valid: false, error }
      }

      // Verificar que el usuario existe en la tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, status')
        .eq('id', user.id)
        .single()

      if (userError || !userData || userData.status !== 'active') {
        return { valid: false, error: userError || new Error('Usuario no activo') }
      }

      return {
        valid: true,
        user: { ...user, role: userData.role }
      }
    } catch (error) {
      return { valid: false, error }
    }
  },
}

// Funciones de usuario
export const users = {
  // Obtener datos completos del usuario
  getUserData: async (userId?: string) => {
    const targetUserId = userId || (await auth.getCurrentUser()).user?.id
    if (!targetUserId) return { data: null, error: new Error('Usuario no autenticado') }

    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        avatar,
        created_at,
        updated_at,
        profile: profiles(*),
        last_login
      `)
      .eq('id', targetUserId)
      .single()

    return { data, error }
  },

  // Actualizar rol de usuario (solo para admin)
  updateUserRole: async (userId: string, role: 'user' | 'editor' | 'admin' | 'super_admin') => {
    const { data, error } = await supabaseService
      .from('users')
      .update({
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  },

  // Obtener todos los usuarios (solo para admin)
  getAllUsers: async (page = 1, limit = 20) => {
    const offset = (page - 1) * limit

    const { data, error, count } = await supabaseService
      .from('users')
      .select('id, email, name, role, status, created_at, last_login', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return { data, error, count }
  },

  // Auditoría de cambios
  getAuditLog: async (userId?: string, limit = 100) => {
    let query = supabaseService
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    return { data, error }
  },
}

// Middleware de autenticación
export const requireAuth = async (requiredRole?: User['role']) => {
  const { valid, user, error } = await auth.verifySession()

  if (!valid || !user) {
    return { authorized: false, error: error || new Error('Sesión no válida') }
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'super_admin') {
    return {
      authorized: false,
      error: new Error(`Se requiere rol ${requiredRole} o superior`)
    }
  }

  return { authorized: true, user }
}

// Hook de autenticación para componentes
export const useAuth = () => {
  return {
    supabase,
    auth,
    users,
    requireAuth,
  }
}