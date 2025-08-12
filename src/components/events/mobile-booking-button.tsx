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
    const isBaseOpen = event.status === 'published'
    if (!isBaseOpen) return false
    
    // For multi-section events, check if any section has available seats
    if (event.has_sections && event.sections && event.sections.length > 0) {
        const hasAvailableSeats = event.sections.some(section => (section.available_seats ?? 0) > 0)
        if (!hasAvailableSeats && event.settings?.whitelist_enabled) return true
        return hasAvailableSeats
    }
    
    // For single events, check main event capacity
    const isFull = event.max_attendees != null && event.current_attendees >= event.max_attendees
    if (isFull && event.settings?.whitelist_enabled) return true
    return event.max_attendees == null || !isFull
}

export default function MobileBookingButton({ event, onClick, className = '' }: MobileBookingButtonProps) {
    const bookable = isBookable(event)
    
    // For multi-section events, check if all sections are full
    const isEventFull = event.has_sections && event.sections && event.sections.length > 0
        ? event.sections.every(section => (section.available_seats ?? 0) === 0)
        : (event.max_attendees ? event.current_attendees >= event.max_attendees : false)
    
    const isEventPast = new Date(event.start_date) < new Date()

    let buttonText = 'Book Now'
    let buttonClass = 'bg-indigo-600 hover:bg-indigo-700 text-white'
    let disabled = false

    if (isEventPast) {
        buttonText = 'Event Ended'
        buttonClass = 'bg-gray-400 text-white cursor-not-allowed'
        disabled = true
    } else if (isEventFull) {
        if (event.settings?.whitelist_enabled) {
            buttonText = 'Whitelisted'
            buttonClass = 'bg-amber-600 hover:bg-amber-700 text-white'
            disabled = false
        } else {
            buttonText = 'Sold Out'
            buttonClass = 'bg-red-400 text-white cursor-not-allowed'
            disabled = true
        }
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
