import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Booking, Event } from '@/lib/types/database'

async function getUserBookings(userId: string): Promise<(Booking & { event: Event })[]> {
    const supabase = await createClient()

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
      *,
      event:events(*)
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            case 'refunded':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
                return '✓'
            case 'pending':
                return '⏳'
            case 'cancelled':
                return '❌'
            case 'refunded':
                return '💰'
            default:
                return '❓'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-gray-600">Welcome back, {profile.full_name || profile.email}</p>
                        </div>
                        <nav className="flex items-center space-x-4">
                            <Link
                                href="/"
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Browse Events
                            </Link>
                            <Link
                                href="/profile"
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Profile
                            </Link>
                            {(profile.role === 'admin' || profile.role === 'organizer') && (
                                <Link
                                    href="/organizer"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Manage Events
                                </Link>
                            )}
                            {profile.role === 'admin' && (
                                <Link
                                    href="/admin/users"
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Manage Users
                                </Link>
                            )}
                        </nav>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">🎫</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Bookings
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {bookings.length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Confirmed
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {bookings.filter(b => b.status === 'confirmed').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">⏳</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Pending
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {bookings.filter(b => b.status === 'pending').length}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Spent
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            ${bookings
                                                .filter(b => b.status === 'confirmed' || b.status === 'verified')
                                                .reduce((sum, b) => sum + b.total_amount, 0)
                                                .toFixed(2)}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bookings List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">My Bookings</h2>
                    </div>

                    {bookings.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-4xl mb-4 block">🎫</span>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No bookings yet
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Start by browsing our amazing events and book your first ticket!
                            </p>
                            <Link
                                href="/"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Browse Events
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {bookings.map((booking) => (
                                <div key={booking.id} className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {booking.event.title}
                                                </h3>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                    {getStatusIcon(booking.status)} {booking.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <span className="mr-2">📅</span>
                                                    <span>
                                                        {new Date(booking.event.start_date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">📍</span>
                                                    <span>{booking.event.location}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">🎫</span>
                                                    <span>{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">🆔</span>
                                                    <span className="font-mono text-xs">{booking.booking_id || booking.id.slice(0, 8)}</span>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-lg font-bold text-gray-900">
                                                    $AUD {booking.total_amount.toFixed(2)}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    Booked on {new Date(booking.booking_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="ml-6 flex-shrink-0 flex space-x-2">
                                            <Link
                                                href={`/booking/${booking.booking_id || booking.id}`}
                                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                View Details
                                            </Link>
                                            <Link
                                                href={`/events/${booking.event.id}`}
                                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                View Event
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}