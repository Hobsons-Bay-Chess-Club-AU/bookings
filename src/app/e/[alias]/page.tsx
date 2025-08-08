'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/components/ui/loading-spinner'

interface PageProps {
  params: Promise<{
    alias: string
  }>
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
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
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

export default function ShortUrlPage({ params }: PageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const log = (...args: unknown[]) => {
     
    console.log('[AliasRedirect]', new Date().toISOString(), ...args)
  }

  useEffect(() => {
    log('effect:start', { visibility: document.visibilityState, online: navigator.onLine })
    const resolveAlias = async () => {
      try {
        log('resolveAlias:awaiting-params')
        const { alias } = await params
        log('resolveAlias:params-resolved', { alias })
        
        const upper = alias.toUpperCase()
        log('supabase:query:start', { aliasUpper: upper })
        const { data: event, error } = await supabase
          .from('events')
          .select('id')
          .eq('alias', upper)
          .single()
        log('supabase:query:end', { errorPresent: Boolean(error), hasEvent: Boolean(event) })

        if (error || !event) {
          log('resolveAlias:not-found', { error })
          setError('Event not found')
          setTimeout(() => {
            log('router:push:home')
            router.push('/')
          }, 2000)
          return
        }

        // Redirect to the full event page
        const target = `/events/${event.id}`
        log('router:push:event', { target })
        router.push(target)
      } catch (err) {
        log('resolveAlias:error', { err })
        setError('Failed to load event')
        setTimeout(() => {
          log('router:push:home-after-error')
          router.push('/')
        }, 2000)
      } finally {
        setLoading(false)
        log('effect:done', { loading: false })
      }
    }

    resolveAlias()
  }, [params, router, supabase])

  // Show skeleton while loading
  if (loading) {
    return <EventSkeleton />
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Event Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" text="Redirecting to home..." />
          </div>
        </div>
      </div>
    )
  }

  // This should never be reached, but just in case
  return <EventSkeleton />
} 