import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scheduleOneTimeTrigger, generateMinuteBucketKey } from '@/lib/utils/qstash'
import { sendEmail } from '@/lib/email/service'
import { getCurrentProfile } from '@/lib/utils/auth'
import { renderOrganizerCustomEmail } from '@/lib/email/templates/organizer-custom-email'
import { processAttachmentsForEmail, cleanupAttachmentBlobs } from '@/lib/email/attachments'

interface EmailContext {
    event?: Record<string, unknown>
    booking?: Record<string, unknown> & {
        event?: Record<string, unknown>
    }
    participant?: Record<string, unknown> & {
        booking?: Record<string, unknown> & {
            event?: Record<string, unknown>
        }
    }
    user?: Record<string, unknown>
}

interface SendEmailRequest {
    recipients: string[]
    subject: string
    message: string
    context?: EmailContext
    scheduledDate?: string | null
    attachments?: Array<{
        filename: string;
        blobUrl?: string;
        content?: string; // For backward compatibility
        contentType: string;
    }>
}

interface ScheduledEmail {
    id: string
    organizer_id: string
    recipients: string[]
    subject: string
    message: string
    context?: EmailContext
    scheduled_date: string
    status: 'scheduled' | 'sent' | 'failed'
    attachments?: Array<{
        filename: string;
        blobUrl?: string;
        content?: string; // For backward compatibility
        contentType: string;
    }>
    created_at: string
    sent_at?: string
}

