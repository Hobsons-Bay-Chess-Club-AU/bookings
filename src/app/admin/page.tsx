import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
    HiUsers, 
    HiCalendarDays, 
    HiCurrencyDollar, 
    HiTicket,
    HiArrowTrendingUp
} from 'react-icons/hi2'

interface DashboardStats {
    totalUsers: number
    totalEvents: number
    totalBookings: number
    totalRevenue: number
    recentBookings: Array<{
        id: string
        booking_id: string
        total_amount: number
        status: string
        booking_date: string
        event: {
            title: string
            id: string
        }
        user: {
            full_name: string
            email: string
        }
    }>
    recentEvents: Array<{
        id: string
        title: string
        status: string
        start_date: string
        current_attendees: number
        max_attendees: number | null
        organizer: {
            full_name: string
        }
    }>
    pendingBookings: number
    confirmedBookings: number
    cancelledBookings: number
    publishedEvents: number
    draftEvents: number
}

interface RawBooking {
    id: string
    booking_id: string
    total_amount: number
    status: string
    booking_date: string
    event: {
        title: string
        id: string
    } | Array<{
        title: string
        id: string
    }>
    user: {
        full_name: string
        email: string
    } | Array<{
        full_name: string
        email: string
    }>
}

interface RawEvent {
    id: string
    title: string
    status: string
    start_date: string
    current_attendees: number
    max_attendees: number | null
    organizer: {
        full_name: string
    } | Array<{
        full_name: string
    }>
}

async function getDashboardStats(): Promise<DashboardStats> {
    const supabase = await createClient()

    // Get total users
    const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    // Get total events
    const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })

    // Get total bookings
    const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

    // Get total revenue (sum of confirmed bookings)
    const { data: revenueData } = await supabase
        .from('bookings')
        .select('total_amount')
        .in('status', ['confirmed', 'verified'])

    const totalRevenue = revenueData?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0

    // Get recent bookings (last 10)
    const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
            id,
            booking_id,
            total_amount,
            status,
            booking_date,
            event:events!bookings_event_id_fkey(id, title),
            user:profiles!bookings_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

    // Get recent events (last 10)
    const { data: recentEvents } = await supabase
        .from('events')
        .select(`
            id,
            title,
            status,
            start_date,
            current_attendees,
            max_attendees,
            organizer:profiles!events_organizer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

    // Process recent bookings to handle array responses
    const processedRecentBookings = (recentBookings || []).map((booking: RawBooking) => ({
        id: booking.id,
        booking_id: booking.booking_id,
        total_amount: booking.total_amount,
        status: booking.status,
        booking_date: booking.booking_date,
        event: Array.isArray(booking.event) ? booking.event[0] : booking.event,
        user: Array.isArray(booking.user) ? booking.user[0] : booking.user
    }))

    // Process recent events to handle array responses
    const processedRecentEvents = (recentEvents || []).map((event: RawEvent) => ({
        id: event.id,
        title: event.title,
        status: event.status,
        start_date: event.start_date,
        current_attendees: event.current_attendees,
        max_attendees: event.max_attendees,
        organizer: Array.isArray(event.organizer) ? event.organizer[0] : event.organizer
    }))

    // Get booking status counts
    const { count: pendingBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    const { count: confirmedBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('status', ['confirmed', 'verified'])

    const { count: cancelledBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')

    // Get event status counts
    const { count: publishedEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')

    const { count: draftEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')

    return {
        totalUsers: totalUsers || 0,
        totalEvents: totalEvents || 0,
        totalBookings: totalBookings || 0,
        totalRevenue,
        recentBookings: processedRecentBookings,
        recentEvents: processedRecentEvents,
        pendingBookings: pendingBookings || 0,
        confirmedBookings: confirmedBookings || 0,
        cancelledBookings: cancelledBookings || 0,
        publishedEvents: publishedEvents || 0,
        draftEvents: draftEvents || 0
    }
}

function getStatusColor(status: string) {
    switch (status) {
        case 'confirmed':
        case 'verified':
            return 'text-green-600 bg-green-100'
        case 'pending':
            return 'text-yellow-600 bg-yellow-100'
        case 'cancelled':
            return 'text-red-600 bg-red-100'
        case 'published':
            return 'text-blue-600 bg-blue-100'
        case 'draft':
            return 'text-gray-600 bg-gray-100'
        default:
            return 'text-gray-600 bg-gray-100'
    }
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD'
    }).format(amount)
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export default async function AdminDashboard() {
    const user = await getCurrentProfile()
    
    if (!user || user.role !== 'admin') {
        redirect('/unauthorized')
    }

    const stats = await getDashboardStats()

    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">System overview and key metrics</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Users */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiUsers className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</p>
                            </div>
                        </div>
                    </div>

                    {/* Total Events */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiCalendarDays className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Events</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalEvents}</p>
                                <div className="flex items-center mt-1">
                                    <span className="text-xs text-green-600 dark:text-green-400">{stats.publishedEvents} published</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">•</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{stats.draftEvents} drafts</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Bookings */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiTicket className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Bookings</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalBookings}</p>
                                <div className="flex items-center mt-1">
                                    <span className="text-xs text-green-600 dark:text-green-400">{stats.confirmedBookings} confirmed</span>
                                    <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">•</span>
                                    <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">{stats.pendingBookings} pending</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Total Revenue */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <HiCurrencyDollar className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(stats.totalRevenue)}</p>
                                <div className="flex items-center mt-1">
                                    <HiArrowTrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-xs text-green-600 dark:text-green-400 ml-1">From confirmed bookings</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Bookings */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Bookings</h3>
                                <Link
                                    href="/admin/bookings"
                                    className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                    View all →
                                </Link>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {stats.recentBookings.length > 0 ? (
                                stats.recentBookings.map((booking) => (
                                    <div key={booking.id} className="px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {booking.event?.title}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {booking.user?.full_name || booking.user?.email} • {formatCurrency(booking.total_amount)}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {formatDate(booking.booking_date)}
                                                </p>
                                            </div>
                                            <div className="ml-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                    No recent bookings
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Events */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Events</h3>
                                <Link
                                    href="/admin/events"
                                    className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                    View all →
                                </Link>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {stats.recentEvents.length > 0 ? (
                                stats.recentEvents.map((event) => (
                                    <div key={event.id} className="px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {event.title}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {event.organizer?.full_name} • {formatDate(event.start_date)}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {event.current_attendees} / {event.max_attendees || '∞'} attendees
                                                </p>
                                            </div>
                                            <div className="ml-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                    No recent events
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Quick Actions</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link
                                href="/admin/users"
                                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <HiUsers className="h-6 w-6 text-blue-600 mr-3" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">Manage Users</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">View and manage user accounts</p>
                                </div>
                            </Link>
                            <Link
                                href="/admin/bookings"
                                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <HiTicket className="h-6 w-6 text-purple-600 mr-3" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">View Bookings</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Monitor all booking activity</p>
                                </div>
                            </Link>
                            <Link
                                href="/admin/events"
                                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <HiCalendarDays className="h-6 w-6 text-green-600 mr-3" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">Manage Events</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Overview of all events</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 