'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface BookingJourneyContextType {
  isInBookingJourney: boolean
  setIsInBookingJourney: (isInJourney: boolean) => void
  bookingStep: number
  setBookingStep: (step: number) => void
}

const BookingJourneyContext = createContext<BookingJourneyContextType | undefined>(undefined)

export function BookingJourneyProvider({ children }: { children: ReactNode }) {
  const [isInBookingJourney, setIsInBookingJourney] = useState(false)
  const [bookingStep, setBookingStep] = useState(1)

  const value = {
    isInBookingJourney,
    setIsInBookingJourney,
    bookingStep,
    setBookingStep
  }

  return (
    <BookingJourneyContext.Provider value={value}>
      {children}
    </BookingJourneyContext.Provider>
  )
}

export function useBookingJourney() {
  const context = useContext(BookingJourneyContext)
  if (context === undefined) {
    throw new Error('useBookingJourney must be used within a BookingJourneyProvider')
  }
  return context
} 