'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MailingList, UserRole } from '@/lib/types/database'

interface MailingListClientProps {
    initialMailingList: MailingList[]
    userRole: UserRole
}

export default function MailingListClient({ initialMailingList, userRole }: MailingListClientProps) {
    const [mailingList, setMailingList] = useState<MailingList[]>(initialMailingList)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')

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
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveSubscriber = async (id: string) => {
        if (!confirm('Are you sure you want to remove this subscriber?')) {
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error } = await supabase
                .from('mailing_list')
                .delete()
                .eq('id', id)

            if (error) {
                setError('Failed to remove subscriber: ' + error.message)
            } else {
                setSuccess('Subscriber removed successfully')
                setMailingList(mailingList.filter(sub => sub.id !== id))
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
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
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900">Total Subscribers</h3>
                    <p className="text-3xl font-bold text-indigo-600">{mailingList.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900">Active Subscribers</h3>
                    <p className="text-3xl font-bold text-green-600">{subscribedCount}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900">Unsubscribed</h3>
                    <p className="text-3xl font-bold text-red-600">{unsubscribedCount}</p>
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
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Subscriber</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Email Form */}
            {showEmailForm && (
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Send Marketing Email</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Subject</label>
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter email subject"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Message</label>
                            <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                rows={6}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error and Success Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm text-green-600">{success}</p>
                </div>
            )}

            {/* Subscribers List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Subscribers</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Subscribed Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mailingList.map((subscriber) => (
                                <tr key={subscriber.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {subscriber.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            subscriber.status === 'subscribed' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {subscriber.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(subscriber.datetime).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleRemoveSubscriber(subscriber.id)}
                                            className="text-red-600 hover:text-red-900"
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
        </div>
    )
} 