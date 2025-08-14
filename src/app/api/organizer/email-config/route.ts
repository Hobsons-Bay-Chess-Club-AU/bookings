import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(_request: NextRequest) {
    try {
        const profile = await getCurrentProfile()

        if (!profile) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check if user is organizer or admin
        if (profile.role !== 'organizer' && profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check email configuration
        const emailConfigured = !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
        const cronConfigured = !!process.env.CRON_SECRET

        return NextResponse.json({
            success: true,
            config: {
                emailConfigured,
                cronConfigured,
                fromEmail: process.env.RESEND_FROM_EMAIL || null
            }
        })

    } catch (error) {
        console.error('Error checking email config:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
