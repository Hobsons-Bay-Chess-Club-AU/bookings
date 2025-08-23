'use client'

import { useState, useCallback } from 'react'
import { Booking, Event, Participant } from '@/lib/types/database'
import { HiXCircle, HiCheckCircle, HiExclamationTriangle, HiUsers, HiEnvelope, HiPhone, HiPencil } from 'react-icons/hi2'
import EditParticipantModal from '@/components/organizer/edit-participant-modal'

interface BookingDetailsClientProps {
    booking: Booking & { event: Event; participants?: Participant[] }
    eventId: string
}

export default function BookingDetailsClient({ booking, eventId }: BookingDetailsClientProps) {
    const [showWithdrawModal, setShowWithdrawModal] = useState(false)
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)
    const [withdrawReason, setWithdrawReason] = useState('')
    const [isWithdrawing, setIsWithdrawing] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [error, setError] = useState('')
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedParticipantForEdit, setSelectedParticipantForEdit] = useState<Participant | null>(null)

    // Check if withdrawal is allowed (before event start date)
    const canWithdraw = useCallback(() => {
        const now = new Date()
        const eventStartDate = new Date(booking.event.start_date)
        return now < eventStartDate && 
               (booking.status === 'confirmed' || booking.status === 'verified' || booking.status === 'whitelisted')
    }, [booking.event.start_date, booking.status])

    const handleWithdrawParticipant = useCallback((participant: Participant) => {
        setSelectedParticipant(participant)
        setShowWithdrawModal(true)
    }, [])

    const handleEditParticipant = useCallback((participant: Participant) => {
        setSelectedParticipantForEdit(participant)
        setShowEditModal(true)
    }, [])

    const handleEditSubmit = async (participantId: string, formData: Record<string, unknown>) => {
        try {
            const response = await fetch(`/api/organizer/events/${eventId}/participants/${participantId}/edit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    notify_booker: true
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update participant')
            }

            setSuccessMessage('Participant updated successfully. The booker has been notified of the changes.')
            setShowSuccessModal(true)
            setShowEditModal(false)
        } catch (error) {
            console.error('Error updating participant:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to update participant'
            setError(`${errorMessage}. Please try again.`)
            setShowErrorModal(true)
        } finally {
            setShowEditModal(false)
            setSelectedParticipantForEdit(null)
        }
    }

    const submitWithdraw = async () => {
        if (!selectedParticipant) return

        setIsWithdrawing(true)
        try {
            const response = await fetch(`/api/organizer/events/${eventId}/participants/${selectedParticipant.id}/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: withdrawReason || undefined,
                    notify_booker: true
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to withdraw participant')
            }

            const result = await response.json()
            
            // Show success message with refund information
            if (result.refund_amount && result.refund_amount > 0) {
                setSuccessMessage(`Participant withdrawn successfully. Refund amount: $${result.refund_amount.toFixed(2)} (${result.refund_percentage}%)`)
            } else {
                setSuccessMessage('Participant withdrawn successfully.')
            }
            setShowSuccessModal(true)
            setShowWithdrawModal(false)
        } catch (error) {
            console.error('Error withdrawing participant:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw participant'
            setError(`${errorMessage}. Please try again.`)
            setShowErrorModal(true)
        } finally {
            setIsWithdrawing(false)
            setWithdrawReason('')
        }
    }

    if (!booking.participants || booking.participants.length === 0) {
        return null
    }

    return (
        <>
            {/* Participants with Management */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <HiUsers className="h-5 w-5 mr-2" />
                        Participants ({booking.participants.length})
                    </h2>
                    {canWithdraw() && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            You can withdraw participants for this booking.
                        </p>
                    )}
                </div>
                
                <div className="overflow-x-auto">
                    {/* Desktop Table */}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden lg:table">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Price Paid
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {booking.participants.map((participant, index) => (
                                <tr key={participant.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {participant.first_name} {participant.last_name}
                                        </div>
                                        {participant.date_of_birth && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                DOB: {participant.date_of_birth}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="space-y-1">
                                            {participant.contact_email && (
                                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                    <HiEnvelope className="h-3 w-3 mr-1" />
                                                    {participant.contact_email}
                                                </div>
                                            )}
                                            {participant.contact_phone && (
                                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                    <HiPhone className="h-3 w-3 mr-1" />
                                                    {participant.contact_phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-gray-100">
                                            {participant.price_paid ? `$${participant.price_paid.toFixed(2)}` : '—'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {participant.status === 'cancelled' ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                                Cancelled
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {participant.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleEditParticipant(participant)}
                                                    className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-900/20"
                                                    title="Edit participant details"
                                                >
                                                    <HiPencil className="h-3 w-3 mr-1" />
                                                    Edit
                                                </button>
                                            )}
                                            {canWithdraw() && participant.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleWithdrawParticipant(participant)}
                                                    className="inline-flex items-center px-2 py-1 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 dark:bg-gray-600 dark:text-red-300 dark:border-red-500 dark:hover:bg-red-900/20"
                                                    title="Withdraw participant from event"
                                                >
                                                    <HiXCircle className="h-3 w-3 mr-1" />
                                                    Withdraw
                                                </button>
                                            )}
                                            {participant.status === 'cancelled' && (
                                                <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                                                    No actions available
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Cards */}
                    <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                        {booking.participants.map((participant, index) => (
                            <div key={participant.id || index} className="p-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {participant.first_name} {participant.last_name}
                                            </div>
                                            {participant.date_of_birth && (
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    DOB: {participant.date_of_birth}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {participant.price_paid ? `$${participant.price_paid.toFixed(2)}` : '—'}
                                            </div>
                                            {participant.status === 'cancelled' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                                    Cancelled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {participant.contact_email && (
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                <HiEnvelope className="h-4 w-4 mr-2" />
                                                {participant.contact_email}
                                            </div>
                                        )}
                                        {participant.contact_phone && (
                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                <HiPhone className="h-4 w-4 mr-2" />
                                                {participant.contact_phone}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="pt-2">
                                        <div className="flex flex-wrap gap-2">
                                            {participant.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleEditParticipant(participant)}
                                                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-900/20"
                                                    title="Edit participant details"
                                                >
                                                    <HiPencil className="h-4 w-4 mr-1" />
                                                    Edit
                                                </button>
                                            )}
                                            {canWithdraw() && participant.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleWithdrawParticipant(participant)}
                                                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 dark:bg-gray-600 dark:text-red-300 dark:border-red-500 dark:hover:bg-red-900/20"
                                                    title="Withdraw participant from event"
                                                >
                                                    <HiXCircle className="h-4 w-4 mr-1" />
                                                    Withdraw
                                                </button>
                                            )}
                                            {participant.status === 'cancelled' && (
                                                <span className="inline-flex items-center px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                    No actions available
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Withdraw Participant Modal */}
            {showWithdrawModal && selectedParticipant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => !isWithdrawing && setShowWithdrawModal(false)}></div>
                    
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Withdraw Participant
                            </h3>
                            <button
                                onClick={() => !isWithdrawing && setShowWithdrawModal(false)}
                                disabled={isWithdrawing}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                                <div className="flex items-start">
                                    <HiExclamationTriangle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                            Confirm Withdrawal
                                        </h4>
                                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                            Are you sure you want to withdraw {selectedParticipant.first_name} {selectedParticipant.last_name} from this event?
                                        </p>
                                        {selectedParticipant.price_paid && selectedParticipant.price_paid > 0 && (
                                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                                A refund may be issued based on the event&apos;s refund policy for the amount of ${selectedParticipant.price_paid.toFixed(2)}.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Reason for withdrawal (optional)
                                    </label>
                                    <textarea
                                        value={withdrawReason}
                                        onChange={(e) => setWithdrawReason(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="Enter reason for withdrawal..."
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowWithdrawModal(false)}
                                    disabled={isWithdrawing}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitWithdraw}
                                    disabled={isWithdrawing}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw Participant'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => {
                        setShowSuccessModal(false)
                        window.location.reload()
                    }}></div>
                    
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Success
                            </h3>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false)
                                    window.location.reload()
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                <div className="flex items-start">
                                    <HiCheckCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                                            Operation Successful
                                        </h4>
                                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                            {successMessage}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false)
                                        window.location.reload()
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowErrorModal(false)}></div>
                    
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Error
                            </h3>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                                <div className="flex items-start">
                                    <HiExclamationTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                                            Operation Failed
                                        </h4>
                                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                            {error}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowErrorModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Participant Modal */}
            {showEditModal && selectedParticipantForEdit && (
                <EditParticipantModal
                    participant={selectedParticipantForEdit}
                    event={booking.event}
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditSubmit}
                />
            )}
        </>
    )
}
