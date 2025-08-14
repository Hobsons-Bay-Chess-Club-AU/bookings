'use client'

import { useState, useEffect, useCallback } from 'react'

import { Event, Booking, Participant, Profile } from '@/lib/types/database'
import { 
    HiMagnifyingGlass, 
    HiEye, 
    HiPaperAirplane, 
    HiClock,
    HiUsers,
    HiEnvelope,
    HiDocumentText,
    HiCalendar,
    HiXMark
} from 'react-icons/hi2'

interface EmailRecipient {
    email: string
    name: string
    type: 'user' | 'participant' | 'mailing_list'
    source: string
}

interface EmailTemplate {
    id: string
    name: string
    subject: string
    content: string
    variables: string[]
}

interface ContextData {
    event?: Event
    booking?: Booking & { event?: Event; user?: Profile }
    participant?: Participant & { booking?: Booking & { event?: Event } }
    user?: Profile
    mailingList?: { count: number }
}

const PREDEFINED_TEMPLATES: EmailTemplate[] = [
    {
        id: 'event-reminder',
        name: 'Event Reminder',
        subject: 'Reminder: {{eventName}} is coming up!',
        content: `Dear {{recipientName}},

This is a friendly reminder that {{eventName}} is scheduled for {{eventDate}} at {{eventLocation}}.

Please make sure to arrive on time and bring any required materials.

Best regards,
{{organizerName}}`,
        variables: ['recipientName', 'eventName', 'eventDate', 'eventLocation', 'organizerName']
    },
    {
        id: 'event-update',
        name: 'Event Update',
        subject: 'Important Update: {{eventName}}',
        content: `Dear {{recipientName}},

We have an important update regarding {{eventName}}.

{{customMessage}}

If you have any questions, please don't hesitate to contact us.

Best regards,
{{organizerName}}`,
        variables: ['recipientName', 'eventName', 'customMessage', 'organizerName']
    },
    {
        id: 'custom-message',
        name: 'Custom Message',
        subject: 'Message from {{organizerName}}',
        content: `Dear {{recipientName}},

{{customMessage}}

Best regards,
{{organizerName}}`,
        variables: ['recipientName', 'customMessage', 'organizerName']
    },
    {
        id: 'payment-reminder',
        name: 'Payment Reminder',
        subject: 'Payment Required: {{eventName}}',
        content: `Dear {{recipientName}},

This is a reminder that payment is still required for your booking for {{eventName}}.

Event Details:
- Date: {{eventDate}}
- Location: {{eventLocation}}
- Amount Due: $\{{amountDue}}

Please complete your payment as soon as possible to secure your spot.

Best regards,
{{organizerName}}`,
        variables: ['recipientName', 'eventName', 'eventDate', 'eventLocation', 'amountDue', 'organizerName']
    }
]

