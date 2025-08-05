import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/service'
import OrganizerReplyEmail from '@/lib/email/templates/organizer-reply'
import { render } from '@react-email/render'
import React from 'react'

export async function GET(request: NextRequest) {
    try {
        const profile = await getCurrentProfile()
        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const conversationId = searchParams.get('conversation_id')

        if (conversationId) {
            // Get messages for a specific conversation
            const { data: messages, error } = await supabase
                .from('messages')
                .select(`
                    *,
                    sender:profiles!messages_sender_id_fkey(id, full_name, email, avatar_url),
                    recipient:profiles!messages_recipient_id_fkey(id, full_name, email, avatar_url),
                    event:events(id, title, alias),
                    booking:bookings(id, booking_id)
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error fetching messages:', error)
                return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
            }

            // Mark messages as read if the current user is the recipient
            if (messages && messages.length > 0) {
                await supabase.rpc('mark_messages_as_read', {
                    conversation_uuid: conversationId,
                    reader_id: profile.id
                })
            }

            return NextResponse.json({ messages })
        } else {
            // Get conversations for the current user
            const { data: conversations, error } = await supabase
                .from('conversations')
                .select(`
                    *,
                    user:profiles!conversations_user_id_fkey(id, full_name, email, avatar_url),
                    organizer:profiles!conversations_organizer_id_fkey(id, full_name, email, avatar_url),
                    event:events(id, title, alias, image_url),
                    booking:bookings(id, booking_id)
                `)
                .or(`user_id.eq.${profile.id},organizer_id.eq.${profile.id}`)
                .order('last_message_at', { ascending: false })

            if (error) {
                console.error('Error fetching conversations:', error)
                return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
            }

            // Get unread counts for each conversation
            const conversationsWithUnreadCount = await Promise.all(
                (conversations || []).map(async (conversation) => {
                    const { data: unreadMessages } = await supabase
                        .from('messages')
                        .select('id')
                        .eq('conversation_id', conversation.id)
                        .eq('recipient_id', profile.id)
                        .eq('is_read', false)

                    return {
                        ...conversation,
                        unread_count: unreadMessages?.length || 0
                    }
                })
            )

            return NextResponse.json({ conversations: conversationsWithUnreadCount })
        }
    } catch (error) {
        console.error('Error in messages API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const profile = await getCurrentProfile()
        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { conversation_id, recipient_id, content, subject, event_id, booking_id } = body

        const supabase = await createClient()

        let conversationId = conversation_id

        // If no conversation_id provided, create a new conversation
        if (!conversationId) {
            // Check if conversation already exists
            const { data: existingConversation } = await supabase
                .from('conversations')
                .select('id')
                .eq('user_id', profile.id)
                .eq('organizer_id', recipient_id)
                .eq('event_id', event_id)
                .single()

            if (existingConversation) {
                conversationId = existingConversation.id
            } else {
                // Create new conversation
                const { data: newConversation, error: convError } = await supabase
                    .from('conversations')
                    .insert({
                        user_id: profile.id,
                        organizer_id: recipient_id,
                        event_id,
                        booking_id,
                        subject
                    })
                    .select('id')
                    .single()

                if (convError) {
                    console.error('Error creating conversation:', convError)
                    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
                }

                conversationId = newConversation.id
            }
        }

        // Create the message
        const { data: message, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: profile.id,
                recipient_id,
                content,
                subject,
                event_id,
                booking_id,
                is_organizer_reply: profile.role === 'organizer' || profile.role === 'admin'
            })
            .select(`
                *,
                sender:profiles!messages_sender_id_fkey(id, full_name, email, avatar_url),
                recipient:profiles!messages_recipient_id_fkey(id, full_name, email, avatar_url),
                event:events(id, title, alias),
                booking:bookings(id, booking_id)
            `)
            .single()

        if (error) {
            console.error('Error creating message:', error)
            return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
        }

        // Send email notification if organizer is replying
        if (message.is_organizer_reply && message.recipient) {
            try {
                // Get conversation details
                const { data: conversation } = await supabase
                    .from('conversations')
                    .select(`
                        *,
                        user:profiles!conversations_user_id_fkey(id, full_name, email, avatar_url),
                        organizer:profiles!conversations_organizer_id_fkey(id, full_name, email, avatar_url),
                        event:events(id, title, alias, start_date, location)
                    `)
                    .eq('id', conversationId)
                    .single()

                // Get the original message from the user
                const { data: originalMessage } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .eq('is_organizer_reply', false)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (conversation && conversation.user) {
                    const emailHtml = await render(
                        React.createElement(OrganizerReplyEmail, {
                            message,
                            organizer: profile,
                            event: conversation.event,
                            originalMessage: originalMessage || undefined
                        })
                    )

                    await sendEmail({
                        to: conversation.user.email,
                        subject: `Reply from ${profile.full_name || profile.email} - ${conversation.event?.title || 'Event'}`,
                        html: emailHtml
                    })
                }
            } catch (emailError) {
                console.error('Error sending email notification:', emailError)
                // Don't fail the message creation if email fails
            }
        }

        return NextResponse.json({ message })
    } catch (error) {
        console.error('Error in messages API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 