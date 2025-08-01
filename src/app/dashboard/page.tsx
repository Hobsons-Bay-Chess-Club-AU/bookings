import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SiteNav from '@/components/layout/site-nav'
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
            case 'verified':
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
            case 'verified':
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
            {/* Navigation */}
            <SiteNav />

            {/* Page Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                </div>
            </div>

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
                                            {bookings.filter(b => b.status === 'confirmed' || b.status === 'verified').length}
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
                                <div key={booking.id} className="p-4 md:p-6">
                                    {/* Mobile Card Layout */}
                                    <div className="md:hidden space-y-3">
                                        <div className="flex items-start justify-between">
                                            <Link 
                                                href={`/events/${booking.event.id}`}
                                                className="text-lg font-medium text-indigo-600 hover:text-indigo-800 flex-1 mr-3"
                                            >
                                                {booking.event.title}
                                            </Link>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                {getStatusIcon(booking.status)} {booking.status}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-2 text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <span className="mr-2">📅</span>
                                                <span>{new Date(booking.event.start_date).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}</span>
                                                <span className="mx-2">•</span>
                                                <span>{new Date(booking.event.start_date).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <span className="mr-2">📍</span>
                                                <span>{booking.event.location}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <span className="mr-2">🎫</span>
                                                    <span>{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">🆔</span>
                                                    <span className="font-mono text-xs">{booking.booking_id || booking.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <span className="text-sm text-gray-500">
                                                    Booked: {new Date(booking.booking_date).toLocaleDateString()}
                                                </span>
                                                <span className="text-lg font-bold text-gray-900">
                                                    AUD ${booking.total_amount.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-3">
                                            <Link
                                                href={`/booking/${booking.booking_id || booking.id}`}
                                                className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Desktop Table Layout */}
                                    <div className="hidden md:block">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                                                <div className="col-span-2">
                                                    <Link 
                                                        href={`/events/${booking.event.id}`}
                                                        className="text-lg font-medium text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        {booking.event.title}
                                                    </Link>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {booking.event.location}
                                                    </div>
                                                </div>
                                                
                                                <div className="text-sm text-gray-600">
                                                    <div>{new Date(booking.event.start_date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(booking.event.start_date).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                                
                                                <div className="text-sm text-gray-600">
                                                    <div>{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</div>
                                                    <div className="font-mono text-xs text-gray-500">
                                                        ID: {booking.booking_id || booking.id.slice(0, 8)}
                                                    </div>
                                                </div>
                                                
                                                <div className="text-sm text-gray-600">
                                                    <div className="font-medium text-gray-900">AUD ${booking.total_amount.toFixed(2)}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Booked: {new Date(booking.booking_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                                        {getStatusIcon(booking.status)} {booking.status}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="ml-4 flex-shrink-0">
                                                <Link
                                                    href={`/booking/${booking.booking_id || booking.id}`}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                                >
                                                    View Details
                                                </Link>
                                            </div>
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