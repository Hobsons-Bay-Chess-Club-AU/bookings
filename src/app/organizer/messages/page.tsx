import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import { Conversation } from '@/lib/types/database'
import MessagesClient from './messages-client'

async function getOrganizerConversations(organizerId: string): Promise<Conversation[]> {
    const supabase = await createClient()

    const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
            *,
            user:profiles!conversations_user_id_fkey(id, full_name, email, avatar_url),
            organizer:profiles!conversations_organizer_id_fkey(id, full_name, email, avatar_url),
            event:events(id, title, alias, image_url),
            booking:bookings(id, booking_id)
        `)
        .eq('organizer_id', organizerId)
        .order('last_message_at', { ascending: false })

    if (error) {
        console.error('Error fetching conversations:', error)
        return []
    }

    // Get unread counts for each conversation
    const conversationsWithUnreadCount = await Promise.all(
        (conversations || []).map(async (conversation) => {
            const { data: unreadMessages } = await supabase
                .from('messages')
                .select('id')
                .eq('conversation_id', conversation.id)
                .eq('recipient_id', organizerId)
                .eq('is_read', false)

            return {
                ...conversation,
                unread_count: unreadMessages?.length || 0
            }
        })
    )

    return conversationsWithUnreadCount
}

export default async function MessagesPage() {
    const profile = await getCurrentProfile()

    if (!profile) {
        redirect('/auth/login')
    }

    if (profile.role !== 'organizer' && profile.role !== 'admin') {
        redirect('/unauthorized')
    }

    const conversations = await getOrganizerConversations(profile.id)

    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage conversations with event participants
                </p>
            </div>

            <MessagesClient conversations={conversations} profile={profile} />
        </>
    )
} 