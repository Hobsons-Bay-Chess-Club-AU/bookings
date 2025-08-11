import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware'
import { successResponse, serverErrorResponse } from '@/lib/security/api-utils'

async function logoutHandler() {
    try {
        const supabase = await createClient()

        // Sign out from server-side
        await supabase.auth.signOut()

        // Create secure response
        const response = successResponse({ message: 'Logged out successfully' })

        // Clear all auth-related cookies
        const cookiesToClear = [
            'sb-access-token',
            'sb-refresh-token',
            'supabase-auth-token',
            'supabase.auth.token'
        ]

        cookiesToClear.forEach(cookieName => {
            response.cookies.set({
                name: cookieName,
                value: '',
                expires: new Date(0),
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            })
        })

        return response
    } catch (error) {
        console.error('Server-side logout error:', error)
        return serverErrorResponse('Logout failed')
    }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request)
  if (rateLimitResult) {
    return rateLimitResult
  }
  
  return logoutHandler()
}
