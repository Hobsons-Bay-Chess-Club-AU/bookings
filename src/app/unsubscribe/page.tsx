'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
    HiXMark, 
    HiCheck, 
    HiExclamationTriangle, 
    HiLockClosed 
} from 'react-icons/hi2'

function UnsubscribePageContent() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [showReasonForm, setShowReasonForm] = useState(false)
    const [subscriberEmail, setSubscriberEmail] = useState('')
    const [unsubscribeReason, setUnsubscribeReason] = useState('')
    const searchParams = useSearchParams()
    const supabase = createClient()

    useEffect(() => {
        const verifyUnsubscribeRequest = async () => {
            try {
                const token = searchParams.get('token')
                const email = searchParams.get('email')

                if (!token || !email) {
                    setError('Invalid unsubscribe link. Please check your email and try again.')
                    setLoading(false)
                    return
                }

                // Verify the token and get subscriber info
                const { data, error: verifyError } = await supabase
                    .from('mailing_list_subscribers')
                    .select('*')
                    .eq('email', email)
                    .eq('unsubscribe_token', token)
                    .single()

                if (verifyError || !data) {
                    setError('Invalid or expired unsubscribe link. Please check your email and try again.')
                    setLoading(false)
                    return
                }

                setSubscriberEmail(email)
                setShowReasonForm(true)
                setLoading(false)
            } catch (err) {
                console.error('Error verifying unsubscribe request:', err)
                setError('An error occurred while processing your request. Please try again.')
                setLoading(false)
            }
        }

        verifyUnsubscribeRequest()
    }, [searchParams, supabase])

    const handleUnsubscribe = async () => {
        setLoading(true)
        try {
            const token = searchParams.get('token')
            const email = searchParams.get('email')

            // Update the subscriber record
            const { error: updateError } = await supabase
                .from('mailing_list_subscribers')
                .update({
                    is_subscribed: false,
                    unsubscribed_at: new Date().toISOString(),
                    unsubscribe_reason: unsubscribeReason || null
                })
                .eq('email', email)
                .eq('unsubscribe_token', token)

            if (updateError) {
                throw updateError
            }

            setSuccess(true)
            setShowReasonForm(false)
        } catch (err) {
            console.error('Error unsubscribing:', err)
            setError('An error occurred while unsubscribing. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleResubscribe = async () => {
        setLoading(true)
        try {
            const token = searchParams.get('token')
            const email = searchParams.get('email')

            // Update the subscriber record
            const { error: updateError } = await supabase
                .from('mailing_list_subscribers')
                .update({
                    is_subscribed: true,
                    unsubscribed_at: null,
                    unsubscribe_reason: null
                })
                .eq('email', email)
                .eq('unsubscribe_token', token)

            if (updateError) {
                throw updateError
            }

            setSuccess(false)
            setShowReasonForm(true)
        } catch (err) {
            console.error('Error resubscribing:', err)
            setError('An error occurred while resubscribing. Please try again.')
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
                        <p className="mt-4 text-gray-600">Loading...</p>
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
                            <HiXMark className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Error</h3>
                        <p className="mt-2 text-sm text-gray-600">{error}</p>
                        <div className="mt-6">
                            <Link
                                href="/"
                                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                            >
                                Return to homepage
                            </Link>
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
                            <HiCheck className="h-6 w-6 text-green-600" />
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
                            <Link
                                href="/"
                                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-center"
                            >
                                Return to homepage
                            </Link>
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
                            <HiExclamationTriangle className="h-6 w-6 text-yellow-600" />
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
                            <Link
                                href="/"
                                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-center"
                            >
                                Cancel
                            </Link>
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
                        <HiLockClosed className="h-6 w-6 text-gray-600" />
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

function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        </div>
    )
}

export default function UnsubscribePage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <UnsubscribePageContent />
        </Suspense>
    )
} 