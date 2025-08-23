'use client'

import { useState } from 'react'
import { 
    HiPencil, 
    HiNoSymbol, 
    HiExclamationTriangle,
    HiXCircle,
    HiUser,
    HiCurrencyDollar
} from 'react-icons/hi2'
import { Participant, Booking, Event } from '@/lib/types/database'

interface ParticipantManagementProps {
    booking: Booking & { event: Event }
    participants: Participant[]
    onParticipantUpdate: () => void
}

interface EditParticipantModalProps {
    participant: Participant
    isOpen: boolean
    onClose: () => void
    onSave: (participantId: string, data: Record<string, unknown>) => Promise<void>
    event: Event
}

interface WithdrawParticipantModalProps {
    participant: Participant
    isOpen: boolean
    onClose: () => void
    onWithdraw: (participantId: string, reason?: string) => Promise<void>
    event: Event
}

function EditParticipantModal({ participant, isOpen, onClose, onSave, event }: EditParticipantModalProps) {
    const [formData, setFormData] = useState({
        first_name: participant.first_name || '',
        last_name: participant.last_name || '',
        contact_email: participant.contact_email || '',
        contact_phone: participant.contact_phone || '',
        date_of_birth: participant.date_of_birth || '',
        custom_data: participant.custom_data || {}
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            await onSave(participant.id!, formData)
            onClose()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update participant'
            setError(`${errorMessage}. Please try again. If the error persists, please contact the event organizer for assistance.`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCustomFieldChange = (fieldName: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            custom_data: {
                ...prev.custom_data,
                [fieldName]: value
            }
        }))
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Edit Participant: {participant.first_name} {participant.last_name}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                            <div className="flex items-center">
                                <HiExclamationTriangle className="h-5 w-5 text-red-400 mr-2" />
                                <span className="text-red-800 dark:text-red-200">{error}</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                First Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Last Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Contact Email
                            </label>
                            <input
                                type="email"
                                value={formData.contact_email}
                                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Contact Phone
                            </label>
                            <input
                                type="tel"
                                value={formData.contact_phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* Custom Fields */}
                    {event.custom_form_fields && event.custom_form_fields.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Additional Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {event.custom_form_fields.map((field) => (
                                    <div key={field.name}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <input
                                            type={field.type === 'number' ? 'number' : 'text'}
                                            required={field.required}
                                            value={String(formData.custom_data[field.name] || '')}
                                            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function WithdrawParticipantModal({ participant, isOpen, onClose, onWithdraw, event }: WithdrawParticipantModalProps) {
    const [reason, setReason] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleWithdraw = async () => {
        setIsLoading(true)
        setError('')

        try {
            await onWithdraw(participant.id!, reason || undefined)
            onClose()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw participant'
            setError(`${errorMessage}. Please try again. If the error persists, please contact the event organizer to initiate the withdrawal.`)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Withdraw Participant
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                            <div className="flex items-start">
                                <HiExclamationTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                                        Withdrawal Failed
                                    </h4>
                                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                        {error}
                                    </p>
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                                        <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                                            Need help? Contact the event organizer:
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                            Event: {event.title}
                                        </p>
                                        {event.organizer_email && (
                                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                                Email: {event.organizer_email}
                                            </p>
                                        )}
                                        {event.organizer_phone && (
                                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                                Phone: {event.organizer_phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                        <div className="flex items-start">
                            <HiExclamationTriangle className="h-5 w-5 text-amber-400 mr-2 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    Withdraw {participant.first_name} {participant.last_name}?
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                    This action will remove the participant from the event. 
                                    {participant.price_paid && participant.price_paid > 0 && (
                                        <span> A refund of ${participant.price_paid.toFixed(2)} may be applicable based on the event&apos;s refund policy.</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reason (Optional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="Why are you withdrawing this participant?"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleWithdraw}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Withdrawing...' : 'Withdraw Participant'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ParticipantManagement({ booking, participants, onParticipantUpdate }: ParticipantManagementProps) {
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
    const [withdrawingParticipant, setWithdrawingParticipant] = useState<Participant | null>(null)

    const activeParticipants = participants.filter(p => p.status !== 'cancelled')
    const cancelledParticipants = participants.filter(p => p.status === 'cancelled')

    const handleEditParticipant = async (participantId: string, data: Record<string, unknown>) => {
        try {
            const response = await fetch(`/api/bookings/${booking.id}/participants/${participantId}/edit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to update participant')
            }

            onParticipantUpdate()
        } catch (error) {
            console.error('Error updating participant:', error)
            throw error
        }
    }

    const handleWithdrawParticipant = async (participantId: string, reason?: string) => {
        try {
            const response = await fetch(`/api/bookings/${booking.id}/withdraw-participant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participant_id: participantId,
                    reason
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to withdraw participant')
            }

            onParticipantUpdate()
        } catch (error) {
            console.error('Error withdrawing participant:', error)
            throw error
        }
    }

    const canModifyBooking = booking.status === 'confirmed' || booking.status === 'verified' || booking.status === 'whitelisted'

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Participants ({activeParticipants.length})
                </h3>
                {!canModifyBooking && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        This booking cannot be modified in its current status
                    </p>
                )}
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeParticipants.map((participant) => (
                    <div key={participant.id} className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                                            <HiUser className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {participant.first_name} {participant.last_name}
                                        </p>
                                        {participant.contact_email && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {participant.contact_email}
                                            </p>
                                        )}
                                        {participant.price_paid && participant.price_paid > 0 && (
                                            <div className="flex items-center mt-1">
                                                <HiCurrencyDollar className="h-4 w-4 text-gray-400 mr-1" />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    ${participant.price_paid.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {canModifyBooking && (
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setEditingParticipant(participant)}
                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <HiPencil className="h-3 w-3 mr-1" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setWithdrawingParticipant(participant)}
                                        className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 shadow-sm text-xs font-medium rounded text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <HiNoSymbol className="h-3 w-3 mr-1" />
                                        Withdraw
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {cancelledParticipants.length > 0 && (
                    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-700">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                            Cancelled Participants ({cancelledParticipants.length})
                        </h4>
                        <div className="space-y-2">
                            {cancelledParticipants.map((participant) => (
                                <div key={participant.id} className="flex items-center space-x-3 text-sm">
                                    <HiXCircle className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {participant.first_name} {participant.last_name}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        (Cancelled)
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeParticipants.length === 0 && (
                    <div className="p-6 text-center">
                        <HiUser className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            No active participants in this booking
                        </p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {editingParticipant && (
                <EditParticipantModal
                    participant={editingParticipant}
                    isOpen={!!editingParticipant}
                    onClose={() => setEditingParticipant(null)}
                    onSave={handleEditParticipant}
                    event={booking.event}
                />
            )}

            {withdrawingParticipant && (
                <WithdrawParticipantModal
                    participant={withdrawingParticipant}
                    isOpen={!!withdrawingParticipant}
                    onClose={() => setWithdrawingParticipant(null)}
                    onWithdraw={handleWithdrawParticipant}
                    event={booking.event}
                />
            )}
        </div>
    )
}
