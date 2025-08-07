'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, Conversation, Profile, Event } from '@/lib/types/database'
import { HiChatBubbleLeftRight, HiXMark, HiPaperAirplane, HiUser } from 'react-icons/hi2'
import LoadingSpinner from '@/components/ui/loading-spinner'

interface ChatWidgetProps {
    event?: Event
    organizer?: Profile
    bookingId?: string
    onClose?: () => void
}

export default function ChatWidget({ event, organizer, bookingId, onClose }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [profile, setProfile] = useState<Profile | null>(null)
    const [profileLoading, setProfileLoading] = useState(true)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        const getProfile = async () => {
            setProfileLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                setProfile(profile)
            } else {
                setProfile(null)
            }
            setProfileLoading(false)
        }
        getProfile()
    }, [supabase])

    const checkForConversations = useCallback(async (userProfile: Profile) => {
        try {
            const response = await fetch('/api/messages')
            const data = await response.json()

            if (response.ok) {
                const existingConversation = data.conversations?.find((conv: Conversation) => 
                    conv.user_id === userProfile.id && 
                    conv.organizer_id === organizer?.id &&
                    conv.event_id === event?.id
                )

                if (existingConversation) {
                    setConversation(existingConversation)
                }
            }
        } catch (err) {
            console.error('Error checking conversations:', err)
        }
    }, [organizer, event])

    // Effect to load conversations when chat opens and profile is available
    useEffect(() => {
        if (isOpen && profile && organizer && !profileLoading) {
            checkForConversations(profile)
        }
    }, [isOpen, profile, organizer, profileLoading, checkForConversations])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const loadMessages = useCallback(async () => {
        if (!conversation?.id) return

        setLoading(true)
        try {
            const response = await fetch(`/api/messages?conversation_id=${conversation.id}`)
            const data = await response.json()

            if (response.ok) {
                setMessages(data.messages || [])
            } else {
                setError(data.error || 'Failed to load messages')
            }
        } catch {
            setError('Failed to load messages')
        } finally {
            setLoading(false)
        }
    }, [conversation])

    const sendMessage = async () => {
        
        if (!newMessage.trim() || !profile || !organizer) {
            return
        }

        setSending(true)
        setError('')

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient_id: organizer.id,
                    content: newMessage.trim(),
                    event_id: event?.id,
                    booking_id: bookingId,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                setNewMessage('')
                if (!conversation) {
                    // New conversation created - create a minimal conversation object
                    const newConversation = {
                        id: data.message.conversation_id,
                        user_id: profile.id,
                        organizer_id: organizer.id,
                        event_id: event?.id,
                        booking_id: bookingId,
                        subject: `Chat about ${event?.title || 'event'}`,
                        last_message_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                    setConversation(newConversation)
                }
                setMessages(prev => [...prev, data.message])
            } else {
                setError(data.error || 'Failed to send message')
            }
        } catch {
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

    const openChat = async () => {
        if (!profile || !organizer) {
            setIsOpen(true)
            setIsMinimized(false)
            return
        }

        setIsOpen(true)
        setIsMinimized(false)
        setSending(false) // Reset sending state
    }

    const closeChat = () => {
        setIsOpen(false)
        setConversation(null)
        setMessages([])
        setNewMessage('')
        setError('')
        // setShowLoginPrompt(false) // Removed as per edit hint
        onClose?.()
    }

    const handleLogin = () => {
        window.location.href = '/auth/login?redirectTo=' + encodeURIComponent(window.location.pathname)
    }

    useEffect(() => {
        if (conversation && isOpen) {
            loadMessages()
        }
    }, [conversation, isOpen, loadMessages])

    if (!organizer) return null

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            {/* Chat Button - Always visible */}
            {!isOpen && (
                <button
                    type="button"
                    onClick={openChat}
                    data-chat-widget-button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
                    title="Chat with organizer"
                >
                    <HiChatBubbleLeftRight className="h-6 w-6" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 h-96 flex flex-col relative"
                    style={{ zIndex: 10000 }}
                >
                    {/* Header */}
                    <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <HiUser className="h-5 w-5" />
                            <div>
                                <h3 className="font-medium">Chat with Organizer</h3>
                                <p className="text-sm text-indigo-100">
                                    {organizer.full_name || organizer.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setIsMinimized(!isMinimized)
                                }}
                                className="text-indigo-100 hover:text-white"
                            >
                                {isMinimized ? '□' : '−'}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    closeChat()
                                }}
                                className="text-indigo-100 hover:text-white"
                            >
                                <HiXMark className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Content */}
                    {!isMinimized && (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loading ? (
                                    <div className="flex justify-center">
                                        <LoadingSpinner size="sm" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                                        {profile ? 'No messages yet. Start the conversation!' : 'Please log in to start chatting'}
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                                                    message.sender_id === profile?.id
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                                }`}
                                            >
                                                <p>{message.content}</p>
                                                <p className={`text-xs mt-1 ${
                                                    message.sender_id === profile?.id
                                                        ? 'text-indigo-100'
                                                        : 'text-gray-500 dark:text-gray-400'
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
                                <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Message Input */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 relative" style={{ zIndex: 10001 }}>
                                {profileLoading ? (
                                    <div className="text-center">
                                        <LoadingSpinner size="sm" text="Loading..." />
                                    </div>
                                ) : !profile ? (
                                    <div className="text-center">
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">Please log in to chat with the organizer</p>
                                        <button
                                            type="button"
                                            onClick={handleLogin}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                                        >
                                            Log In
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex space-x-2 relative" style={{ zIndex: 10002 }}>
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => {
                                                    setNewMessage(e.target.value)
                                                }}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Type your message..."
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                                                disabled={sending}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim() || sending}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {sending ? (
                                                <LoadingSpinner size="sm" />
                                            ) : (
                                                <HiPaperAirplane className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
} 