'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'

interface BookingContextType {
    onStartBooking?: () => void
    hasUserInteracted: boolean
    setHasUserInteracted: (value: boolean) => void
    bookingStep: number
    setBookingStep: (value: number) => void
}

const BookingContext = createContext<BookingContextType>({
    hasUserInteracted: false,
    setHasUserInteracted: () => {},
    bookingStep: 0,
    setBookingStep: () => {}
})

export function BookingProvider({ children, onStartBooking }: { children: ReactNode; onStartBooking?: () => void }) {
    const [hasUserInteracted, setHasUserInteracted] = useState(false)
    const [bookingStep, setBookingStep] = useState(0)

    // Debug state changes
    useEffect(() => {
        console.log('🔍 [BOOKING-CONTEXT] State changed:', { hasUserInteracted, bookingStep })
    }, [hasUserInteracted, bookingStep])

    const handleStartBooking = () => {
        console.log('🔍 [BOOKING-CONTEXT] Start booking triggered!')
        console.log('🔍 [BOOKING-CONTEXT] Before state update:', { hasUserInteracted, bookingStep })
        console.log('🔍 [BOOKING-CONTEXT] Setting hasUserInteracted to true')
        setHasUserInteracted(true)
        console.log('🔍 [BOOKING-CONTEXT] Setting bookingStep to 1')
        setBookingStep(1)
        console.log('🔍 [BOOKING-CONTEXT] After setState calls')
        console.log('🔍 [BOOKING-CONTEXT] Calling onStartBooking callback')
        onStartBooking?.()
    }

    return (
        <BookingContext.Provider value={{ 
            onStartBooking: handleStartBooking,
            hasUserInteracted,
            setHasUserInteracted,
            bookingStep,
            setBookingStep
        }}>
            {children}
        </BookingContext.Provider>
    )
}

export function useBooking() {
    return useContext(BookingContext)
}
