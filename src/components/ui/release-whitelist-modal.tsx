'use client'

import { useState } from 'react'
import { HiExclamationTriangle, HiCheckCircle, HiXCircle, HiXMark } from 'react-icons/hi2'

interface BookingInfo {
  id: string
  booking_id: string
  user: {
    full_name: string | null | undefined
    email: string | undefined
  }
  quantity: number
  total_amount: number
  booking_date: string
  event?: {
    title: string
  }
}

interface ReleaseWhitelistModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingInfo | null
  onConfirm: () => Promise<void>
}

export default function ReleaseWhitelistModal({ 
  isOpen, 
  onClose, 
  booking, 
  onConfirm 
}: ReleaseWhitelistModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen || !booking) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await onConfirm()
      setSuccess(true)
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 sm:mx-0 sm:h-10 sm:w-10">
                  <HiExclamationTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Release Whitelisted Booking
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Allow this user to complete payment
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <HiXMark className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 px-4 pb-4 sm:p-6 sm:pb-4">
            {success ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <HiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                  Booking Released Successfully!
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  The user has been notified and can now complete payment.
                </p>
              </div>
            ) : (
              <>
                {/* Error Message */}
                {error && (
                  <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <HiXCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Error
                        </h3>
                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                          {error}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Booking Information */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Booking Details
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Customer:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {booking.user.full_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {booking.user.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Booking ID:</span>
                      <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {booking.booking_id || booking.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        AUD ${booking.total_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Booked Date:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </span>
                    </div>
                    {booking.event && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Event:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {booking.event.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirmation Message */}
                <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <HiExclamationTriangle className="h-5 w-5 text-amber-400 dark:text-amber-300" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Confirm Release
                      </h3>
                      <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                                                 <p>
                           This will change the booking status from &quot;whitelisted&quot; to &quot;pending&quot; and send an email to the user allowing them to complete payment.
                         </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {!success && (
              <>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="inline-flex w-full justify-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Releasing...
                    </>
                  ) : (
                    'Release Booking'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
