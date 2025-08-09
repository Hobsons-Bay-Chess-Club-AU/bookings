"use client";
import React, { useState, useEffect } from "react";
import { Booking, Event, Profile, Participant, DiscountApplication } from '@/lib/types/database';
import {
    HiTicket,
    HiCheckCircle,
    HiClock,
    HiXCircle,
    HiCurrencyDollar,
    HiCalendarDays,
    HiUser,
    HiUsers,
    HiMapPin,
    HiEnvelope,
    HiPhone,
    HiReceiptRefund,
    HiIdentification,
    HiCreditCard,
    HiDocumentText,
    HiInformationCircle,
    HiArrowRight
} from 'react-icons/hi2';

interface BookingWithDetails extends Booking {
    event: Event;
    user: Profile;
    participants?: Participant[];
    discount_applications?: DiscountApplication[];
}

interface BookingDetailsPageProps {
    params: Promise<{ id: string; bookingId: string }>;
}

export default function BookingDetailsPage({ params }: BookingDetailsPageProps) {
    const [booking, setBooking] = useState<BookingWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [eventId, setEventId] = useState<string>('');
    const [bookingId, setBookingId] = useState<string>('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const getParams = async () => {
            const resolvedParams = await params;
            setEventId(resolvedParams.id);
            setBookingId(resolvedParams.bookingId);
            fetchBookingDetails(resolvedParams.id, resolvedParams.bookingId);
        };
        getParams();
    }, [params]);

    const fetchBookingDetails = async (eventId: string, bookingId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/organizer/events/${eventId}/bookings/${bookingId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch booking details');
            }
            const data = await response.json();
            setBooking(data);
        } catch (error) {
            console.error('Error fetching booking details:', error);
            setError('Failed to load booking details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
            case 'pending':
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
            case 'cancelled':
                return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
            case 'refunded':
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'verified':
                return <HiCheckCircle className="h-5 w-5" />;
            case 'pending':
                return <HiClock className="h-5 w-5" />;
            case 'cancelled':
                return <HiXCircle className="h-5 w-5" />;
            case 'refunded':
                return <HiCurrencyDollar className="h-5 w-5" />;
            default:
                return <HiTicket className="h-5 w-5" />;
        }
    };

    const updateBookingStatus = async (newStatus: string) => {
        if (!booking) return;

        try {
            setActionLoading(true);
            const response = await fetch(`/api/organizer/events/${eventId}/bookings/${booking.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update booking status');
            }

            // Refresh booking details
            await fetchBookingDetails(eventId, bookingId);
        } catch (error) {
            console.error('Error updating booking status:', error);
            setError('Failed to update booking status');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="text-center py-12">
                <HiXCircle className="h-16 w-16 text-red-400 dark:text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Error Loading Booking</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Booking not found'}</p>
               
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-0 px-0 md:py-12 md:px-4 sm:px-6 lg:px-0">
            {/* Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
                <div className="flex items-center space-x-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Booking Details</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Booking ID: {booking.booking_id || booking.id.slice(0, 8)}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    <span className="ml-2">{booking.status}</span>
                </span>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Booking Information */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Event Details */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <HiCalendarDays className="h-5 w-5 mr-2" />
                            Event Information
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{booking.event.title}</h3>
                                {booking.event.description && (
                                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm line-clamp-3">{booking.event.description}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <HiCalendarDays className="h-4 w-4 mr-2" />
                                    <div>
                                        <div className="font-medium">
                                            {new Date(booking.event.start_date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                            {new Date(booking.event.start_date).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })} - {new Date(booking.event.end_date).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <HiMapPin className="h-4 w-4 mr-2" />
                                    <span>{booking.event.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Details */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <HiUser className="h-5 w-5 mr-2" />
                            Customer Information
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <HiUser className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-3" />
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                        {booking.user.full_name || 'No name provided'}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Customer</div>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <HiEnvelope className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-3" />
                                <div>
                                    <div className="text-gray-900 dark:text-gray-100">{booking.user.email}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                                </div>
                            </div>
                            {booking.user.phone && (
                                <div className="flex items-center">
                                    <HiPhone className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-3" />
                                    <div>
                                        <div className="text-gray-900 dark:text-gray-100">{booking.user.phone}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Phone</div>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center">
                                <HiIdentification className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-3" />
                                <div>
                                    <div className="text-gray-900 dark:text-gray-100 capitalize">{booking.user.role}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">User Role</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Participants */}
                    {booking.participants && booking.participants.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                                    <HiUsers className="h-5 w-5 mr-2" />
                                    Participants ({booking.participants.length})
                                </h2>
                            </div>
                            
                            <div className="overflow-x-auto">
                                {/* Desktop Table */}
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden lg:table">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Contact
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Additional Info
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {booking.participants.map((participant, index) => (
                                            <tr key={participant.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {participant.first_name} {participant.last_name}
                                                    </div>
                                                    {participant.date_of_birth && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            DOB: {participant.date_of_birth}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="space-y-1">
                                                        {participant.email && (
                                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                                <HiEnvelope className="h-3 w-3 mr-1" />
                                                                {participant.email}
                                                            </div>
                                                        )}
                                                        {participant.phone && (
                                                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                                <HiPhone className="h-3 w-3 mr-1" />
                                                                {participant.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {participant.custom_data && Object.keys(participant.custom_data).length > 0 ? (
                                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                                            {Object.entries(participant.custom_data).map(([key, value]) => (
                                                                <div key={key} className="mb-1">
                                                                    <span className="font-medium">{key}:</span> {String(value)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">No additional info</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Mobile Cards */}
                                <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                                    {booking.participants.map((participant, index) => (
                                        <div key={participant.id || index} className="p-6">
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                                        {participant.first_name} {participant.last_name}
                                                    </div>
                                                    {participant.date_of_birth && (
                                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                                            DOB: {participant.date_of_birth}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    {participant.email && (
                                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                            <HiEnvelope className="h-4 w-4 mr-2" />
                                                            {participant.email}
                                                        </div>
                                                    )}
                                                    {participant.phone && (
                                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                                            <HiPhone className="h-4 w-4 mr-2" />
                                                            {participant.phone}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {participant.custom_data && Object.keys(participant.custom_data).length > 0 && (
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        <div className="font-medium mb-1">Additional Info:</div>
                                                        {Object.entries(participant.custom_data).map(([key, value]) => (
                                                            <div key={key} className="text-xs">
                                                                <span className="font-medium">{key}:</span> {String(value)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Booking Summary & Actions */}
                <div className="space-y-6">
                    {/* Booking Summary */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <HiTicket className="h-5 w-5 mr-2" />
                            Booking Summary
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Unit Price:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{booking.event.price === 0 ? 'Varies' : `$${booking.event.price.toFixed(2)}`}</span>
                            </div>
                            
                            {/* Discount Information */}
                            {booking.discount_applications && booking.discount_applications.length > 0 && (
                                <>
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">${(booking.event.price * booking.quantity).toFixed(2)}</span>
                                        </div>
                                        
                                        {booking.discount_applications.map((discountApp, index) => (
                                            <div key={index} className="flex justify-between text-green-600 dark:text-green-400">
                                                <span className="text-sm">
                                                    {discountApp.discount?.name || 'Discount'}
                                                    {discountApp.discount?.discount_type === 'participant_based' && 
                                                        ` (${Math.round(discountApp.applied_value / booking.event.price)} eligible)`
                                                    }
                                                </span>
                                                <span className="text-sm font-medium">
                                                    -${discountApp.applied_value.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                        
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                            <div className="flex justify-between">
                                                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">Total Amount:</span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">${booking.total_amount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            {/* No discounts applied */}
                            {(!booking.discount_applications || booking.discount_applications.length === 0) && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                                    <div className="flex justify-between">
                                        <span className="text-lg font-medium text-gray-900 dark:text-gray-100">Total Amount:</span>
                                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">${booking.total_amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Booked on {new Date(booking.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <HiCreditCard className="h-5 w-5 mr-2" />
                            Payment Information
                        </h2>
                        <div className="space-y-3">
                            {booking.stripe_payment_intent_id && (
                                <div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Payment Intent ID:</div>
                                    <div className="font-mono text-xs text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                        {booking.stripe_payment_intent_id}
                                    </div>
                                </div>
                            )}
                            {booking.stripe_session_id && (
                                <div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Session ID:</div>
                                    <div className="font-mono text-xs text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-2 rounded overflow-x-hidden">
                                        {booking.stripe_session_id}
                                    </div>
                                </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Payment processed on {new Date(booking.booking_date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Refund Information */}
                    {booking.refund_status !== 'none' && (
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                                <HiReceiptRefund className="h-5 w-5 mr-2" />
                                Refund Information
                            </h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.refund_status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                        booking.refund_status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                            booking.refund_status === 'requested' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        }`}>
                                        {booking.refund_status}
                                    </span>
                                </div>
                                {booking.refund_amount && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Refund Amount:</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">${booking.refund_amount.toFixed(2)}</span>
                                    </div>
                                )}
                                {booking.refund_percentage && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Refund Percentage:</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{booking.refund_percentage}%</span>
                                    </div>
                                )}
                                {booking.refund_requested_at && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Requested: {new Date(booking.refund_requested_at).toLocaleDateString()}
                                    </div>
                                )}
                                {booking.refund_processed_at && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Processed: {new Date(booking.refund_processed_at).toLocaleDateString()}
                                    </div>
                                )}
                                {booking.refund_reason && (
                                    <div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Reason:</div>
                                        <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                            {booking.refund_reason}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Transfer Information */}
                    {booking.transferred_from_event_id && (
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                                <HiArrowRight className="h-5 w-5 mr-2" />
                                Transfer Information
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <span className="text-blue-600 dark:text-blue-400 mr-2">🔄</span>
                                    <span className="text-gray-900 dark:text-gray-100">This booking was transferred from another event</span>
                                </div>
                                {booking.transferred_at && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Transferred on: {new Date(booking.transferred_at).toLocaleDateString()}
                                    </div>
                                )}
                                {booking.transferred_by && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Transferred by: {booking.transferred_by}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Organizer Actions */}
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                            <HiDocumentText className="h-5 w-5 mr-2" />
                            Organizer Actions
                        </h2>
                        <div className="space-y-3">
                            {booking.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => updateBookingStatus('confirmed')}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <HiCheckCircle className="h-4 w-4 mr-2" />
                                        Confirm Booking
                                    </button>
                                    <button
                                        onClick={() => updateBookingStatus('cancelled')}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                                    >
                                        <HiXCircle className="h-4 w-4 mr-2" />
                                        Cancel Booking
                                    </button>
                                </>
                            )}
                            {booking.status === 'confirmed' && (
                                <>
                                    <button
                                        onClick={() => updateBookingStatus('verified')}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <HiCheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Verified
                                    </button>
                                    <button
                                        onClick={() => updateBookingStatus('cancelled')}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                                    >
                                        <HiXCircle className="h-4 w-4 mr-2" />
                                        Cancel Booking
                                    </button>
                                </>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <HiInformationCircle className="h-3 w-3 mr-1" />
                                Status changes will be logged and may trigger notifications.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
