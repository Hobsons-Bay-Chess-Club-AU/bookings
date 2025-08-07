'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MailingList, UserRole } from '@/lib/types/database'
import ConfirmationModal from '@/components/ui/confirmation-modal'

interface MailingListClientProps {
    initialMailingList: MailingList[]
    userRole: UserRole
}

export default function MailingListClient({ initialMailingList }: MailingListClientProps) {
    const [mailingList, setMailingList] = useState<MailingList[]>(initialMailingList)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [subscriberToRemove, setSubscriberToRemove] = useState<string | null>(null)

    const supabase = createClient()

    const handleAddSubscriber = async () => {
        if (!newEmail.trim()) {
            setError('Please enter a valid email address')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error } = await supabase
                .from('mailing_list')
                .insert({
                    email: newEmail.trim(),
                    status: 'subscribed',
                    filter_event: ['all']
                })

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    setError('This email is already in the mailing list')
                } else {
                    setError('Failed to add subscriber: ' + error.message)
                }
            } else {
                setSuccess('Subscriber added successfully')
                setNewEmail('')
                setShowAddForm(false)
                // Refresh the list
                const { data } = await supabase
                    .from('mailing_list')
                    .select('*')
                    .order('created_at', { ascending: false })
                if (data) setMailingList(data)
            }
        } catch {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveSubscriber = async (id: string) => {
        setSubscriberToRemove(id)
        setShowConfirmModal(true)
    }

    const confirmRemoveSubscriber = async () => {
        if (!subscriberToRemove) return

        setLoading(true)
        setError('')
        setShowConfirmModal(false)

        try {
            const { error } = await supabase
                .from('mailing_list')
                .delete()
                .eq('id', subscriberToRemove)

            if (error) {
                setError('Failed to remove subscriber: ' + error.message)
            } else {
                setSuccess('Subscriber removed successfully')
                setMailingList(mailingList.filter(sub => sub.id !== subscriberToRemove))
            }
        } catch {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
            setSubscriberToRemove(null)
        }
    }

    const handleSendEmail = async () => {
        if (!emailSubject.trim() || !emailBody.trim()) {
            setError('Please fill in both subject and body')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await fetch('/api/admin/mailing-list/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject: emailSubject,
                    body: emailBody
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send email')
            }

            setSuccess('Email sent successfully to all subscribers')
            setEmailSubject('')
            setEmailBody('')
            setShowEmailForm(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const subscribedCount = mailingList.filter(sub => sub.status === 'subscribed').length
    const unsubscribedCount = mailingList.filter(sub => sub.status === 'unsubscribed').length

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Total Subscribers</h3>
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{mailingList.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Active Subscribers</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{subscribedCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Unsubscribed</h3>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{unsubscribedCount}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                    Add Subscriber
                </button>
                <button
                    onClick={() => setShowEmailForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    disabled={subscribedCount === 0}
                >
                    Send Marketing Email
                </button>
            </div>

            {/* Add Subscriber Form */}
            {showAddForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Add New Subscriber</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter email address"
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleAddSubscriber}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add Subscriber'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false)
                                    setNewEmail('')
                                    setError('')
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Email Form */}
            {showEmailForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Send Marketing Email</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter email subject"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                            <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                rows={6}
                                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter your message here..."
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleSendEmail}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                {loading ? 'Sending...' : `Send to ${subscribedCount} subscribers`}
                            </button>
                            <button
                                onClick={() => {
                                    setShowEmailForm(false)
                                    setEmailSubject('')
                                    setEmailBody('')
                                    setError('')
                                }}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error and Success Messages */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                    <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                </div>
            )}

            {/* Subscribers List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Subscribers</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Subscribed Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {mailingList.map((subscriber) => (
                                <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {subscriber.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            subscriber.status === 'subscribed' 
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        }`}>
                                            {subscriber.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(subscriber.datetime).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleRemoveSubscriber(subscriber.id)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false)
                    setSubscriberToRemove(null)
                }}
                onConfirm={confirmRemoveSubscriber}
                title="Remove Subscriber"
                message="Are you sure you want to remove this subscriber from the mailing list? This action cannot be undone."
                confirmText="Remove"
                cancelText="Cancel"
                variant="danger"
                loading={loading}
            />
        </div>
    )
} 