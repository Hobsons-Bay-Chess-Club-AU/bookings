'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

export default function UnsubscribePage() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [subscriberEmail, setSubscriberEmail] = useState('')
    const [unsubscribeReason, setUnsubscribeReason] = useState('')
    const [showReasonForm, setShowReasonForm] = useState(false)
    
    const searchParams = useSearchParams()
    const unsubscribeCode = searchParams.get('code')
    const supabase = createClient()

    useEffect(() => {
        if (unsubscribeCode) {
            verifyUnsubscribeCode()
        }
    }, [unsubscribeCode])

    const verifyUnsubscribeCode = async () => {
        if (!unsubscribeCode) return

        setLoading(true)
        setError('')

        try {
            const { data: subscriber, error } = await supabase
                .from('mailing_list')
                .select('email, status')
                .eq('unsubscribe_code', unsubscribeCode)
                .single()

            if (error || !subscriber) {
                setError('Invalid or expired unsubscribe link')
                return
            }

            if (subscriber.status === 'unsubscribed') {
                setSuccess(true)
                setSubscriberEmail(subscriber.email)
                return
            }

            setSubscriberEmail(subscriber.email)
            setShowReasonForm(true)
        } catch (err) {
            setError('An error occurred while verifying your unsubscribe request')
        } finally {
            setLoading(false)
        }
    }

    const handleUnsubscribe = async () => {
        if (!unsubscribeCode) return

        setLoading(true)
        setError('')

        try {
            const { error } = await supabase
                .from('mailing_list')
                .update({
                    status: 'unsubscribed',
                    unsubscribe_reason: unsubscribeReason || null,
                    updated_at: new Date().toISOString()
                })
                .eq('unsubscribe_code', unsubscribeCode)

            if (error) {
                setError('Failed to unsubscribe: ' + error.message)
            } else {
                setSuccess(true)
                setShowReasonForm(false)
            }
        } catch (err) {
            setError('An error occurred while processing your unsubscribe request')
        } finally {
            setLoading(false)
        }
    }

    const handleResubscribe = async () => {
        if (!unsubscribeCode) return

        setLoading(true)
        setError('')

        try {
            const { error } = await supabase
                .from('mailing_list')
                .update({
                    status: 'subscribed',
                    unsubscribe_reason: null,
                    updated_at: new Date().toISOString()
                })
                .eq('unsubscribe_code', unsubscribeCode)

            if (error) {
                setError('Failed to resubscribe: ' + error.message)
            } else {
                setSuccess(false)
                setShowReasonForm(true)
            }
        } catch (err) {
            setError('An error occurred while processing your resubscribe request')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Processing your request...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Error</h3>
                        <p className="mt-2 text-sm text-gray-600">{error}</p>
                        <div className="mt-6">
                            <a
                                href="/"
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                Return to homepage
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Successfully Unsubscribed</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            {subscriberEmail} has been removed from our mailing list.
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                            You will no longer receive marketing emails from us.
                        </p>
                        <div className="mt-6 space-y-3">
                            <button
                                onClick={handleResubscribe}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Resubscribe'}
                            </button>
                            <a
                                href="/"
                                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-center"
                            >
                                Return to homepage
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (showReasonForm) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Unsubscribe Confirmation</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to unsubscribe {subscriberEmail} from our mailing list?
                        </p>
                        
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-gray-700 text-left mb-2">
                                Reason for unsubscribing (optional)
                            </label>
                            <textarea
                                value={unsubscribeReason}
                                onChange={(e) => setUnsubscribeReason(e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Please let us know why you're unsubscribing..."
                            />
                        </div>

                        <div className="mt-6 space-y-3">
                            <button
                                onClick={handleUnsubscribe}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Unsubscribe'}
                            </button>
                            <a
                                href="/"
                                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-center"
                            >
                                Cancel
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                        <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Unsubscribe</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Please wait while we verify your unsubscribe request...
                    </p>
                </div>
            </div>
        </div>
    )
} 