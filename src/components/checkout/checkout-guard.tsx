'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface CheckoutGuardProps {
  bookingId: string
  children: React.ReactNode
}

export default function CheckoutGuard({ bookingId, children }: CheckoutGuardProps) {
  const router = useRouter()
  const isNavigating = useRef(false)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show confirmation if we have a booking ID (meaning a booking is in progress)
      if (!isNavigating.current && bookingId && bookingId.trim() !== '') {
        e.preventDefault()
        e.returnValue = 'Are you sure you want to leave? Your booking will be cancelled.'
        return e.returnValue
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isNavigating.current && bookingId && bookingId.trim() !== '') {
        // User is leaving the page (tab switch, window close, etc.)
        cleanupAbandonedBooking()
      }
    }

    const cleanupAbandonedBooking = async () => {
      // Only cleanup if we have a valid booking ID
      if (!bookingId || bookingId.trim() === '') {
        return
      }
      
      try {
        await fetch('/api/bookings/cleanup-pending', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bookingId }),
        })
      } catch (error) {
        console.error('Failed to cleanup abandoned booking:', error)
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Clean up booking if component unmounts without navigation
      if (!isNavigating.current && bookingId && bookingId.trim() !== '') {
        cleanupAbandonedBooking()
      }
    }
  }, [bookingId])

  // Override router navigation to set flag
  const originalPush = router.push
  router.push = (href: string) => {
    isNavigating.current = true
    return originalPush(href)
  }

  return <>{children}</>
} 