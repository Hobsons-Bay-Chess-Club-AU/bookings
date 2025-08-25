import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'
import { renderOrganizerCustomEmail } from '@/lib/email/templates/organizer-custom-email'
import { processAttachmentsForEmail, cleanupAttachmentBlobs } from '@/lib/email/attachments'

export async function GET(request: NextRequest) {
    try {
        const receivedAt = new Date()
        const authHeader = request.headers.get('Authorization')
        const expected = `Bearer ${process.env.CRON_SECRET}`
        const isAuthorized = authHeader === expected
        console.log('[CRON] process-scheduled-emails invoked', {
            receivedAt: receivedAt.toISOString(),
            hasAuthHeader: Boolean(authHeader),
            isAuthorized
        })

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Use service role to bypass RLS for backend batch processing
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[CRON] Missing SUPABASE_SERVICE_ROLE_KEY env; cannot use service client')
        }
        const supabase = await createServiceClient()

        // Get scheduled emails that are due (UTC) with a small lookahead buffer
        const now = new Date()
        const bufferMs = 10 * 1000 // 10 seconds
        const windowUpper = new Date(now.getTime() + bufferMs)
        const nowIso = now.toISOString()
        const windowUpperIso = windowUpper.toISOString()
        console.log('[CRON] Fetching due scheduled emails', {
            nowIso,
            windowUpperIso,
            bufferMs,
            filter: { status: 'scheduled', lte_scheduled_date: windowUpperIso }
        })
        const { data: scheduledEmails, error: fetchError } = await supabase
            .from('scheduled_emails')
            .select(`
                *,
                organizer:profiles!scheduled_emails_organizer_id_fkey(*)
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_date', windowUpperIso)
            .limit(50)

        console.log('[CRON] Query details', {
            statusFilter: 'scheduled',
            scheduledDateFilter: `<= ${windowUpperIso}`,
            queryError: fetchError,
            resultCount: scheduledEmails?.length || 0
        })

        // Debug: Check all scheduled emails to see what's in the database
        const { data: allScheduled, error: debugError } = await supabase
            .from('scheduled_emails')
            .select('id, scheduled_date, status')
            .eq('status', 'scheduled')
            .order('scheduled_date', { ascending: true })
            .limit(10)

        console.log('[CRON] Debug - All scheduled emails in DB', {
            debugError,
            count: allScheduled?.length || 0,
            emails: allScheduled?.map(e => ({
                id: e.id,
                scheduled_date: e.scheduled_date,
                status: e.status
            }))
        })

        // Debug: Check ALL emails regardless of status
        const { data: allEmails, error: allEmailsError } = await supabase
            .from('scheduled_emails')
            .select('id, scheduled_date, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5)

        console.log('[CRON] Debug - ALL emails in DB (any status)', {
            allEmailsError,
            count: allEmails?.length || 0,
            emails: allEmails?.map(e => ({
                id: e.id,
                scheduled_date: e.scheduled_date,
                status: e.status,
                created_at: e.created_at
            }))
        })

        // Debug: Try a different approach - get all scheduled emails and filter in JS
        const { data: allScheduledForDebug, error: debugFilterError } = await supabase
            .from('scheduled_emails')
            .select('id, scheduled_date, status')
            .eq('status', 'scheduled')

        if (allScheduledForDebug && allScheduledForDebug.length > 0) {
            const dueEmails = allScheduledForDebug.filter(email => {
                const emailDate = new Date(email.scheduled_date)
                const windowDate = new Date(windowUpperIso)
                const isDue = emailDate <= windowDate
                console.log('[CRON] Debug - Email date comparison', {
                    emailId: email.id,
                    emailDate: email.scheduled_date,
                    emailDateParsed: emailDate.toISOString(),
                    windowDate: windowUpperIso,
                    windowDateParsed: windowDate.toISOString(),
                    isDue
                })
                return isDue
            })
            console.log('[CRON] Debug - JS filtered due emails', {
                totalScheduled: allScheduledForDebug.length,
                dueEmails: dueEmails.length,
                dueEmailIds: dueEmails.map(e => e.id)
            })
        }

        if (fetchError) {
            console.error('[CRON] Error fetching scheduled emails:', fetchError)
            return NextResponse.json({ error: 'Failed to fetch scheduled emails' }, { status: 500 })
        }

        if (!scheduledEmails || scheduledEmails.length === 0) {
            console.log('[CRON] No scheduled emails due at this time')
            return NextResponse.json({ 
                success: true, 
                message: 'No scheduled emails to process',
                processed: 0 
            })
        }

        console.log('[CRON] Fetched scheduled emails', {
            count: scheduledEmails.length,
            sample: scheduledEmails.slice(0, 3).map(e => ({ id: e.id, scheduled_date: e.scheduled_date, status: e.status }))
        })

        let processed = 0
        let successful = 0
        let failed = 0

        for (const email of scheduledEmails) {
            processed++
            console.log('[CRON] Processing email', { id: email.id, scheduled_date: email.scheduled_date, recipients: Array.isArray(email.recipients) ? email.recipients.length : 0 })

            try {
                // Note: Skipping temporary 'processing' status due to DB check constraint.
                // We proceed to send and will conditionally update final status where status is still 'scheduled'.
                const uniqueRecipients = [...new Set(email.recipients)] as string[]
                console.log('[CRON] Unique recipients', { id: email.id, recipients: uniqueRecipients })

                const processedMessage = processMessageVariables(email.message, email.context, email.organizer)
                const processedSubject = processMessageVariables(email.subject, email.context, email.organizer)

                const { html: emailHtml } = await renderOrganizerCustomEmail({
                    subject: processedSubject,
                    message: processedMessage,
                    organizerName: email.organizer?.full_name || 'Event Organizer',
                    organizerEmail: email.organizer?.email,
                    event: email.context?.event as {
                        title: string
                        start_date: string
                        location: string
                        description?: string
                    } | undefined,
                    booking: email.context?.booking as {
                        booking_id?: string
                        id: string
                        event?: {
                            title: string
                            start_date: string
                            location: string
                            description?: string
                        }
                    } | undefined,
                    participant: email.context?.participant as {
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
                    user: email.context?.user as {
                        full_name?: string
                        email: string
                    } | undefined
                })

                let processedAttachments: Array<{
                    filename: string;
                    content: string;
                    contentType: string;
                }> = []

                if (email.attachments && email.attachments.length > 0) {
                    try {
                        processedAttachments = await processAttachmentsForEmail(email.attachments)
                        console.log('[CRON] Attachments processed', { id: email.id, count: processedAttachments.length })
                    } catch (error) {
                        console.error('[CRON] Attachment processing failed', { id: email.id, error })
                        await supabase
                            .from('scheduled_emails')
                            .update({ 
                                status: 'failed',
                                error_message: `Failed to process attachments: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', email.id)
                        continue
                    }
                }

                const results = await Promise.allSettled(uniqueRecipients.map(async (recipientEmail: string) => {
                    try {
                        const result = await sendEmail({
                            to: recipientEmail,
                            subject: processedSubject,
                            html: emailHtml,
                            attachments: processedAttachments
                        })
                        console.log('[CRON] Sent email to recipient', { id: email.id, recipientEmail })
                        return { success: true, email: recipientEmail, result }
                    } catch (error) {
                        console.error('[CRON] Failed sending to recipient', { id: email.id, recipientEmail, error })
                        return { success: false, email: recipientEmail, error: error instanceof Error ? error.message : 'Unknown error' }
                    }
                }))

                const emailSuccessful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
                const emailFailed = results.length - emailSuccessful
                console.log('[CRON] Send results', { id: email.id, emailSuccessful, emailFailed })

                if (emailFailed === 0) {
                    successful++
                    await supabase
                        .from('scheduled_emails')
                        .update({ 
                            status: 'sent',
                            sent_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', email.id)
                        .eq('status', 'scheduled')

                    if (email.attachments && email.attachments.length > 0) {
                        try {
                            await cleanupAttachmentBlobs(email.attachments)
                            console.log('[CRON] Cleaned up attachment blobs', { id: email.id })
                        } catch (error) {
                            console.error('[CRON] Cleanup attachment blobs failed', { id: email.id, error })
                        }
                    }
                } else {
                    failed++
                    await supabase
                        .from('scheduled_emails')
                        .update({ 
                            status: 'failed',
                            error_message: `Sent to ${emailSuccessful}/${uniqueRecipients.length} recipients`,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', email.id)
                        .eq('status', 'scheduled')
                }

                await supabase
                    .from('email_logs')
                    .insert({
                        organizer_id: email.organizer_id,
                        recipients: uniqueRecipients,
                        subject: processedSubject,
                        message: processedMessage,
                        context: email.context || {},
                        sent_count: emailSuccessful,
                        failed_count: emailFailed,
                        status: emailFailed === 0 ? 'sent' : (emailSuccessful === 0 ? 'failed' : 'partial')
                    })

                console.log('[CRON] Processed scheduled email', { id: email.id, emailSuccessful, emailFailed })

            } catch (error) {
                failed++
                console.error('[CRON] Error processing email', { id: email.id, error })

                await supabase
                    .from('scheduled_emails')
                    .update({ 
                        status: 'failed',
                        error_message: error instanceof Error ? error.message : 'Unknown error',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', email.id)
                    .eq('status', 'scheduled')
            }
        }

        console.log('[CRON] Summary', { processed, successful, failed })
        return NextResponse.json({
            success: true,
            message: `Processed ${processed} scheduled emails`,
            stats: {
                processed,
                successful,
                failed
            }
        })

    } catch (error) {
        console.error('Error in process-scheduled-emails cron:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Allow POST for manual triggering during development
export async function POST(request: NextRequest) {
    return GET(request)
}

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

function processMessageVariables(text: string, context: EmailContext | undefined, organizer: Record<string, unknown>): string {
    const event = context?.event || 
                  context?.booking?.event || 
                  context?.participant?.booking?.event
    
    const variables = {
        recipientName: 'Recipient',
        eventName: event?.title || 'Event',
        eventDate: event?.start_date ? new Date(event.start_date as string).toLocaleDateString() : 'Event Date',
        eventLocation: event?.location || 'Event Location',
        organizerName: (organizer as { full_name?: string }).full_name || 'Event Organizer',
        organizerEmail: (organizer as { email?: string }).email || '',
        customMessage: text.includes('{{customMessage}}') ? text.replace(/\{\{customMessage\}\}/g, '') : text,
        amountDue: (context as { booking?: { total_amount?: number } } | undefined)?.booking?.total_amount?.toString() || '0.00'
    }

    let processedText = text
    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        processedText = processedText.replace(new RegExp(placeholder, 'g'), String(value))
    })

    return processedText
}


