"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { Booking, Event, Profile, Participant } from '@/lib/types/database';
import {
    HiArrowLeft,
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
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            case 'refunded':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
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
                <HiXCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-medium text-gray-900 mb-2">Error Loading Booking</h2>
                <p className="text-gray-600 mb-4">{error || 'Booking not found'}</p>
                <Link
                    href={`/organizer/events/${eventId}/bookings`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <HiArrowLeft className="h-4 w-4 mr-2" />
                    Back to Event Bookings
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link
                        href={`/organizer/events/${eventId}/bookings`}
                        className="inline-flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <HiArrowLeft className="h-5 w-5 mr-2" />
                        Back to Event Bookings
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
                        <p className="text-gray-600 mt-1">
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
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <HiCalendarDays className="h-5 w-5 mr-2" />
                            Event Information
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">{booking.event.title}</h3>
                                {booking.event.description && (
                                    <p className="text-gray-600 mt-2 text-sm line-clamp-3">{booking.event.description}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center text-sm text-gray-600">
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
                                        <div className="text-xs text-gray-500">
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
                                <div className="flex items-center text-sm text-gray-600">
                                    <HiMapPin className="h-4 w-4 mr-2" />
                                    <span>{booking.event.location}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Details */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <HiUser className="h-5 w-5 mr-2" />
                            Customer Information
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <HiUser className="h-4 w-4 text-gray-400 mr-3" />
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {booking.user.full_name || 'No name provided'}
                                    </div>
                                    <div className="text-sm text-gray-500">Customer</div>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <HiEnvelope className="h-4 w-4 text-gray-400 mr-3" />
                                <div>
                                    <div className="text-gray-900">{booking.user.email}</div>
                                    <div className="text-sm text-gray-500">Email</div>
                                </div>
                            </div>
                            {booking.user.phone && (
                                <div className="flex items-center">
                                    <HiPhone className="h-4 w-4 text-gray-400 mr-3" />
                                    <div>
                                        <div className="text-gray-900">{booking.user.phone}</div>
                                        <div className="text-sm text-gray-500">Phone</div>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center">
                                <HiIdentification className="h-4 w-4 text-gray-400 mr-3" />
                                <div>
                                    <div className="text-gray-900 capitalize">{booking.user.role}</div>
                                    <div className="text-sm text-gray-500">User Role</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Participants */}
                    {booking.participants && booking.participants.length > 0 && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <HiUsers className="h-5 w-5 mr-2" />
                                Participants ({booking.participants.length})
                            </h2>
                            <div className="space-y-4">
                                {booking.participants.map((participant, index) => (
                                    <div key={participant.id || index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {participant.first_name} {participant.last_name}
                                                </div>
                                                {participant.email && (
                                                    <div className="text-sm text-gray-600 flex items-center mt-1">
                                                        <HiEnvelope className="h-3 w-3 mr-1" />
                                                        {participant.email}
                                                    </div>
                                                )}
                                                {participant.phone && (
                                                    <div className="text-sm text-gray-600 flex items-center mt-1">
                                                        <HiPhone className="h-3 w-3 mr-1" />
                                                        {participant.phone}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                {participant.date_of_birth && (
                                                    <div className="text-sm text-gray-600">
                                                        <span className="font-medium">DOB:</span> {participant.date_of_birth}
                                                    </div>
                                                )}
                                                {participant.custom_data && Object.keys(participant.custom_data).length > 0 && (
                                                    <div className="text-sm text-gray-600 mt-2">
                                                        <span className="font-medium">Additional Info:</span>
                                                        <div className="mt-1">
                                                            {Object.entries(participant.custom_data).map(([key, value]) => (
                                                                <div key={key} className="text-xs">
                                                                    <span className="font-medium">{key}:</span> {String(value)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Booking Summary & Actions */}
                <div className="space-y-6">
                    {/* Booking Summary */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <HiTicket className="h-5 w-5 mr-2" />
                            Booking Summary
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="font-medium">{booking.quantity} ticket{booking.quantity > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Unit Price:</span>
                                <span className="font-medium">${booking.event.price.toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-2">
                                <div className="flex justify-between">
                                    <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                                    <span className="text-lg font-bold text-gray-900">${booking.total_amount.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500">
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
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <HiCreditCard className="h-5 w-5 mr-2" />
                            Payment Information
                        </h2>
                        <div className="space-y-3">
                            {booking.stripe_payment_intent_id && (
                                <div>
                                    <div className="text-sm text-gray-600">Payment Intent ID:</div>
                                    <div className="font-mono text-xs text-gray-900 bg-gray-50 p-2 rounded">
                                        {booking.stripe_payment_intent_id}
                                    </div>
                                </div>
                            )}
                            {booking.stripe_session_id && (
                                <div>
                                    <div className="text-sm text-gray-600">Session ID:</div>
                                    <div className="font-mono text-xs text-gray-900 bg-gray-50 p-2 rounded">
                                        {booking.stripe_session_id}
                                    </div>
                                </div>
                            )}
                            <div className="text-xs text-gray-500">
                                Payment processed on {new Date(booking.booking_date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Refund Information */}
                    {booking.refund_status !== 'none' && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <HiReceiptRefund className="h-5 w-5 mr-2" />
                                Refund Information
                            </h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.refund_status === 'completed' ? 'bg-green-100 text-green-800' :
                                        booking.refund_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                            booking.refund_status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {booking.refund_status}
                                    </span>
                                </div>
                                {booking.refund_amount && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Refund Amount:</span>
                                        <span className="font-medium">${booking.refund_amount.toFixed(2)}</span>
                                    </div>
                                )}
                                {booking.refund_percentage && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Refund Percentage:</span>
                                        <span className="font-medium">{booking.refund_percentage}%</span>
                                    </div>
                                )}
                                {booking.refund_requested_at && (
                                    <div className="text-xs text-gray-500">
                                        Requested: {new Date(booking.refund_requested_at).toLocaleDateString()}
                                    </div>
                                )}
                                {booking.refund_processed_at && (
                                    <div className="text-xs text-gray-500">
                                        Processed: {new Date(booking.refund_processed_at).toLocaleDateString()}
                                    </div>
                                )}
                                {booking.refund_reason && (
                                    <div>
                                        <div className="text-sm text-gray-600">Reason:</div>
                                        <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                            {booking.refund_reason}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Transfer Information */}
                    {booking.transferred_from_event_id && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <HiArrowRight className="h-5 w-5 mr-2" />
                                Transfer Information
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <span className="text-blue-600 mr-2">🔄</span>
                                    <span className="text-gray-900">This booking was transferred from another event</span>
                                </div>
                                {booking.transferred_at && (
                                    <div className="text-xs text-gray-500">
                                        Transferred on: {new Date(booking.transferred_at).toLocaleDateString()}
                                    </div>
                                )}
                                {booking.transferred_by && (
                                    <div className="text-xs text-gray-500">
                                        Transferred by: {booking.transferred_by}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Organizer Actions */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
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
                                        className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
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
                                        className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <HiXCircle className="h-4 w-4 mr-2" />
                                        Cancel Booking
                                    </button>
                                </>
                            )}
                            <div className="text-xs text-gray-500 flex items-center">
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
