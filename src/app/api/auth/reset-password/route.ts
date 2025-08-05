import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPasswordResetEmail } from '@/lib/email/service'

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            )
        }

        const supabase = await createServiceClient()

        // Check if user exists
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', email)
            .single()

        if (userError || !user) {
            // Don't reveal if user exists or not for security
            console.log('Password reset requested for non-existent email:', email)
            return NextResponse.json(
                { success: true, message: 'If an account with that email exists, a password reset link has been sent.' },
                { status: 200 }
            )
        }

        // Generate reset URL
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`

        // Send password reset email
        const emailResult = await sendPasswordResetEmail(
            user.email,
            user.full_name || user.email,
            resetUrl
        )

        if (!emailResult.success) {
            console.error('Failed to send password reset email:', emailResult.error)
            return NextResponse.json(
                { error: 'Failed to send password reset email' },
                { status: 500 }
            )
        }

        console.log('Password reset email sent successfully to:', email)

        return NextResponse.json(
            { success: true, message: 'Password reset link has been sent to your email.' },
            { status: 200 }
        )

    } catch (error) {
        console.error('Error in password reset API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 