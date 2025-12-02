import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/auth']

  // Define protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/admin', '/profile', '/courses', '/notifications']

  const { pathname } = request.nextUrl

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Redirect logic for protected routes
  if (isProtectedRoute && !user) {
    // If trying to access a protected route without being authenticated
    const url = new URL('/login', request.url)
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect logic for public routes when authenticated
  if (isPublicRoute && user) {
    // If authenticated user tries to access login/signup, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin route protection
  if (pathname.startsWith('/admin') && user) {
    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      // User is not an admin, redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Handle auth callback route
  if (pathname === '/auth/callback') {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const redirectTo = searchParams.get('redirectTo') || '/dashboard'

    if (error) {
      // Auth error occurred
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
    }

    if (code) {
      // Successful auth, redirect to the intended destination
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
  }

  // Handle reset password callback
  if (pathname === '/reset-password') {
    // Allow access to reset password page
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - / (root)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}