import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
// ...existing code...
import { Booking, Event } from '@/lib/types/database'
import DashboardClient from '@/components/dashboard/dashboard-client'

async function getUserBookings(userId: string): Promise<(Booking & { event: Event })[]> {
    const supabase = await createClient()

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
      *,
      event:events(*, timeline)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching bookings:', error)
        return []
    }

    return bookings as (Booking & { event: Event })[]
}

export default async function DashboardPage() {
    const profile = await getCurrentProfile()

    if (!profile) {
        redirect('/auth/login')
    }

    const bookings = await getUserBookings(profile.id)

    return (
        <div className="bg-gray-50">
            {/* Page Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                </div>
            </div>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <DashboardClient bookings={bookings} />
            </div>
        </div>
    )
}