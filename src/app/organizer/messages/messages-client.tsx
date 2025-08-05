'use client'

import { useState, useEffect, useRef } from 'react'
import { Conversation, Message, Profile } from '@/lib/types/database'
import { HiChatBubbleLeftRight, HiUser, HiCalendarDays, HiMapPin, HiPaperAirplane } from 'react-icons/hi2'
import LoadingSpinner from '@/components/ui/loading-spinner'
import Link from 'next/link'

interface MessagesClientProps {
    conversations: Conversation[]
    profile: Profile
}

export default function MessagesClient({ conversations, profile }: MessagesClientProps) {
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [conversationsList, setConversationsList] = useState<Conversation[]>(conversations)

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (selectedConversation) {
            loadMessages()
        }
    }, [selectedConversation])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const loadMessages = async () => {
        if (!selectedConversation) return

        setLoading(true)
        try {
            const response = await fetch(`/api/messages?conversation_id=${selectedConversation.id}`)
            const data = await response.json()

            if (response.ok) {
                setMessages(data.messages || [])
                // Update conversation in list to mark as read
                setConversationsList(prev => 
                    prev.map(conv => 
                        conv.id === selectedConversation.id 
                            ? { ...conv, unread_count: 0 }
                            : conv
                    )
                )
            } else {
                setError('Failed to load messages')
            }
        } catch (err) {
            setError('Failed to load messages')
        } finally {
            setLoading(false)
        }
    }

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return

        setSending(true)
        setError('')

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: selectedConversation.id,
                    recipient_id: selectedConversation.user_id,
                    content: newMessage.trim(),
                    subject: selectedConversation.subject,
                    event_id: selectedConversation.event_id,
                    booking_id: selectedConversation.booking_id
                })
            })

            const data = await response.json()

            if (response.ok) {
                setNewMessage('')
                // Add message to local state
                setMessages(prev => [...prev, data.message])
                // Update conversation timestamp
                setConversationsList(prev => 
                    prev.map(conv => 
                        conv.id === selectedConversation.id 
                            ? { ...conv, last_message_at: new Date().toISOString() }
                            : conv
                    )
                )
            } else {
                setError(data.error || 'Failed to send message')
            }
        } catch (err) {
            setError('Failed to send message')
        } finally {
            setSending(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } else if (diffInHours < 48) {
            return 'Yesterday'
        } else {
            return date.toLocaleDateString()
        }
    }

    const getLastMessage = (conversation: Conversation) => {
        if (!conversation.messages || conversation.messages.length === 0) {
            return 'No messages yet'
        }
        const lastMsg = conversation.messages[conversation.messages.length - 1]
        return lastMsg.content.length > 50 
            ? lastMsg.content.substring(0, 50) + '...' 
            : lastMsg.content
    }

    return (
        <div className="bg-white shadow rounded-lg h-[600px] flex">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                    <p className="text-sm text-gray-500">
                        {conversationsList.length} conversation{conversationsList.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversationsList.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            <HiChatBubbleLeftRight className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        conversationsList.map((conversation) => (
                            <div
                                key={conversation.id}
                                onClick={() => setSelectedConversation(conversation)}
                                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                                    selectedConversation?.id === conversation.id ? 'bg-indigo-50 border-indigo-200' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <HiUser className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {conversation.user?.full_name || conversation.user?.email}
                                            </p>
                                            {(conversation.unread_count || 0) > 0 && (
                                                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                                                    {conversation.unread_count || 0}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {conversation.event && (
                                            <div className="flex items-center space-x-1 mt-1">
                                                <HiCalendarDays className="h-3 w-3 text-gray-400" />
                                                <p className="text-xs text-gray-500 truncate">
                                                    {conversation.event.title}
                                                </p>
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-500 mt-1 truncate">
                                            {getLastMessage(conversation)}
                                        </p>
                                    </div>
                                    
                                    <div className="text-xs text-gray-400 ml-2">
                                        {formatDate(conversation.last_message_at)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedConversation.user?.full_name || selectedConversation.user?.email}
                                    </h3>
                                    {selectedConversation.event && (
                                        <div className="flex items-center space-x-2 mt-1">
                                            <HiCalendarDays className="h-4 w-4 text-gray-400" />
                                            <Link
                                                href={`/events/${selectedConversation.event.id}`}
                                                className="text-sm text-indigo-600 hover:text-indigo-800"
                                            >
                                                {selectedConversation.event.title}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                                {selectedConversation.booking && (
                                    <Link
                                        href={`/organizer/events/${selectedConversation.event_id}/bookings/${selectedConversation.booking.id}`}
                                        className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        View Booking
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {loading ? (
                                <div className="flex justify-center py-4">
                                    <LoadingSpinner size="sm" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <HiChatBubbleLeftRight className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No messages yet</p>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                                                message.sender_id === profile.id
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-200 text-gray-900'
                                            }`}
                                        >
                                            <p>{message.content}</p>
                                            <p className={`text-xs mt-1 ${
                                                message.sender_id === profile.id
                                                    ? 'text-indigo-100'
                                                    : 'text-gray-500'
                                            }`}>
                                                {new Date(message.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="px-4 pb-2">
                                <p className="text-red-500 text-xs">{error}</p>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex space-x-2">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your reply..."
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    rows={2}
                                    disabled={sending}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || sending}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg px-3 py-2 transition-colors"
                                >
                                    {sending ? (
                                        <LoadingSpinner size="sm" />
                                    ) : (
                                        <HiPaperAirplane className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                            <HiChatBubbleLeftRight className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Select a conversation</p>
                            <p className="text-sm">Choose a conversation from the list to start messaging</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
} 