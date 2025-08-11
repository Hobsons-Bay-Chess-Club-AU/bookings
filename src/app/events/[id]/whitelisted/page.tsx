import { createClient } from '@/lib/supabase/server'
import WhitelistedManagerClient from '@/components/events/whitelisted-manager-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WhitelistedManagerPage({ params }: PageProps) {
  const { id: eventId } = await params
  const supabase = await createClient()

  // Get current user
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-700 dark:text-gray-200">You must be logged in to view this page.</p>
      </div>
    )
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  // Load event to check organizer
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, organizer_id, settings')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-700 dark:text-gray-200">Event not found.</p>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'
  const isOrganizerOfEvent = event.organizer_id === user.id
  if (!isAdmin && !isOrganizerOfEvent) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-700 dark:text-gray-200">You do not have permission to manage this event.</p>
      </div>
    )
  }

  // Fetch whitelisted bookings for event
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_id,
      status,
      quantity,
      total_amount,
      booking_date,
      profiles:profiles!bookings_user_id_fkey (id, email, full_name, phone)
    `)
    .eq('event_id', eventId)
    .eq('status', 'whitelisted')
    .order('booking_date', { ascending: true })

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Whitelist Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Event: {event.title}</p>
          {!event.settings?.whitelist_enabled && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Whitelist mode is disabled in event settings. This page will still show whitelisted records already captured.</p>
          )}
        </div>

        <WhitelistedManagerClient
          eventId={eventId}
          bookings={(bookings || []).map((b) => ({
            id: b.id,
            booking_id: b.booking_id,
            status: b.status,
            quantity: b.quantity,
            total_amount: b.total_amount,
            booking_date: b.booking_date,
            user: {
              id: b.profiles?.[0]?.id,
              full_name: b.profiles?.[0]?.full_name,
              email: b.profiles?.[0]?.email,
              phone: b.profiles?.[0]?.phone,
            }
          }))}
        />
      </div>
    </div>
  )
}


