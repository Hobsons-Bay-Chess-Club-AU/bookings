'use client'

import { useState, useEffect, useCallback } from 'react'
import { Event } from '@/lib/types/database'
import { HiXMark, HiArrowRight, HiExclamationTriangle } from 'react-icons/hi2'

interface BookingTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onTransfer: (targetEventId: string, reason: string, notes: string) => Promise<void>
  bookingId: string
  currentEventId: string
  currentEventTitle: string
  userEmail: string
  quantity: number
}

export default function BookingTransferModal({
  isOpen,
  onClose,
  onTransfer,
  currentEventId,
  currentEventTitle,
  userEmail,
  quantity
}: BookingTransferModalProps) {
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
      const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [eventsLoading, setEventsLoading] = useState(false)
    const [showConfirmation, setShowConfirmation] = useState(false)

      const fetchAvailableEvents = useCallback(async () => {
        setEventsLoading(true)
        setError('')
        
        try {
            const response = await fetch(`/api/admin/events/available-for-transfer?excludeEventId=${currentEventId}`)
            
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch events')
            }
            
            const data = await response.json()
            setAvailableEvents(data.events)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch available events')
        } finally {
            setEventsLoading(false)
        }
    }, [currentEventId])

    useEffect(() => {
        if (isOpen) {
            fetchAvailableEvents()
        }
    }, [isOpen, fetchAvailableEvents])

      const handleTransfer = async () => {
        if (!selectedEventId || !reason.trim()) {
            setError('Please select a target event and provide a reason for the transfer')
            return
        }

        setShowConfirmation(true)
    }

    const confirmTransfer = async () => {
        setLoading(true)
        setError('')

        try {
            await onTransfer(selectedEventId, reason.trim(), notes.trim())
            handleClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to transfer booking')
        } finally {
            setLoading(false)
            setShowConfirmation(false)
        }
    }

    const cancelTransfer = () => {
        setShowConfirmation(false)
    }

      const handleClose = () => {
        setSelectedEventId('')
        setReason('')
        setNotes('')
        setError('')
        setLoading(false)
        setShowConfirmation(false)
        onClose()
    }

  const selectedEvent = availableEvents.find(event => event.id === selectedEventId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Transfer Booking
              </h3>
              <button
                type="button"
                className="rounded-md bg-white dark:bg-gray-600 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                onClick={handleClose}
              >
                <HiXMark className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-5 sm:p-6">
            {/* Booking Info */}
            <div className="mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Booking Details</h4>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p><strong>User:</strong> {userEmail}</p>
                <p><strong>Quantity:</strong> {quantity} ticket{quantity > 1 ? 's' : ''}</p>
                <p><strong>Current Event:</strong> {currentEventTitle}</p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                <div className="flex">
                  <HiExclamationTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-200">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Target Event Selection */}
            <div className="mb-6">
              <label htmlFor="targetEvent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transfer to Event *
              </label>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading events...</span>
                </div>
              ) : availableEvents.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  No available events found for transfer.
                </div>
              ) : (
                <select
                  id="targetEvent"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-sm"
                >
                  <option value="">Select an event...</option>
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.start_date).toLocaleDateString()} ({event.location})
                      {event.max_attendees && ` (${event.current_attendees}/${event.max_attendees})`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Transfer Preview */}
            {selectedEvent && (
              <div className="mb-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 p-4">
                <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">Transfer Preview</h4>
                <div className="flex items-center text-sm text-yellow-800 dark:text-yellow-200">
                  <span className="truncate">{currentEventTitle}</span>
                  <HiArrowRight className="h-4 w-4 mx-2 flex-shrink-0" />
                  <span className="truncate">{selectedEvent.title}</span>
                </div>
                <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
                  <p>Date: {new Date(selectedEvent.start_date).toLocaleDateString()}</p>
                  <p>Location: {selectedEvent.location}</p>
                  {selectedEvent.max_attendees && (
                    <p>Capacity: {selectedEvent.current_attendees + quantity}/{selectedEvent.max_attendees}</p>
                  )}
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="mb-4">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Transfer *
              </label>
              <textarea
                id="reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain why this booking is being transferred..."
                className="p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-sm"
                required
              />
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-sm"
              />
            </div>
          </div>

                      {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                    type="button"
                    onClick={handleTransfer}
                    disabled={loading || !selectedEventId || !reason.trim()}
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue to Transfer
                </button>
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmation && (
                <div className="fixed inset-0 z-60 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={cancelTransfer} />
                        
                        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <HiExclamationTriangle className="h-6 w-6 text-yellow-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <h3 className="text-base font-semibold leading-6 text-gray-900">
                                            Confirm Booking Transfer
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Are you sure you want to transfer this booking from <strong>{currentEventTitle}</strong> to <strong>{selectedEvent?.title}</strong>?
                                            </p>
                                            <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                                                <p className="text-sm text-yellow-800">
                                                    <strong>This action cannot be undone.</strong> The user will be notified of the transfer via email.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button
                                    type="button"
                                    onClick={confirmTransfer}
                                    disabled={loading}
                                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Transferring...
                                        </div>
                                    ) : (
                                        'Confirm Transfer'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelTransfer}
                                    disabled={loading}
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
} 