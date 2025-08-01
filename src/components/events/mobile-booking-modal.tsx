'use client'

import { useState, useEffect } from 'react'
import { Event, Profile } from '@/lib/types/database'
import BookingForm from './booking-form'

interface MobileBookingModalProps {
    event: Event
    user?: Profile
    isOpen: boolean
    onClose: () => void
}

export default function MobileBookingModal({ event, user, isOpen, onClose }: MobileBookingModalProps) {
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true)
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden'
        } else {
            // Re-enable body scroll when modal is closed
            document.body.style.overflow = 'unset'
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    const handleClose = () => {
        setIsAnimating(false)
        setTimeout(onClose, 300) // Wait for animation to complete
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black transition-opacity duration-300 ${
                    isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
                }`}
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div 
                className={`fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
                    isAnimating ? 'transform translate-y-0' : 'transform translate-y-full'
                }`}
                style={{ 
                    maxHeight: '90vh',
                    minHeight: '70vh'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 text-center">
                            Book Your Spot
                        </h2>
                        <p className="text-sm text-gray-600 text-center mt-1">
                            {event.title}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors absolute right-4 top-4"
                        aria-label="Close booking form"
                    >
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Drag Handle */}
                <div className="flex justify-center pt-2 pb-1">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                    <BookingForm event={event} user={user} />
                </div>
            </div>
        </div>
    )
}
