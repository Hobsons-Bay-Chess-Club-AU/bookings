import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const supabase = await createClient()

        // Sign out from server-side
        await supabase.auth.signOut()

        // Create response
        const response = NextResponse.json({ success: true, message: 'Logged out successfully' })

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
        return NextResponse.json(
            { success: false, error: 'Logout failed' },
            { status: 500 }
        )
    }
}
