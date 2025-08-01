'use client'

import { Event } from '@/lib/types/database'

interface MobileBookingButtonProps {
    event: Event
    onClick: () => void
    className?: string
}

function isBookable(event: Event) {
    const now = new Date()
    if (event.entry_close_date && new Date(event.entry_close_date) < now) return false
    return event.status === 'published' && (event.max_attendees == null || event.current_attendees < event.max_attendees)
}

export default function MobileBookingButton({ event, onClick, className = '' }: MobileBookingButtonProps) {
    const bookable = isBookable(event)
    const isEventFull = event.max_attendees ? event.current_attendees >= event.max_attendees : false
    const isEventPast = new Date(event.start_date) < new Date()

    let buttonText = 'Book Now'
    let buttonClass = 'bg-indigo-600 hover:bg-indigo-700 text-white'
    let disabled = false

    if (isEventPast) {
        buttonText = 'Event Ended'
        buttonClass = 'bg-gray-400 text-white cursor-not-allowed'
        disabled = true
    } else if (isEventFull) {
        buttonText = 'Sold Out'
        buttonClass = 'bg-red-400 text-white cursor-not-allowed'
        disabled = true
    } else if (!bookable) {
        buttonText = 'Booking Closed'
        buttonClass = 'bg-gray-400 text-white cursor-not-allowed'
        disabled = true
    }

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors duration-200 shadow-md ${buttonClass} ${className}`}
        >
            {buttonText}
        </button>
    )
}
