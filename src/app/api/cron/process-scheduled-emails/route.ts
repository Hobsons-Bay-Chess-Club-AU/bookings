import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'
import { renderOrganizerCustomEmail } from '@/lib/email/templates/organizer-custom-email'
import { processAttachmentsForEmail, cleanupAttachmentBlobs } from '@/lib/email/attachments'

export async function GET(request: NextRequest) {
    try {
        // Verify this is a cron request (you can add more security here)
        const authHeader = request.headers.get('Authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        // Get scheduled emails that are due
        const now = new Date().toISOString()
        const { data: scheduledEmails, error: fetchError } = await supabase
            .from('scheduled_emails')
            .select(`
                *,
                organizer:profiles!scheduled_emails_organizer_id_fkey(*)
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_date', now)
            .limit(50) // Process max 50 emails per run

        if (fetchError) {
            console.error('Error fetching scheduled emails:', fetchError)
            return NextResponse.json({ error: 'Failed to fetch scheduled emails' }, { status: 500 })
        }

        if (!scheduledEmails || scheduledEmails.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: 'No scheduled emails to process',
                processed: 0 
            })
        }

        let processed = 0
        let successful = 0
        let failed = 0

        // Process each scheduled email
        for (const email of scheduledEmails) {
            processed++
            
            try {
                // Mark as processing to avoid duplicate processing
                await supabase
                    .from('scheduled_emails')
                    .update({ 
                        status: 'processing',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', email.id)

                // Remove duplicate recipients
                const uniqueRecipients = [...new Set(email.recipients)] as string[]

                // Process message variables
                const processedMessage = processMessageVariables(email.message, email.context, email.organizer)
                const processedSubject = processMessageVariables(email.subject, email.context, email.organizer)

                // Generate HTML email
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

                // Process attachments (download from blob storage if needed)
                let processedAttachments: Array<{
                    filename: string;
                    content: string;
                    contentType: string;
                }> = []
                
                if (email.attachments && email.attachments.length > 0) {
                    try {
                        processedAttachments = await processAttachmentsForEmail(email.attachments)
                        console.log(`Processed ${processedAttachments.length} attachments for scheduled email ${email.id}`)
                    } catch (error) {
                        console.error(`Failed to process attachments for scheduled email ${email.id}:`, error)
                        // Mark as failed and continue with next email
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

                // Send to all recipients
                const emailPromises = uniqueRecipients.map(async (recipientEmail: string) => {
                    try {
                        const result = await sendEmail({
                            to: recipientEmail,
                            subject: processedSubject,
                            html: emailHtml,
                            attachments: processedAttachments
                        })
                        return { success: true, email: recipientEmail, result }
                    } catch (error) {
                        console.error(`Failed to send scheduled email to ${recipientEmail}:`, error)
                        return { 
                            success: false, 
                            email: recipientEmail, 
                            error: error instanceof Error ? error.message : 'Unknown error' 
                        }
                    }
                })

                const results = await Promise.allSettled(emailPromises)
                const emailSuccessful = results.filter(result => 
                    result.status === 'fulfilled' && result.value.success
                ).length
                const emailFailed = results.length - emailSuccessful

                // Update scheduled email status
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
                    
                    // Clean up blob storage after successful send
                    if (email.attachments && email.attachments.length > 0) {
                        try {
                            await cleanupAttachmentBlobs(email.attachments)
                            console.log(`Successfully cleaned up attachment blobs for scheduled email ${email.id}`)
                        } catch (error) {
                            console.error(`Failed to cleanup attachment blobs for scheduled email ${email.id}:`, error)
                            // Don't fail the email processing if cleanup fails
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
                }

                // Log the email sending
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

                console.log(`Processed scheduled email ${email.id}: ${emailSuccessful} sent, ${emailFailed} failed`)

            } catch (error) {
                failed++
                console.error(`Error processing scheduled email ${email.id}:`, error)
                
                // Mark as failed
                await supabase
                    .from('scheduled_emails')
                    .update({ 
                        status: 'failed',
                        error_message: error instanceof Error ? error.message : 'Unknown error',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', email.id)
            }
        }

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
        recipientName: 'Recipient', // Will be replaced per recipient if needed
        eventName: event?.title || 'Event',
        eventDate: event?.start_date ? new Date(event.start_date as string).toLocaleDateString() : 'Event Date',
        eventLocation: event?.location || 'Event Location',
        organizerName: organizer?.full_name || 'Event Organizer',
        organizerEmail: organizer?.email || '',
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