export async function POST(request: NextRequest) {
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

        const body: SendEmailRequest = await request.json()
        const { recipients, subject, message, context, scheduledDate, attachments } = body

        if (!recipients || recipients.length === 0) {
            return NextResponse.json(
                { error: 'Recipients are required' },
                { status: 400 }
            )
        }

        if (!subject.trim() || !message.trim()) {
            return NextResponse.json(
                { error: 'Subject and message are required' },
                { status: 400 }
            )
        }

        // Remove duplicate emails
        const uniqueRecipients = [...new Set(recipients)]

        const supabase = await createClient()

        // If scheduled, save to database for later processing
        if (scheduledDate) {
            const { data: scheduledEmail, error: scheduleError } = await supabase
                .from('scheduled_emails')
                .insert({
                    organizer_id: profile.id,
                    recipients: uniqueRecipients,
                    subject,
                    message,
                    context: context || {},
                    scheduled_date: scheduledDate,
                    status: 'scheduled',
                    attachments: attachments || []
                })
                .select()
                .single()

            if (scheduleError) {
                console.error('Error scheduling email:', scheduleError)
                return NextResponse.json(
                    { error: 'Failed to schedule email' },
                    { status: 500 }
                )
            }
            // Schedule a one-time QStash trigger to call our batch processor near scheduledDate
            try {
                const cronSecret = process.env.CRON_SECRET
                const appUrl = process.env.NEXT_PUBLIC_APP_URL
                if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured')
                if (!cronSecret) throw new Error('CRON_SECRET is not configured')

                const targetUrl = `${appUrl}/api/cron/process-scheduled-emails`
                const idempotencyKey = generateMinuteBucketKey('process-scheduled-emails', scheduledDate)

                // Debug logs (mask secrets, validate URL)
                const hasScheme = /^https?:\/\//i.test(appUrl)
                const normalizedTargetUrl = targetUrl
                console.log('[QSTASH DEBUG] scheduling batch run', {
                    appUrl,
                    hasScheme,
                    targetUrl: normalizedTargetUrl,
                    scheduledDate,
                    idempotencyKey
                })

                const qres = await scheduleOneTimeTrigger({
                    runAtIso: scheduledDate,
                    targetUrl,
                    authorizationHeader: `Bearer ${cronSecret}`,
                    method: 'GET',
                    idempotencyKey,
                })

                if (!qres.success) {
                    console.error('Failed to schedule QStash trigger:', qres.error)
                    // We still return 200 since the email is scheduled in DB; a separate periodic job could backstop
                }
            } catch (err) {
                console.error('QStash scheduling error:', err)
                // Do not fail the request; DB state is authoritative
            }

            return NextResponse.json({
                success: true,
                message: 'Email scheduled successfully',
                scheduledId: scheduledEmail.id
            })
        }

        // Send email immediately
        const processedMessage = processMessageVariables(message, context, profile as unknown as Record<string, unknown>)
        const processedSubject = processMessageVariables(subject, context, profile as unknown as Record<string, unknown>)

        // Generate HTML email using React template
        const { html: emailHtml } = await renderOrganizerCustomEmail({
            subject: processedSubject,
            message: processedMessage,
            organizerName: profile.full_name || 'Event Organizer',
            organizerEmail: profile.email,
            event: context?.event as {
                title: string
                start_date: string
                location: string
                description?: string
            } | undefined,
            booking: context?.booking as {
                booking_id?: string
                id: string
                event?: {
                    title: string
                    start_date: string
                    location: string
                    description?: string
                }
            } | undefined,
            participant: context?.participant as {
                id: string
                first_name: string
                last_name: string
                booking?: {
                    booking_id?: string
                    id: string
                    event?: {
                        title: string
                        start_date: string
                        location: string
                        description?: string
                    }
                }
            } | undefined,
            user: context?.user as {
                full_name?: string
                email: string
            } | undefined
        })

        // Process attachments (download from blob storage if needed)
        let processedAttachments: Array<{
            filename: string;
            content: string;
            contentType: string;
        }> = []
        
        if (attachments && attachments.length > 0) {
            try {
                processedAttachments = await processAttachmentsForEmail(attachments)
                console.log(`Processed ${processedAttachments.length} attachments for email sending`)
            } catch (error) {
                console.error('Failed to process attachments:', error)
                return NextResponse.json(
                    { error: `Failed to process attachments: ${error instanceof Error ? error.message : 'Unknown error'}` },
                    { status: 500 }
                )
            }
        }

        // Send to all recipients
        const emailPromises = uniqueRecipients.map(async (email) => {
            try {
                const result = await sendEmail({
                    to: email,
                    subject: processedSubject,
                    html: emailHtml,
                    attachments: processedAttachments
                })
                return { success: true, email, result }
            } catch (error) {
                console.error(`Failed to send email to ${email}:`, error)
                return { success: false, email, error: error instanceof Error ? error.message : 'Unknown error' }
            }
        })

        const results = await Promise.allSettled(emailPromises)
        const successful = results.filter(result => 
            result.status === 'fulfilled' && result.value.success
        ).length
        const failed = results.length - successful

        // Log the email sending attempt
        await supabase
            .from('email_logs')
            .insert({
                organizer_id: profile.id,
                recipients: uniqueRecipients,
                subject: processedSubject,
                message: processedMessage,
                context: context || {},
                sent_count: successful,
                failed_count: failed,
                status: failed === 0 ? 'sent' : (successful === 0 ? 'failed' : 'partial'),
                attachments: attachments || []
            })

        // Clean up blob storage after successful sends
        if (successful > 0 && attachments && attachments.length > 0) {
            try {
                await cleanupAttachmentBlobs(attachments)
                console.log('Successfully cleaned up attachment blobs')
            } catch (error) {
                console.error('Failed to cleanup attachment blobs:', error)
                // Don't fail the request if cleanup fails
            }
        }

        return NextResponse.json({
            success: true,
            message: `Email sent successfully to ${successful} recipients${failed > 0 ? `, failed for ${failed} recipients` : ''}`,
            stats: {
                total: uniqueRecipients.length,
                successful,
                failed
            }
        })

    } catch (error) {
        console.error('Error in send-email API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

function processMessageVariables(text: string, context: EmailContext | undefined, organizer: Record<string, unknown>): string {
    const event = context?.event || 
                  context?.booking?.event || 
                  context?.participant?.booking?.event
    
    const variables = {
        recipientName: 'Recipient', // Will be replaced per recipient if needed
        eventName: event?.title || 'Event',
        eventDate: event?.start_date ? new Date(event.start_date as string).toLocaleDateString() : 'Event Date',
        eventLocation: event?.location || 'Event Location',
        organizerName: organizer.full_name || 'Event Organizer',
        organizerEmail: organizer.email || '',
        customMessage: text.includes('{{customMessage}}') ? text.replace(/\{\{customMessage\}\}/g, '') : text,
        amountDue: context?.booking?.total_amount?.toString() || '0.00'
    }

    let processedText = text
    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        processedText = processedText.replace(new RegExp(placeholder, 'g'), String(value))
    })

    return processedText
}


