'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface RedirectWithSkeletonProps {
  targetUrl: string
}

// Skeleton component for the event page
function EventSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto py-2 md:py-12 px-2 md:px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-6"></div>
                
                {/* Event Info Skeleton */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center">
                    <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded mr-3"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                  </div>
                  <div className="flex items-center">
                    <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded mr-3"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                  </div>
                  <div className="flex items-center">
                    <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded mr-3"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>

                {/* Description Skeleton */}
                <div className="space-y-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sticky top-6 border border-gray-200 dark:border-gray-700">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-6"></div>
                
                {/* Price Skeleton */}
                <div className="mb-6">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>

                {/* Attendees Skeleton */}
                <div className="mb-6">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                </div>

                {/* Button Skeleton */}
                <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RedirectWithSkeleton({ targetUrl }: RedirectWithSkeletonProps) {
  const router = useRouter()

  useEffect(() => {
    // Show skeleton for 1 second, then redirect
    const timer = setTimeout(() => {
      router.push(targetUrl)
    }, 1000)

    return () => clearTimeout(timer)
  }, [targetUrl, router])

  // Show skeleton while waiting to redirect
  return <EventSkeleton />
}