export default function EmailManagerClient() {
    const [searchInput, setSearchInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [contextData, setContextData] = useState<ContextData>({})
    const [recipients, setRecipients] = useState<EmailRecipient[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
    const [customSubject, setCustomSubject] = useState('')
    const [customMessage, setCustomMessage] = useState('')
    const [showPreview, setShowPreview] = useState(false)
    const [scheduledDate, setScheduledDate] = useState('')
    const [attachments, setAttachments] = useState<File[]>([])
    const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now')
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | null
        message: string
    }>({ type: null, message: '' })
    const [urlParamsProcessed, setUrlParamsProcessed] = useState(false)





    // Debug logging for button state
    useEffect(() => {
        const buttonDisabled = isLoading || !recipients.length || !customSubject.trim() || !customMessage.trim()
        console.log('Send Email Button Debug:', {
            isLoading,
            'recipients.length': recipients.length,
            recipients: recipients,
            'customSubject.trim()': customSubject.trim(),
            'customMessage.trim()': customMessage.trim(),
            buttonDisabled,
            customSubject,
            customMessage
        })
    }, [isLoading, recipients, customSubject, customMessage])

    const detectContextWithKey = useCallback(async (contextKey: string, contextValue: string) => {
        console.log('detectContextWithKey called:', { contextKey, contextValue })
        
        if (!contextValue.trim()) {
            console.log('Empty context value, clearing context and recipients')
            setContextData({})
            setRecipients([])
            return
        }

        console.log('Starting direct context detection for:', contextKey, contextValue.trim())
        setIsLoading(true)
        try {
            const response = await fetch('/api/organizer/email-context', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    contextKey, 
                    contextValue: contextValue.trim() 
                }),
            })

            console.log('API response status:', response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('API response error:', errorText)
                throw new Error(`HTTP ${response.status}: ${errorText}`)
            }

            const result = await response.json()
            console.log('API response result:', result)
            
            if (result.success) {
                console.log('Setting context:', result.context)
                console.log('Setting recipients:', result.recipients)
                setContextData(result.context || {})
                setRecipients(result.recipients || [])
            } else {
                console.error('Error from email-context API:', result.error)
                setContextData({})
                setRecipients([])
            }
        } catch (error) {
            console.error('Error detecting context:', error)
            setContextData({})
            setRecipients([])
        } finally {
            console.log('Setting isLoading to false')
            setIsLoading(false)
        }
    }, [])

    const loadMailingListRecipients = useCallback(async () => {
        console.log('Loading mailing list recipients')
        setIsLoading(true)
        try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            
            const { data: mailingList, error } = await supabase
                .from('mailing_list')
                .select('*')
                .eq('status', 'subscribed')
                .order('email', { ascending: true })

            if (error) {
                console.error('Failed to load mailing list:', error)
                setNotification({ type: 'error', message: 'Failed to load mailing list subscribers' })
                return
            }

            // Convert mailing list to recipients format
            const mailingListRecipients: EmailRecipient[] = mailingList?.map(subscriber => ({
                email: subscriber.email,
                name: subscriber.email,
                type: 'mailing_list',
                source: 'Mailing List Subscriber'
            })) || []

            console.log(`Loaded ${mailingListRecipients.length} mailing list recipients`)
            
            setContextData({ mailingList: { count: mailingListRecipients.length } })
            setRecipients(mailingListRecipients)
            
            // Pre-fill subject for marketing email
            if (!customSubject) {
                setCustomSubject('Marketing Update from HBCC')
            }
            
        } catch (error) {
            console.error('Error loading mailing list:', error)
            setNotification({ type: 'error', message: 'Failed to load mailing list subscribers' })
        } finally {
            setIsLoading(false)
        }
    }, [customSubject])

    // Handle URL parameters for pre-filling context
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const eventId = urlParams.get('eventId')
        const bookingId = urlParams.get('bookingId')
        const participantId = urlParams.get('participantId')
        const mailinglist = urlParams.get('mailinglist')

        console.log('Email Manager URL params:', { eventId, bookingId, participantId, mailinglist })

        if (eventId) {
            setSearchInput(eventId)
            setUrlParamsProcessed(true)
            // Trigger context detection with specific context key
            detectContextWithKey('eventId', eventId)
        } else if (bookingId) {
            setSearchInput(bookingId)
            setUrlParamsProcessed(true)
            // Trigger context detection with specific context key
            detectContextWithKey('bookingId', bookingId)
        } else if (participantId) {
            setSearchInput(participantId)
            setUrlParamsProcessed(true)
            // Trigger context detection with specific context key
            detectContextWithKey('participantId', participantId)
        } else if (mailinglist === 'true') {
            setSearchInput('Mailing List')
            setUrlParamsProcessed(true)
            // Load mailing list recipients
            loadMailingListRecipients()
        } else {
            setUrlParamsProcessed(true)
        }
    }, [detectContextWithKey, loadMailingListRecipients])

    const detectContext = useCallback(async (input: string) => {
        console.log('detectContext called with input:', input)
        
        if (!input.trim()) {
            console.log('Empty input, clearing context and recipients')
            setContextData({})
            setRecipients([])
            return
        }

        console.log('Starting fallback context detection for:', input.trim())
        setIsLoading(true)
        try {
            const response = await fetch('/api/organizer/email-context', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input: input.trim() }),
            })

            console.log('API response status:', response.status)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('API response error:', errorText)
                throw new Error(`HTTP ${response.status}: ${errorText}`)
            }

            const result = await response.json()
            console.log('API response result:', result)
            
            if (result.success) {
                console.log('Setting context:', result.context)
                console.log('Setting recipients:', result.recipients)
                setContextData(result.context || {})
                setRecipients(result.recipients || [])
            } else {
                console.error('Error from email-context API:', result.error)
                setContextData({})
                setRecipients([])
            }
        } catch (error) {
            console.error('Error detecting context:', error)
            setContextData({})
            setRecipients([])
        } finally {
            console.log('Setting isLoading to false')
            setIsLoading(false)
        }
    }, [])



    const selectTemplate = (template: EmailTemplate) => {
        setSelectedTemplate(template)
        setCustomSubject(template.subject)
        setCustomMessage(template.content)
    }

    const generatePreview = () => {
        const event = contextData.event || contextData.booking?.event || contextData.participant?.booking?.event
        const organizer = event?.organizer || { full_name: 'Event Organizer' }
        
        let subject = customSubject
        let content = customMessage

        // Replace variables
        const variables = {
            recipientName: recipients[0]?.name || 'Recipient',
            eventName: event?.title || 'Event',
            eventDate: event?.start_date ? new Date(event.start_date).toLocaleDateString() : 'Event Date',
            eventLocation: event?.location || 'Event Location',
            organizerName: organizer.full_name || 'Event Organizer',
            customMessage: customMessage.includes('{{customMessage}}') ? 'Your custom message here...' : '',
            amountDue: contextData.booking?.total_amount?.toString() || '0.00'
        }

        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`
            subject = subject.replace(new RegExp(placeholder, 'g'), value)
            content = content.replace(new RegExp(placeholder, 'g'), value)
        })

        return { subject, content }
    }

    const handleSendEmail = async () => {
        // Clear any previous notifications
        setNotification({ type: null, message: '' })

        if (!recipients.length) {
            setNotification({ type: 'error', message: 'No recipients found' })
            return
        }

        if (!customSubject.trim() || !customMessage.trim()) {
            setNotification({ type: 'error', message: 'Subject and message are required' })
            return
        }

        if (sendMode === 'schedule' && !scheduledDate) {
            setNotification({ type: 'error', message: 'Please select a scheduled date' })
            return
        }

        try {
            setIsLoading(true)
            
            // Upload file attachments to blob storage
            const processedAttachments = await Promise.all(
                attachments.map(async (file) => {
                    try {
                        console.log('Uploading attachment to blob storage:', file.name)
                        
                        // Use Vercel Blob upload directly
                        const { upload } = await import('@vercel/blob/client')
                        
                        const blob = await upload(file.name, file, {
                            access: 'public',
                            handleUploadUrl: '/api/organizer/upload-attachment'
                        })
                        
                        console.log('Attachment uploaded successfully:', blob)

                        return {
                            filename: file.name,
                            blobUrl: blob.url,
                            contentType: file.type || 'application/octet-stream'
                        }
                    } catch (error) {
                        console.error('Failed to upload attachment:', file.name, error)
                        throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    }
                })
            )
            
            const response = await fetch('/api/organizer/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipients: recipients.map(r => r.email),
                    subject: customSubject,
                    message: customMessage,
                    context: contextData,
                    scheduledDate: sendMode === 'schedule' ? scheduledDate : null,
                    attachments: processedAttachments
                })
            })

            const result = await response.json()

            if (result.success) {
                setNotification({ 
                    type: 'success', 
                    message: `Email ${sendMode === 'schedule' ? 'scheduled' : 'sent'} successfully to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}!` 
                })
                
                // Reset form after a delay to show the success message
                setTimeout(() => {
                    setSearchInput('')
                    setContextData({})
                    setRecipients([])
                    setSelectedTemplate(null)
                    setCustomSubject('')
                    setCustomMessage('')
                    setScheduledDate('')
                    setAttachments([])
                    setNotification({ type: null, message: '' })
                }, 3000) // Clear notification and form after 3 seconds
            } else {
                setNotification({ 
                    type: 'error', 
                    message: `Failed to ${sendMode === 'schedule' ? 'schedule' : 'send'} email: ${result.error}` 
                })
            }
        } catch (error) {
            console.error('Error sending email:', error)
            setNotification({ 
                type: 'error', 
                message: 'An error occurred while sending the email. Please try again.' 
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || [])
        setAttachments(prev => [...prev, ...files])
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    useEffect(() => {
        console.log('searchInput changed to:', searchInput, 'urlParamsProcessed:', urlParamsProcessed)
        
        // Only trigger auto-detection for manual input (after URL params have been processed)
        // and when there's actual input to detect
        if (!urlParamsProcessed || !searchInput.trim()) {
            return
        }
        
        // Skip if this input was just set from URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const urlValue = urlParams.get('eventId') || urlParams.get('bookingId') || urlParams.get('participantId')
        const mailinglist = urlParams.get('mailinglist')
        
        if (searchInput === urlValue) {
            console.log('Skipping auto-detection for URL parameter value:', searchInput)
            return
        }
        
        // Skip auto-detection for mailing list mode
        if (mailinglist === 'true' && searchInput === 'Mailing List') {
            console.log('Skipping auto-detection for mailing list mode')
            return
        }
        
        const timeoutId = setTimeout(() => {
            console.log('Triggering detectContext after 500ms delay for manual input:', searchInput)
            detectContext(searchInput)
        }, 500)

        return () => {
            console.log('Clearing timeout for searchInput:', searchInput)
            clearTimeout(timeoutId)
        }
    }, [searchInput, detectContext, urlParamsProcessed])

    const preview = generatePreview()

    return (
        <div className="space-y-8">
            {/* Notification */}
            {notification.type && (
                <div className={`p-4 rounded-lg border ${
                    notification.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' 
                        : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                } flex items-center gap-3`}>
                    {notification.type === 'success' ? (
                        <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    )}
                    <span className="flex-1">{notification.message}</span>
                    <button
                        onClick={() => setNotification({ type: null, message: '' })}
                        className="text-current hover:opacity-70 transition-opacity"
                    >
                        <HiXMark className="h-5 w-5" />
                    </button>
                </div>
            )}

            {/* Context Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <HiMagnifyingGlass className="h-5 w-5" />
                    Context Search
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Enter Event ID, Booking ID, Participant ID, or Email Address
                        </label>
                        <div className="relative">
                            <input
                                id="search"
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="e.g., event-123, booking-456, participant-789, user@example.com"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                disabled={isLoading}
                            />
                            {isLoading && (
                                <div className="absolute right-3 top-2.5">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Context Display */}
                    {Object.keys(contextData).length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Context Detected</h3>
                            {contextData.event && (
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <div className="font-medium">Event: {contextData.event.title}</div>
                                    <div>Date: {new Date(contextData.event.start_date).toLocaleDateString()}</div>
                                    <div>Location: {contextData.event.location}</div>
                                </div>
                            )}
                            {contextData.booking && (
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <div className="font-medium">Booking: {contextData.booking.booking_id || contextData.booking.id}</div>
                                    <div>Event: {contextData.booking.event?.title}</div>
                                    <div>User: {contextData.booking.user?.full_name || contextData.booking.user?.email}</div>
                                </div>
                            )}
                            {contextData.participant && (
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <div className="font-medium">Participant: {contextData.participant.first_name} {contextData.participant.last_name}</div>
                                    <div>Event: {contextData.participant.booking?.event?.title}</div>
                                </div>
                            )}
                            {contextData.user && (
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <div className="font-medium">User: {contextData.user.full_name || contextData.user.email}</div>
                                </div>
                            )}
                            {contextData.mailingList && (
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <div className="font-medium">Mailing List</div>
                                    <div>{contextData.mailingList.count} active subscribers</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recipients */}
                    {recipients.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <h3 className="font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                                <HiUsers className="h-4 w-4" />
                                Recipients ({recipients.length})
                            </h3>
                            <div className="space-y-2">
                                {recipients.slice(0, 5).map((recipient, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm text-green-800 dark:text-green-200">
                                        <div>
                                            <span className="font-medium">{recipient.name}</span>
                                            <span className="text-green-600 dark:text-green-400 ml-2">({recipient.email})</span>
                                        </div>
                                        <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded">
                                            {recipient.source}
                                        </span>
                                    </div>
                                ))}
                                {recipients.length > 5 && (
                                    <div className="text-sm text-green-600 dark:text-green-400">
                                        ... and {recipients.length - 5} more recipients
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Template Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <HiDocumentText className="h-5 w-5" />
                    Email Template
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {PREDEFINED_TEMPLATES.map((template) => (
                        <button
                            key={template.id}
                            onClick={() => selectTemplate(template)}
                            className={`p-4 text-left border rounded-lg transition-colors ${
                                selectedTemplate?.id === template.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                        >
                            <div className="font-medium text-gray-900 dark:text-gray-100">{template.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.subject}</div>
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Subject
                        </label>
                        <input
                            id="subject"
                            type="text"
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder="Email subject"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Message
                        </label>
                        <textarea
                            id="message"
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="Email message"
                            rows={8}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        {selectedTemplate && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Available variables: {selectedTemplate.variables.map(v => `{{${v}}}`).join(', ')}
                            </div>
                        )}
                    </div>

                    {/* File Attachments */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Attachments
                        </label>
                        <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        {attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded text-sm">
                                        <span>{file.name}</span>
                                        <button
                                            onClick={() => removeAttachment(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <HiXMark className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Send Options */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <HiEnvelope className="h-5 w-5" />
                    Send Options
                </h2>
                
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="sendMode"
                                value="now"
                                checked={sendMode === 'now'}
                                onChange={(e) => setSendMode(e.target.value as 'now' | 'schedule')}
                                className="mr-2"
                            />
                            <HiPaperAirplane className="h-4 w-4 mr-1" />
                            Send Now
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="sendMode"
                                value="schedule"
                                checked={sendMode === 'schedule'}
                                onChange={(e) => setSendMode(e.target.value as 'now' | 'schedule')}
                                className="mr-2"
                            />
                            <HiClock className="h-4 w-4 mr-1" />
                            Schedule for Later
                        </label>
                    </div>

                    {sendMode === 'schedule' && (
                        <div>
                            <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Scheduled Date & Time
                            </label>
                            <input
                                id="scheduledDate"
                                type="datetime-local"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                            />
                        </div>
                    )}

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <HiEye className="h-4 w-4" />
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>

                        <button
                            onClick={handleSendEmail}
                            disabled={isLoading || !recipients.length || !customSubject.trim() || !customMessage.trim()}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : sendMode === 'schedule' ? (
                                <HiCalendar className="h-4 w-4" />
                            ) : (
                                <HiPaperAirplane className="h-4 w-4" />
                            )}
                            {isLoading 
                                ? 'Processing...' 
                                : sendMode === 'schedule' 
                                    ? 'Schedule Email' 
                                    : 'Send Email'
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview */}
            {showPreview && (customSubject || customMessage) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <HiEye className="h-5 w-5" />
                        Email Preview
                    </h2>
                    
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                            <div className="text-sm">
                                <div className="font-medium text-gray-900 dark:text-gray-100">Subject: {preview.subject}</div>
                                <div className="text-gray-600 dark:text-gray-400 mt-1">
                                    To: {recipients.length > 0 ? recipients[0].email : 'recipient@example.com'}
                                    {recipients.length > 1 && ` and ${recipients.length - 1} others`}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-800">
                            <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                                {preview.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
