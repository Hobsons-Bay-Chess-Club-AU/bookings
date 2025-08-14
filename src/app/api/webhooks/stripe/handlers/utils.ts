import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendBookingConfirmationEmail, sendWhitelistedBookingEmail, sendOrganizerBookingNotificationEmail } from '@/lib/email/service'
import { PaymentEventData } from './types'
import type { MembershipLookupConfig } from '@/lib/types/database'

// Create service role client for webhooks to bypass RLS
export const createWebhookSupabaseClient = () => {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// Helper function to capture payment events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const capturePaymentEvent = async (supabase: any, data: PaymentEventData) => {
    try {
        const { error } = await supabase
            .from('payment_events')
            .insert({
                booking_id: data.bookingId,
                stripe_event_type: data.eventType,
                stripe_event_id: data.eventId
            })

        if (error) {
            console.error('Error capturing payment event:', error)
        } else {
            console.log('✅ Payment event captured:', {
                bookingId: data.bookingId,
                eventType: data.eventType,
                eventId: data.eventId,
                timestamp: new Date().toISOString()
            })
        }
    } catch (error) {
        console.error('Error capturing payment event:', error)
    }
}

// Helper function to send booking confirmation email
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendBookingConfirmationEmailWithLogging = async (booking: any, event: any, user: any) => {
    try {
        console.log('📧 [WEBHOOK] Attempting to send booking confirmation email:', {
            bookingId: booking.id,
            userEmail: user.email,
            eventTitle: event.title,
            bookingStatus: booking.status,
            timestamp: new Date().toISOString()
        })

        // Choose the appropriate email function based on booking status
        const emailFunction = booking.status === 'whitelisted' ? sendWhitelistedBookingEmail : sendBookingConfirmationEmail
        const emailType = booking.status === 'whitelisted' ? 'whitelisted booking' : 'booking confirmation'

        const emailResult = await emailFunction({
            booking: booking,
            event: event,
            user: user
        })

        if (emailResult.success) {
            console.log(`✅ [WEBHOOK] ${emailType} email sent successfully:`, {
                bookingId: booking.id,
                emailId: emailResult.data?.id,
                userEmail: user.email,
                eventTitle: event.title,
                bookingStatus: booking.status,
                timestamp: new Date().toISOString()
            })
        } else {
            console.error(`❌ [WEBHOOK] ${emailType} email failed:`, {
                bookingId: booking.id,
                error: emailResult.error,
                userEmail: user.email,
                eventTitle: event.title,
                bookingStatus: booking.status,
                timestamp: new Date().toISOString()
            })
        }

        return emailResult
    } catch (emailError) {
        console.error('💥 [WEBHOOK] Exception sending confirmation email:', {
            bookingId: booking.id,
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            errorStack: emailError instanceof Error ? emailError.stack : undefined,
            userEmail: user.email,
            eventTitle: event.title,
            bookingStatus: booking.status,
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Exception occurred' }
    }
}

// Helper function to send organizer notification email
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendOrganizerNotificationEmailWithLogging = async (supabase: any, booking: any) => {
    try {
        if (booking.events?.settings?.notify_organizer_on_booking && booking.events?.organizer?.email) {
            console.log('📧 [WEBHOOK] Attempting to send organizer notification email:', {
                bookingId: booking.id,
                organizerEmail: booking.events.organizer.email,
                eventTitle: booking.events.title,
                timestamp: new Date().toISOString()
            })

            // Fetch participants for this booking
            const { data: participants } = await supabase
                .from('participants')
                .select('*')
                .eq('booking_id', booking.id)
                .order('created_at', { ascending: true })

            await sendOrganizerBookingNotificationEmail({
                organizerEmail: booking.events.organizer.email,
                organizerName: booking.events.organizer.full_name || booking.events.organizer.email,
                eventTitle: booking.events.title,
                eventDate: booking.events.start_date,
                eventLocation: booking.events.location,
                bookingId: booking.booking_id || booking.id,
                participantCount: booking.quantity,
                totalAmount: booking.total_amount,
                customerName: booking.profiles.full_name || booking.profiles.email,
                customerEmail: booking.profiles.email,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                participants: (participants as any) || []
            })

            console.log('✅ [WEBHOOK] Organizer notification email sent successfully:', {
                bookingId: booking.id,
                organizerEmail: booking.events.organizer.email,
                eventTitle: booking.events.title,
                timestamp: new Date().toISOString()
            })

            return { success: true }
        } else {
            console.log('⏭️ [WEBHOOK] Skipping organizer notification email:', {
                bookingId: booking.id,
                reason: 'Organizer notification disabled or no organizer email',
                timestamp: new Date().toISOString()
            })
            return { success: true, skipped: true }
        }
    } catch (organizerEmailError) {
        console.error('❌ [WEBHOOK] Failed to send organizer notification email:', {
            bookingId: booking.id,
            error: organizerEmailError instanceof Error ? organizerEmailError.message : 'Unknown error',
            timestamp: new Date().toISOString()
        })
        return { success: false, error: 'Failed to send organizer notification' }
    }
} 

// Compute backend-only computed fields for participants (Membership Lookup)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const computeMembershipLookupFields = async (supabase: any, event: any, bookingId: string) => {
    try {
        console.log('🧮 COMPUTE START', {
            eventId: event?.id,
            hasCustomFields: Boolean(event?.custom_form_fields),
            customFieldCount: Array.isArray(event?.custom_form_fields) ? event?.custom_form_fields.length : 0
        })
        if (event?.custom_form_fields && Array.isArray(event.custom_form_fields)) {
            const computedFields = event.custom_form_fields.filter((f: { type?: string; name?: string }) => f.type === 'computed_membership_lookup')
            console.log('🧮 COMPUTED FIELDS FOUND', {
                count: computedFields.length,
                names: computedFields.map((f: { name?: string }) => f.name)
            })
            if (computedFields.length > 0) {
                const { data: participants } = await supabase
                    .from('participants')
                    .select('id, first_name, last_name, date_of_birth, custom_data')
                    .eq('booking_id', bookingId)
                console.log('👥 PARTICIPANTS TO COMPUTE', {
                    bookingId,
                    count: participants?.length || 0,
                    ids: (participants || []).map((p: { id: string }) => p.id)
                })
                if (participants && participants.length > 0) {
                    for (const participant of participants as Array<{ id: string; first_name?: string; last_name?: string; date_of_birth?: string; custom_data?: Record<string, unknown> }>) {
                        console.log('➡️ PARTICIPANT', {
                            id: participant.id,
                            first_name: participant.first_name,
                            last_name: participant.last_name,
                            date_of_birth: participant.date_of_birth
                        })
                        const newCustomData: Record<string, unknown> = { ...(participant.custom_data || {}) }
                        for (const field of computedFields as Array<{ name: string; type?: string; config?: MembershipLookupConfig }>) {
                            const config = (field.config || {}) as MembershipLookupConfig
                            const targetEventId = config?.target_event_id
                            console.log('🔧 FIELD CONFIG', {
                                fieldName: field.name,
                                targetEventId,
                                match_on: config?.match_on,
                                case_insensitive: Boolean(config?.case_insensitive),
                                normalize_spaces: Boolean(config?.normalize_spaces),
                                match_value: config?.match_value,
                                no_match_value: config?.no_match_value
                            })
                            if (!targetEventId) {
                                console.log('⚠️ No target_event_id, assigning no_match_value')
                                newCustomData[field.name] = (config?.no_match_value ?? 'NO') as string
                                continue
                            }
                            const matchFields = (config?.match_on && Array.isArray(config.match_on) && config.match_on.length > 0)
                                ? config.match_on
                                : ['first_name', 'last_name', 'date_of_birth']
                            const matchValue = (config?.match_value ?? 'YES') as string
                            const noMatchValue = (config?.no_match_value ?? 'NO') as string

                            const normalize = (s?: string) => {
                                if (!s) return ''
                                let v = s
                                if (config?.normalize_spaces) v = v.replace(/\s+/g, ' ').trim()
                                if (config?.case_insensitive) v = v.toLowerCase()
                                return v
                            }
                            const pFirst = normalize(participant.first_name)
                            const pLast = normalize(participant.last_name)
                            const pDob = normalize(participant.date_of_birth)
                            console.log('🧾 NORMALIZED PARTICIPANT', { pFirst, pLast, pDob, matchFields })

                            const { data: targetBookingIds } = await supabase
                                .from('bookings')
                                .select('id')
                                .eq('event_id', targetEventId)
                            const bookingIds = (targetBookingIds || []).map((b: { id: string }) => b.id)
                            console.log('🎯 TARGET EVENT BOOKINGS', { targetEventId, bookingCount: bookingIds.length })

                            const { data: targetParticipants } = await supabase
                                .from('participants')
                                .select('first_name,last_name,date_of_birth')
                                .in('booking_id', bookingIds)
                            console.log('🎯 TARGET PARTICIPANTS', { count: targetParticipants?.length || 0 })
                            if (!targetParticipants || targetParticipants.length === 0) {
                                console.log('ℹ️ No target participants found, assigning no_match_value')
                                newCustomData[field.name] = noMatchValue
                                continue
                            }

                            let isMatch = false
                            for (const tp of targetParticipants as Array<{ first_name?: string; last_name?: string; date_of_birth?: string }>) {
                                const tFirst = normalize(tp.first_name)
                                const tLast = normalize(tp.last_name)
                                const tDob = normalize(tp.date_of_birth)
                                const checks: Record<string, boolean> = {
                                    first_name: Boolean(pFirst) && Boolean(tFirst) && pFirst === tFirst,
                                    last_name: Boolean(pLast) && Boolean(tLast) && pLast === tLast,
                                    date_of_birth: Boolean(pDob) && Boolean(tDob) && pDob === tDob,
                                }
                                const keyList = matchFields.filter((k): k is 'first_name' | 'last_name' | 'date_of_birth' => (
                                    k === 'first_name' || k === 'last_name' || k === 'date_of_birth'
                                ))
                                isMatch = keyList.every((k) => checks[k])
                                if (isMatch) {
                                    console.log('✅ MATCH FOUND', { keyList, checks })
                                    break
                                }
                            }

                            newCustomData[field.name] = isMatch ? matchValue : noMatchValue
                            console.log('📝 FIELD RESULT', { fieldName: field.name, value: newCustomData[field.name] })
                        }

                        const { error: updateParticipantError } = await supabase
                            .from('participants')
                            .update({ custom_data: newCustomData })
                            .eq('id', participant.id)
                        if (updateParticipantError) {
                            console.error('❌ Failed updating participant custom_data', { participantId: participant.id, error: updateParticipantError })
                        } else {
                            console.log('💾 Participant custom_data updated', { participantId: participant.id })
                        }
                    }
                } else {
                    console.log('ℹ️ No participants found for booking to compute')
                }
            } else {
                console.log('ℹ️ No computed_membership_lookup fields found on event')
            }
        }
    } catch (computeErr) {
        console.error('Error computing membership lookup fields:', computeErr)
    }
}