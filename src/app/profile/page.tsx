'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Profile } from '@/lib/types/database'
import LoadingSpinner from '@/components/ui/loading-spinner'
import ThemeSelector from '@/components/ui/theme-selector'
import ThemePreview from '@/components/ui/theme-preview'
import ConfirmationModal from '@/components/ui/confirmation-modal'
import { HiEnvelope, HiEnvelopeOpen } from 'react-icons/hi2'

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [navigating, setNavigating] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [formData, setFormData] = useState({
        full_name: '',
        avatar_url: ''
    })
    const [mailingListStatus, setMailingListStatus] = useState<{
        isSubscribed: boolean
        status: string
        subscribedAt: string | null
    } | null>(null)
    const [mailingListLoading, setMailingListLoading] = useState(false)
    const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false)
    const [showSubscribeModal, setShowSubscribeModal] = useState(false)
    const [unsubscribing, setUnsubscribing] = useState(false)
    const [subscribing, setSubscribing] = useState(false)
    const [additionalEmails, setAdditionalEmails] = useState<string[]>([''])
    const [sendingConfirmations, setSendingConfirmations] = useState(false)

    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const loadProfile = useCallback(async () => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                router.push('/auth/login')
                return
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileError) {
                throw new Error(profileError.message)
            }

            setProfile(profile)
            setFormData({
                full_name: profile.full_name || '',
                avatar_url: profile.avatar_url || ''
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile')
        } finally {
            setLoading(false)
        }
    }, [supabase, router])

    const loadMailingListStatus = useCallback(async () => {
        try {
            setMailingListLoading(true)
            const response = await fetch('/api/profile/mailing-list-status')
            
            if (response.ok) {
                const data = await response.json()
                setMailingListStatus(data)
            } else {
                console.error('Failed to load mailing list status')
            }
        } catch (err) {
            console.error('Error loading mailing list status:', err)
        } finally {
            setMailingListLoading(false)
        }
    }, [])

    const handleUnsubscribe = async () => {
        setUnsubscribing(true)
        setError('')
        
        try {
            const response = await fetch('/api/profile/mailing-list-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'unsubscribe' })
            })

            if (response.ok) {
                const data = await response.json()
                setSuccess(data.message)
                setShowUnsubscribeModal(false)
                // Reload mailing list status
                await loadMailingListStatus()
            } else {
                const errorData = await response.json()
                setError(errorData.error || 'Failed to unsubscribe')
            }
        } catch (err) {
            setError('An error occurred while unsubscribing')
        } finally {
            setUnsubscribing(false)
        }
    }

    const handleSubscribe = async () => {
        setSubscribing(true)
        setError('')
        
        try {
            // Subscribe main email first
            const response = await fetch('/api/profile/mailing-list-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'subscribe' })
            })

            if (response.ok) {
                const data = await response.json()
                
                // Send confirmation emails for additional email addresses
                const validAdditionalEmails = additionalEmails.filter(email => 
                    email.trim() && 
                    email.includes('@') && 
                    email !== profile?.email
                )

                if (validAdditionalEmails.length > 0) {
                    setSendingConfirmations(true)
                    
                    try {
                        const confirmationResponse = await fetch('/api/profile/send-email-confirmations', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ 
                                emails: validAdditionalEmails,
                                userName: profile?.full_name || 'User'
                            })
                        })

                        if (confirmationResponse.ok) {
                            setSuccess(`${data.message} Confirmation emails sent to ${validAdditionalEmails.length} additional address(es).`)
                        } else {
                            setSuccess(`${data.message} However, there was an issue sending confirmation emails to additional addresses.`)
                        }
                    } catch {
                        setSuccess(`${data.message} However, there was an issue sending confirmation emails to additional addresses.`)
                    } finally {
                        setSendingConfirmations(false)
                    }
                } else {
                    setSuccess(data.message)
                }

                setShowSubscribeModal(false)
                setAdditionalEmails(['']) // Reset additional emails
                // Reload mailing list status
                await loadMailingListStatus()
            } else {
                const errorData = await response.json()
                setError(errorData.error || 'Failed to subscribe')
            }
        } catch (err) {
            setError('An error occurred while subscribing')
        } finally {
            setSubscribing(false)
        }
    }

    useEffect(() => {
        loadProfile()
        loadMailingListStatus()
    }, [loadProfile, loadMailingListStatus])

    // Handle URL parameters for success/error messages
    useEffect(() => {
        const successParam = searchParams.get('success')
        const errorParam = searchParams.get('error')
        const emailParam = searchParams.get('email')

        if (successParam === 'email-confirmed' && emailParam) {
            setSuccess(`Email ${emailParam} has been successfully confirmed and added to the mailing list!`)
            // Clear URL parameters
            router.replace('/profile')
        } else if (successParam === 'already-subscribed') {
            setSuccess('This email address is already subscribed to the mailing list.')
            router.replace('/profile')
        } else if (errorParam) {
            const errorMessages: Record<string, string> = {
                'invalid-confirmation-link': 'Invalid confirmation link. Please try subscribing again.',
                'invalid-or-expired-token': 'The confirmation link is invalid or has expired. Please try subscribing again.',
                'subscription-failed': 'Failed to activate subscription. Please try again.',
                'database-error': 'A database error occurred. Please try again.',
                'internal-error': 'An internal error occurred. Please try again.'
            }
            setError(errorMessages[errorParam] || 'An error occurred. Please try again.')
            router.replace('/profile')
        }
    }, [searchParams, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)
        setError('')
        setSuccess('')

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error('Not authenticated')
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name || null,
                    avatar_url: formData.avatar_url || null
                })
                .eq('id', user.id)

            if (updateError) {
                throw new Error(updateError.message)
            }

            setSuccess('Profile updated successfully!')
            await loadProfile() // Reload profile data
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile')
        } finally {
            setUpdating(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleCancel = () => {
        setNavigating(true)
        router.push('/dashboard')
    }

    const addEmailField = () => {
        setAdditionalEmails([...additionalEmails, ''])
    }

    const removeEmailField = (index: number) => {
        const newEmails = additionalEmails.filter((_, i) => i !== index)
        setAdditionalEmails(newEmails.length === 0 ? [''] : newEmails)
    }

    const updateEmailField = (index: number, value: string) => {
        const newEmails = [...additionalEmails]
        newEmails[index] = value
        setAdditionalEmails(newEmails)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <LoadingSpinner size="lg" text="Loading profile..." />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Profile not found</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Unable to load your profile information.</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                </div>
            </div>

            <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Account Information</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded">
                                {success}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={profile.email}
                                    disabled
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Email cannot be changed</p>
                            </div>

                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Role
                                </label>
                                <input
                                    type="text"
                                    id="role"
                                    value={profile.role}
                                    disabled
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm capitalize"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Avatar URL
                                </label>
                                <input
                                    type="url"
                                    id="avatar_url"
                                    name="avatar_url"
                                    value={formData.avatar_url}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="https://example.com/avatar.jpg"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Account Statistics</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Member since</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {new Date(profile.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Last updated</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {new Date(profile.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Account ID</p>
                                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                        {profile.id.slice(0, 8)}...
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Mailing List Status */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Email Preferences</h3>
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                {mailingListLoading ? (
                                    <div className="flex items-center space-x-3">
                                        <LoadingSpinner size="sm" />
                                        <span className="text-gray-600 dark:text-gray-400">Loading mailing list status...</span>
                                    </div>
                                ) : mailingListStatus ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                {mailingListStatus.isSubscribed ? (
                                                    <HiEnvelope className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <HiEnvelopeOpen className="h-5 w-5 text-gray-400" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        Marketing Email Subscription
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {mailingListStatus.isSubscribed 
                                                            ? 'You are subscribed to receive marketing emails about events and updates.'
                                                            : 'You are not subscribed to marketing emails.'
                                                        }
                                                    </p>
                                                    {mailingListStatus.subscribedAt && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Subscribed on {new Date(mailingListStatus.subscribedAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {mailingListStatus.isSubscribed ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowUnsubscribeModal(true)}
                                                    className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    Unsubscribe
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSubscribeModal(true)}
                                                    className="px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 border border-green-300 dark:border-green-600 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                >
                                                    Subscribe
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Unable to load mailing list status.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <ThemeSelector />
                        </div>

                        <div className="border-t pt-6">
                            <ThemePreview />
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={navigating}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {navigating ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        Redirecting...
                                    </>
                                ) : (
                                    'Cancel'
                                )}
                            </button>
                            <button
                                type="submit"
                                disabled={updating}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {updating ? 'Updating...' : 'Update Profile'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Unsubscribe Confirmation Modal */}
            <ConfirmationModal
                isOpen={showUnsubscribeModal}
                onClose={() => setShowUnsubscribeModal(false)}
                onConfirm={handleUnsubscribe}
                title="Unsubscribe from Marketing Emails"
                message="Are you sure you want to unsubscribe from marketing emails? You will no longer receive updates about new events and promotions. You can always resubscribe later if you change your mind."
                confirmText="Unsubscribe"
                cancelText="Cancel"
                variant="danger"
                loading={unsubscribing}
            />

            {/* Subscribe Confirmation Modal */}
            <ConfirmationModal
                isOpen={showSubscribeModal}
                onClose={() => {
                    setShowSubscribeModal(false)
                    setAdditionalEmails(['']) // Reset when closing
                }}
                onConfirm={handleSubscribe}
                title="Subscribe to Marketing Emails"
                message={
                    <div className="space-y-4">
                        <p>Would you like to subscribe to our marketing emails? You&apos;ll receive updates about new events, promotions, and other exciting news.</p>
                        
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                                Additional Email Addresses (Optional)
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                Add other email addresses that should also receive marketing emails. Confirmation emails will be sent to these addresses.
                            </p>
                            
                            <div className="space-y-2">
                                {additionalEmails.map((email, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => updateEmailField(index, e.target.value)}
                                            placeholder="additional@email.com"
                                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                        />
                                        {additionalEmails.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEmailField(index)}
                                                className="px-2 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                
                                {additionalEmails.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={addEmailField}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                    >
                                        + Add another email
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            You can unsubscribe at any time from your profile page.
                        </p>
                    </div>
                }
                confirmText={subscribing || sendingConfirmations ? 'Processing...' : 'Subscribe'}
                cancelText="Cancel"
                variant="info"
                loading={subscribing || sendingConfirmations}
            />
        </div>
    )
}