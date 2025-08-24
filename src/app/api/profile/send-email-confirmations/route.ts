import { NextRequest, NextResponse } from 'next/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'
import { renderEmailConfirmationEmail } from '@/lib/email/templates/email-confirmation'

export async function POST(request: NextRequest) {
    try {
        const profile = await getCurrentProfile()
        
        if (!profile) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { emails, userName } = await request.json()

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json(
                { error: 'Email addresses are required' },
                { status: 400 }
            )
        }

        // Validate email addresses
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const validEmails = emails.filter(email => 
            email && 
            typeof email === 'string' && 
            emailRegex.test(email.trim()) &&
            email.trim() !== profile.email
        )

        if (validEmails.length === 0) {
            return NextResponse.json(
                { error: 'No valid email addresses provided' },
                { status: 400 }
            )
        }

        // Limit to 5 emails per request
        if (validEmails.length > 5) {
            return NextResponse.json(
                { error: 'Maximum 5 email addresses allowed per request' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Create pending records and send confirmation emails
        const emailPromises = validEmails.map(async (email) => {
            try {
                // Check if email already exists in mailing list
                const { data: existingEntry, error: checkError } = await supabase
                    .from('mailing_list')
                    .select('id, status')
                    .eq('email', email)
                    .single()

                if (checkError && checkError.code !== 'PGRST116') {
                    throw new Error('Database error checking existing email')
                }

                // If already subscribed, skip
                if (existingEntry && existingEntry.status === 'subscribed') {
                    return { email, success: true, skipped: true, reason: 'already_subscribed' }
                }

                // If already pending, skip
                if (existingEntry && existingEntry.status === 'pending') {
                    return { email, success: true, skipped: true, reason: 'already_pending' }
                }

                let confirmationToken: string

                if (existingEntry) {
                    // Update existing unsubscribed entry to pending
                    const { data: updateData, error: updateError } = await supabase
                        .from('mailing_list')
                        .update({
                            status: 'pending',
                            confirmation_token: crypto.randomUUID(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('email', email)
                        .select('confirmation_token')
                        .single()

                    if (updateError) {
                        throw new Error('Failed to update mailing list entry')
                    }

                    confirmationToken = updateData.confirmation_token
                } else {
                    // Create new pending entry
                    const { data: insertData, error: insertError } = await supabase
                        .from('mailing_list')
                        .insert({
                            email: email,
                            status: 'pending',
                            filter_event: ['all'],
                            confirmation_token: crypto.randomUUID()
                        })
                        .select('confirmation_token')
                        .single()

                    if (insertError) {
                        throw new Error('Failed to create mailing list entry')
                    }

                    confirmationToken = insertData.confirmation_token
                }

                // Create confirmation URL with secure token
                const confirmationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/profile/confirm-email-subscription?token=${confirmationToken}`

                // Render email template
                const emailData = await renderEmailConfirmationEmail({
                    recipientEmail: email,
                    userName: userName || 'User',
                    confirmationUrl
                })

                // Send email
                await sendEmail({
                    to: email,
                    subject: 'Confirm Your Email Subscription',
                    html: emailData.html
                })

                return { email, success: true }
            } catch (error) {
                console.error(`Error processing confirmation for ${email}:`, error)
                return { email, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
        })

        const results = await Promise.all(emailPromises)
        const successful = results.filter(r => r.success)
        const failed = results.filter(r => !r.success)

        return NextResponse.json({
            success: true,
            message: `Confirmation emails sent to ${successful.length} address(es)`,
            results: {
                successful: successful.length,
                failed: failed.length,
                failedEmails: failed.map(f => ({ email: f.email, error: f.error }))
            }
        })

    } catch (error) {
        console.error('Error in send email confirmations API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
