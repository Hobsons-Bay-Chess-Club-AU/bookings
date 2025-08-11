import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimitWithUser } from '@/lib/rate-limit/middleware'

export async function middleware(request: NextRequest) {
    // Check if required environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Missing Supabase environment variables')
        return NextResponse.next()
    }

    // Apply rate limiting first
    const rateLimitResult = await rateLimitWithUser(request)
    if (rateLimitResult) {
        return rateLimitResult
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value }) =>
                            supabaseResponse.cookies.set(name, value)
                        )
                    },
                },
            }
        )

        // Refresh session if expired - required for Server Components
        const { data: { user } } = await supabase.auth.getUser()

        // Protected routes that require authentication
        const protectedRoutes = ['/dashboard', '/profile', '/admin', '/organizer']
        const adminRoutes = ['/admin']
        const organizerRoutes = ['/organizer']

        const isProtectedRoute = protectedRoutes.some(route =>
            request.nextUrl.pathname.startsWith(route)
        )
        const isAdminRoute = adminRoutes.some(route =>
            request.nextUrl.pathname.startsWith(route)
        )
        const isOrganizerRoute = organizerRoutes.some(route =>
            request.nextUrl.pathname.startsWith(route)
        )

        // Redirect to login if accessing protected route without authentication
        if (isProtectedRoute && !user) {
            const redirectUrl = new URL('/auth/login', request.url)
            redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
            return NextResponse.redirect(redirectUrl)
        }
        // Check role-based access
        if (user && (isAdminRoute || isOrganizerRoute)) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (isAdminRoute && profile?.role !== 'admin') {
                return NextResponse.redirect(new URL('/unauthorized', request.url))
            }
            if (isOrganizerRoute && !['admin', 'organizer'].includes(profile?.role || '')) {
                return NextResponse.redirect(new URL('/unauthorized', request.url))
            }
        }

        // Redirect authenticated users away from auth pages (except logout)
        if (user && request.nextUrl.pathname.startsWith('/auth/') &&
            !request.nextUrl.pathname.startsWith('/auth/logout')) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        // console.log('Middleware processed successfully')
        return supabaseResponse
    } catch (error) {
        console.error('Middleware error:', error)
        return NextResponse.next()
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}