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
        const supabase = await createClient()
        const profile = await getCurrentProfile()
        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const {
            recipients = [],
            subject = '',
            message = '',
            context,
            scheduledDate,
            attachments
        }: {
            recipients: string[]
            subject: string
            message: string
            context?: Record<string, unknown>
            scheduledDate?: string
            attachments?: Array<{ filename: string; url: string; contentType?: string }>
        } = await request.json()

        const uniqueRecipients = [...new Set(recipients)].filter(Boolean)
        if (uniqueRecipients.length === 0) {
            return NextResponse.json({ error: 'No recipients provided' }, { status: 400 })
        }

        // If scheduled, save to database for later processing
        if (scheduledDate) {
            // Convert local datetime to UTC ISO
            // scheduledDate comes as local datetime string (e.g., "2025-08-25T20:30")
            // We need to parse it as local time and convert to UTC
            const localDate = new Date(scheduledDate)
            const normalizedUtc = localDate.toISOString()
            
            console.log('[SCHEDULE] Converting scheduled date', {
                input: scheduledDate,
                localDate: localDate.toString(),
                utcIso: normalizedUtc
            })

            const { data: scheduledEmail, error: scheduleError } = await supabase
                .from('scheduled_emails')
                .insert({
                    organizer_id: profile.id,
                    recipients: uniqueRecipients,
                    subject,
                    message,
                    context: context || {},
                    scheduled_date: normalizedUtc,
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

            console.log('[SCHEDULE] Inserted scheduled email', {
                id: scheduledEmail.id,
                scheduled_date: scheduledEmail.scheduled_date,
                rawInput: scheduledDate,
                normalizedUtc,
                timezoneOffset: localDate.getTimezoneOffset()
            })

            // Schedule a one-time QStash trigger to call our batch processor near scheduledDate
            try {
                const cronSecret = process.env.CRON_SECRET
                const appUrl = process.env.NEXT_PUBLIC_APP_URL
                if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured')
                if (!cronSecret) throw new Error('CRON_SECRET is not configured')

                const baseUrl = appUrl.replace(/\/+$/g, '')
                const targetUrl = `${baseUrl}/api/cron/process-scheduled-emails`
                const idempotencyKey = generateMinuteBucketKey('process-scheduled-emails', normalizedUtc)

                const qres = await scheduleOneTimeTrigger({
                    runAtIso: normalizedUtc,
                    targetUrl,
                    authorizationHeader: `Bearer ${cronSecret}`,
                    method: 'GET',
                    idempotencyKey,
                })

                if (!qres.success) {
                    console.error('Failed to schedule QStash trigger:', qres.error)
                }
            } catch (err) {
                console.error('QStash scheduling error:', err)
            }

            return NextResponse.json({
                success: true,
                message: 'Email scheduled successfully',
                scheduledId: scheduledEmail.id
            })
        }

        // Send immediately (omitted here)
        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('Error in send-email:', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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


