import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            // Redirect to profile with error message
            return NextResponse.redirect(new URL('/profile?error=invalid-confirmation-link', request.url))
        }

        const supabase = createServiceClient()

        // Find pending subscription with this token
        const { data: pendingEntry, error: findError } = await supabase
            .from('mailing_list')
            .select('id, email, status')
            .eq('confirmation_token', token)
            .eq('status', 'pending')
            .single()

        if (findError || !pendingEntry) {
            console.error('Error finding pending subscription:', findError)
            return NextResponse.redirect(new URL('/profile?error=invalid-or-expired-token', request.url))
        }

        // Activate the subscription
        const { error: updateError } = await supabase
            .from('mailing_list')
            .update({
                status: 'subscribed',
                confirmation_token: null, // Clear the token after use
                updated_at: new Date().toISOString()
            })
            .eq('id', pendingEntry.id)

        if (updateError) {
            console.error('Error activating subscription:', updateError)
            return NextResponse.redirect(new URL('/profile?error=subscription-failed', request.url))
        }

        // Success - redirect to profile with success message
        return NextResponse.redirect(new URL(`/profile?success=email-confirmed&email=${encodeURIComponent(pendingEntry.email)}`, request.url))

    } catch (error) {
        console.error('Error in email confirmation API:', error)
        return NextResponse.redirect(new URL('/profile?error=internal-error', request.url))
    }
}
