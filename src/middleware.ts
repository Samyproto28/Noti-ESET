import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { requireAuth } from '@/lib/supabase'

// Rutas que requieren autenticación
const protectedRoutes = [
  '/admin',
  '/dashboard',
  '/profile',
  '/create',
  '/edit',
  '/settings'
]

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/auth/callback',
  '/search'
]

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Crear cliente de Supabase
  const supabase = createMiddlewareClient({
    req: request,
    res: NextResponse.next()
  })

  // Obtener la sesión actual
  const { data: { session }, error } = await supabase.auth.getSession()

  // Verificar si la ruta es pública
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Verificar si la ruta es protegida
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(`${route}/`)
  )

  // Rutas de autenticación
  const isAuthRoute = pathname === '/login' || pathname === '/register'

  // Si es una ruta pública, permitir el acceso
  if (isPublicRoute) {
    // Si el usuario ya está autenticado y quiere acceder a una ruta de autenticación, redirigir al dashboard
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Si es una ruta protegida y no hay sesión, redirigir al login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay sesión, verificar si el usuario existe en la base de datos
  if (session) {
    try {
      const { valid, user, error: authError } = await requireAuth()

      if (!valid || authError) {
        // Si la sesión no es válida o el usuario no existe, cerrar sesión y redirigir al login
        await supabase.auth.signOut()
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        loginUrl.searchParams.set('error', 'session_invalid')
        return NextResponse.redirect(loginUrl)
      }

      // Verificar permisos de administrador para rutas de admin
      if (pathname.startsWith('/admin/')) {
        if (user.role !== 'admin' && user.role !== 'super_admin') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }

      // Verificar permisos de editor para rutas de edición
      if (pathname.startsWith('/edit/') || pathname.startsWith('/create/')) {
        if (user.role !== 'editor' && user.role !== 'admin' && user.role !== 'super_admin') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }

      // Inyectar datos del usuario en los headers para el servidor
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', user.id)
      requestHeaders.set('x-user-email', user.email)
      requestHeaders.set('x-user-role', user.role)
      requestHeaders.set('x-user-name', user.name || '')

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })

    } catch (error) {
      console.error('Error en middleware:', error)
      // Si hay un error, cerrar sesión y redirigir al login
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      loginUrl.searchParams.set('error', 'middleware_error')
      return NextResponse.redirect(loginUrl)
    }
  }

  // Si no es una ruta pública ni protegida, permitir el acceso
  return NextResponse.next()
}

// Configurar el matcher para ejecutar el middleware en las rutas necesarias
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}