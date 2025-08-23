'use client'

import { useState, useCallback } from 'react'
import { Booking, Event, Participant } from '@/lib/types/database'
import { HiPencil, HiXCircle, HiCheckCircle, HiExclamationTriangle } from 'react-icons/hi2'

interface BookingDetailsClientProps {
    booking: Booking & { event: Event }
    participants: Array<Participant & { section?: { title: string; start_date: string; end_date?: string } }>
}

export default function BookingDetailsClient({ booking, participants }: BookingDetailsClientProps) {
    const [showWithdrawModal, setShowWithdrawModal] = useState(false)
    const [selectedParticipant, setSelectedParticipant] = useState<(Participant & { section?: { title: string; start_date: string; end_date?: string } }) | null>(null)
    const [withdrawReason, setWithdrawReason] = useState('')
    const [isWithdrawing, setIsWithdrawing] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editFormData, setEditFormData] = useState<Record<string, string | number | boolean>>({})
    const [isEditing, setIsEditing] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [error, setError] = useState('')

    // Check if withdrawal is allowed (before event start date)
    const canWithdraw = useCallback(() => {
        const now = new Date()
        const eventStartDate = new Date(booking.event.start_date)
        return now < eventStartDate && 
               (booking.status === 'confirmed' || booking.status === 'verified' || booking.status === 'whitelisted')
    }, [booking.event.start_date, booking.status])

    // Check if editing is allowed
    const canEdit = useCallback(() => {
        return booking.status === 'confirmed' || booking.status === 'verified' || booking.status === 'whitelisted'
    }, [booking.status])

    const handleEditParticipant = useCallback((participant: Participant & { section?: { title: string; start_date: string; end_date?: string } }) => {
        // Initialize form data with current participant data
        const formData = {
            first_name: participant.first_name,
            last_name: participant.last_name,
            date_of_birth: participant.date_of_birth || '',
            contact_email: participant.contact_email || '',
            contact_phone: participant.contact_phone || '',
            ...participant.custom_data
        }
        setEditFormData(formData)
        setSelectedParticipant(participant)
        setShowEditModal(true)
    }, [])

    const handleWithdrawParticipant = useCallback((participant: Participant & { section?: { title: string; start_date: string; end_date?: string } }) => {
        setSelectedParticipant(participant)
        setShowWithdrawModal(true)
    }, [])

    const submitEdit = async () => {
        if (!selectedParticipant) return

        setIsEditing(true)
        try {
            const response = await fetch(`/api/bookings/${booking.id}/participants/${selectedParticipant.id}/edit`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editFormData),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update participant')
            }

            setSuccessMessage('Participant details updated successfully!')
            setShowSuccessModal(true)
            setShowEditModal(false)
        } catch (error) {
            console.error('Error updating participant:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to update participant'
            setError(`${errorMessage}. Please try again. If the error persists, please contact the event organizer.`)
            setShowErrorModal(true)
        } finally {
            setIsEditing(false)
        }
    }

    const submitWithdraw = async () => {
        if (!selectedParticipant) return

        setIsWithdrawing(true)
        try {
            const response = await fetch(`/api/bookings/${booking.id}/withdraw-participant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participant_id: selectedParticipant.id,
                    reason: withdrawReason || undefined,
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
            setError(`${errorMessage}. Please try again. If the error persists, please contact the event organizer.`)
            setShowErrorModal(true)
        } finally {
            setIsWithdrawing(false)
            setWithdrawReason('')
        }
    }

    // Helper function to display custom data (from original component)
    const renderCustomData = (participant: Participant) => {
        if (!participant.custom_data) return null

        return Object.entries(participant.custom_data).map(([key, value]) => {
            let displayValue: string

            // Type guard for FIDE/ACF player object
            function isPlayerObject(val: unknown): val is { id: string, name: string, std_rating?: number, rapid_rating?: number, blitz_rating?: number } {
                return (
                    typeof val === 'object' && val !== null &&
                    'id' in val && typeof (val as { id: unknown }).id === 'string' &&
                    'name' in val && typeof (val as { name: unknown }).name === 'string' &&
                    'std_rating' in val
                )
            }

            if (Array.isArray(value)) {
                displayValue = value.join(', ')
            } else if (isPlayerObject(value)) {
                const ratings = []
                if (value.std_rating) ratings.push(`Std: ${value.std_rating}`)
                if (value.rapid_rating) ratings.push(`Rapid: ${value.rapid_rating}`)
                if (value.blitz_rating) ratings.push(`Blitz: ${value.blitz_rating}`)
                displayValue = `${value.name} (ID: ${value.id})${ratings.length > 0 ? ` - ${ratings.join(', ')}` : ''}`
            } else if (typeof value === 'object' && value !== null) {
                displayValue = JSON.stringify(value)
            } else {
                displayValue = String(value)
            }

            return (
                <div key={key}>
                    <span className="font-medium">{key.replace(/_/g, ' ')}:</span>{' '}
                    {/* Special handling for FIDE/ACF player objects with links */}
                    {isPlayerObject(value) ? (
                        <span>
                            {value.name} (ID:{' '}
                            {key.toLowerCase().includes('fide') ? (
                                <a
                                    href={`https://ratings.fide.com/profile/${value.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                                >
                                    {value.id}
                                </a>
                            ) : (
                                value.id
                            )}
                            )
                            {(() => {
                                const ratings = []
                                if (value.std_rating) ratings.push(`Std: ${value.std_rating}`)
                                if (value.rapid_rating) ratings.push(`Rapid: ${value.rapid_rating}`)
                                if (value.blitz_rating) ratings.push(`Blitz: ${value.blitz_rating}`)
                                return ratings.length > 0 ? ` - ${ratings.join(', ')}` : ''
                            })()}
                        </span>
                    ) : (
                        displayValue
                    )}
                </div>
            )
        })
    }

    if (!participants || participants.length === 0) {
    return null
  }

  return (
        <>
            {/* Participant Information with Management */}
            <div className="mt-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Participant Information</h2>
                    {(canEdit() || canWithdraw()) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            You can edit participant details{canWithdraw() && ' or withdraw participants'} for this booking.
                        </p>
                    )}
                </div>
                
                <div className="space-y-6">
                    {participants.map((participant, idx) => (
                        <div key={participant.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200 mr-2">
                                        Participant {idx + 1}
                                        {participant.section ? ` - ${participant.section.title}` : ''}
                                    </span>
                                    {participant.status === 'cancelled' && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                            Cancelled
                                        </span>
                                    )}
                                    {participant.price_paid && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 ml-2">
                                            ${participant.price_paid.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                
                                {participant.status !== 'cancelled' && (
                                    <div className="flex gap-2">
                                        {canEdit() && (
                                            <button
                                                onClick={() => handleEditParticipant(participant)}
                                                className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
                                            >
                                                <HiPencil className="h-4 w-4 mr-1" />
                                                Edit
                                            </button>
                                        )}
                                        {canWithdraw() && (
                                            <button
                                                onClick={() => handleWithdrawParticipant(participant)}
                                                className="inline-flex items-center px-2 py-1 border border-red-300 shadow-sm text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50 dark:bg-gray-600 dark:text-red-300 dark:border-red-500 dark:hover:bg-red-900/20"
                                            >
                                                <HiXCircle className="h-4 w-4 mr-1" />
                                                Withdraw
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800 dark:text-gray-200">
                                <div><span className="font-medium">First Name:</span> {participant.first_name}</div>
                                <div><span className="font-medium">Last Name:</span> {participant.last_name}</div>
                                {participant.date_of_birth && <div><span className="font-medium">Date of Birth:</span> {participant.date_of_birth}</div>}
                                {participant.contact_email && <div><span className="font-medium">Contact Email:</span> {participant.contact_email}</div>}
                                {participant.contact_phone && <div><span className="font-medium">Contact Phone:</span> {participant.contact_phone}</div>}
                                {participant.section && (
                                    <>
                                        <div className="md:col-span-2">
                                            <span className="font-medium">Section:</span> {participant.section.title}
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="font-medium">Section Schedule:</span> {new Date(participant.section.start_date).toLocaleString([], { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'long', day: 'numeric' })}
                                            {participant.section.end_date ? ` - ${new Date(participant.section.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                        </div>
                                    </>
                                )}
                                {/* Custom fields */}
                                {renderCustomData(participant)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit Participant Modal */}
            {showEditModal && selectedParticipant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => !isEditing && setShowEditModal(false)}></div>
                    
                    <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Edit Participant Details
                            </h3>
                            <button
                                onClick={() => !isEditing && setShowEditModal(false)}
                                disabled={isEditing}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 max-h-96 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            First Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={String(editFormData.first_name || '')}
                                            onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Last Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={String(editFormData.last_name || '')}
                                            onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Date of Birth
                                    </label>
                                    <input
                                        type="date"
                                        value={String(editFormData.date_of_birth || '')}
                                        onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Contact Email
                                    </label>
                                    <input
                                        type="email"
                                        value={String(editFormData.contact_email || '')}
                                        onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Contact Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={String(editFormData.contact_phone || '')}
                                        onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                disabled={isEditing}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitEdit}
                                disabled={isEditing || !editFormData.first_name || !editFormData.last_name}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isEditing ? 'Updating...' : 'Update Participant'}
                            </button>
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
                                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                                            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                                                Need help? Contact the event organizer:
                                            </p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                Event: {booking.event.title}
                                            </p>
                                            {booking.event.organizer_email && (
                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                    Email: {booking.event.organizer_email}
                                                </p>
                                            )}
                                            {booking.event.organizer_phone && (
                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                    Phone: {booking.event.organizer_phone}
                                                </p>
                                            )}
                                        </div>
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
        </>
    )
}
