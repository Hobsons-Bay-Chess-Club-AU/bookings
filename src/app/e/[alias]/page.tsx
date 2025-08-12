import { createSimpleClient } from '@/lib/supabase/server'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { HiExclamationTriangle } from 'react-icons/hi2'
import RedirectWithSkeleton from './redirect-with-skeleton'

interface PageProps {
  params: Promise<{
    alias: string
  }>
}

export default async function ShortUrlPage({ params }: PageProps) {
  try {
    const { alias } = await params
    const supabase = createSimpleClient()

    const aliasUpper = alias.toUpperCase()
    const { data: event, error } = await supabase
      .from('events')
      .select('id, status')
      .eq('alias', aliasUpper)
      .single()

    if (error || !event) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-500 mb-4">
              <HiExclamationTriangle className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Event Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">The event you are looking for could not be found.</p>
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" text="Redirecting to home..." />
            </div>
          </div>
        </div>
      )
    }

    // Return the client component that will show skeleton and redirect
    return <RedirectWithSkeleton targetUrl={`/events/${event.id}`} />
  } catch {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-500 mb-4">
            <HiExclamationTriangle className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Failed to load event. Please try again later.</p>
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" text="Redirecting to home..." />
          </div>
        </div>
      </div>
    )
  }
} 