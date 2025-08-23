"use client";
import React, { useState, useEffect } from "react";
import Breadcrumb from '@/components/ui/breadcrumb'
import ConfirmationModal from '@/components/ui/confirmation-modal'
import BookingDetailsClient from './booking-details-client'
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
    HiArrowRight,
    HiEye,
    HiArrowPath,
    HiCog6Tooth
} from 'react-icons/hi2';
import { SectionLoader } from '@/components/ui/loading-states'
import ActionMenu from '@/components/ui/action-menu'

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
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: string; status: string; title: string; message: string; variant: 'danger' | 'warning' | 'info' } | null>(null);

    const renderCustomField = (fieldKey: string, fieldValue: unknown): React.ReactNode => {
        const label = fieldKey;

        const renderFideIdLink = (idValue: string) => (
            <a
                href={`https://ratings.fide.com/profile/${idValue}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
                {idValue}
            </a>
        );

        const renderObject = (obj: Record<string, unknown>) => {
            const hasPlayerShape = typeof obj.id === 'string' && typeof obj.name === 'string';
            if (hasPlayerShape) {
                const idText = obj.id as string;
                const nameText = obj.name as string;
                const parts: string[] = [];
                if (obj.std_rating) parts.push(`Std: ${obj.std_rating}`);
                if (obj.rapid_rating) parts.push(`Rapid: ${obj.rapid_rating}`);
                if (obj.blitz_rating) parts.push(`Blitz: ${obj.blitz_rating}`);
                if (obj.quick_rating) parts.push(`Quick: ${obj.quick_rating}`);
                const ratingsText = parts.length > 0 ? ` - ${parts.join(', ')}` : '';
                const idNode = fieldKey.toLowerCase().includes('fide') ? renderFideIdLink(idText) : <>{idText}</>;
                return (
                    <>
                        {nameText} (ID: {idNode}){ratingsText}
                    </>
                );
            }

            const entries = Object.entries(obj)
                .filter(([, value]) => value !== null && value !== undefined && value !== '')
                .slice(0, 5);
            if (entries.length === 0) return <>-</>;
            return <>{entries.map(([k, v]) => `${k}: ${v}`).join(', ')}</>;
        };

        let valueNode: React.ReactNode;
        if (fieldValue === null || fieldValue === undefined) {
            valueNode = <>-</>;
        } else if (Array.isArray(fieldValue)) {
            valueNode = <>{fieldValue.join(', ')}</>;
        } else if (typeof fieldValue === 'object') {
            valueNode = renderObject(fieldValue as Record<string, unknown>);
        } else if (typeof fieldValue === 'boolean') {
            valueNode = <>{fieldValue ? 'Yes' : 'No'}</>;
        } else {
            valueNode = <>{String(fieldValue)}</>;
        }

        return (
            <div className="mb-1">
                <span className="font-medium">{label}:</span> {valueNode}
            </div>
        );
    };

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
            case 'pending_approval':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
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
            case 'pending_approval':
                return <HiClock className="h-5 w-5" />;
            case 'cancelled':
                return <HiXCircle className="h-5 w-5" />;
            case 'refunded':
                return <HiCurrencyDollar className="h-5 w-5" />;
            default:
                return <HiTicket className="h-5 w-5" />;
        }
    };

    const handleActionClick = (actionType: string, newStatus: string) => {
        let title = '';
        let message = '';
        let variant: 'danger' | 'warning' | 'info' = 'info';

        switch (actionType) {
            case 'confirm':
                title = 'Confirm Booking';
                message = 'Are you sure you want to confirm this booking? This will mark it as confirmed.';
                variant = 'info';
                break;
            case 'verify':
                title = 'Mark as Verified';
                message = 'Are you sure you want to mark this booking as verified? This indicates the participant has attended.';
                variant = 'info';
                break;
            case 'approve-conditional-free':
                title = 'Approve Conditional Free Entry';
                message = 'Are you sure you want to approve this conditional free entry request? This will confirm the booking and send an approval email to the user.';
                variant = 'info';
                break;
            case 'cancel':
                title = 'Cancel Booking';
                message = 'Are you sure you want to cancel this booking? This action cannot be undone.';
                variant = 'danger';
                break;
            case 'release-whitelist':
                title = 'Release Whitelist';
                message = 'Are you sure you want to release this booking from the whitelist? This will allow the user to complete payment.';
                variant = 'warning';
                break;
            default:
                title = 'Confirm Action';
                message = 'Are you sure you want to perform this action?';
                variant = 'warning';
        }

        setConfirmAction({ type: actionType, status: newStatus, title, message, variant });
        setShowConfirmDialog(true);
    };

    const confirmActionHandler = async () => {
        if (!confirmAction || !booking) return;
        
        setActionLoading(true);
        setShowConfirmDialog(false);
        
        try {
            let response;
            
            if (confirmAction.type === 'release-whitelist') {
                // Call the release-whitelist API
                response = await fetch('/api/admin/bookings/release-whitelist', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ bookingId: booking.id }),
                });
            } else if (confirmAction.type === 'approve-conditional-free') {
                // Call the conditional free approval API
                response = await fetch(`/api/organizer/events/${eventId}/bookings/${booking.id}/approve-conditional-free`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            } else {
                // Call the regular status update API
                response = await fetch(`/api/organizer/events/${eventId}/bookings/${booking.id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: confirmAction.status }),
                });
            }

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
            setConfirmAction(null);
        }
    };

    const cancelAction = () => {
        setShowConfirmDialog(false);
        setConfirmAction(null);
    };

    if (loading) {
        return <SectionLoader minHeight="h-64" size="lg" />
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
        <div className="">
            {/* Breadcrumb */}
            <div className="mb-6">
                <Breadcrumb
                    items={[
                        { label: 'Events', href: '/organizer' },
                        { label: booking.event.title, href: `/organizer/events/${booking.event.id}` },
                        { label: 'Bookings', href: `/organizer/events/${booking.event.id}/bookings` },
                        { label: booking.booking_id || booking.id.slice(0, 8) }
                    ]}
                />
            </div>
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
                                {booking.event.entry_close_date && (
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                        <HiClock className="h-4 w-4 mr-2" />
                                        <div>
                                            <div className="font-medium">Registration Closes</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-500">
                                                {new Date(booking.event.entry_close_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })} at {new Date(booking.event.entry_close_date).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <HiUsers className="h-4 w-4 mr-2" />
                                    <div>
                                        <div className="font-medium">Entry Status</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500">
                                            {booking.event.current_attendees} / {booking.event.max_attendees || '∞'} participants
                                        </div>
                                    </div>
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

                    {/* Participants with Management */}
                    {booking.participants && booking.participants.length > 0 && (
                        <BookingDetailsClient 
                            booking={booking}
                            eventId={eventId}
                        />
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
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                <HiCreditCard className="h-5 w-5 mr-2" />
                                Payment Information
                            </h2>
                            <a
                                href={`/admin/bookings/${booking.id}/payment-events`}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                title="View Payment Events"
                            >
                                <HiEye className="h-3 w-3 mr-1" />
                                Events
                            </a>
                        </div>
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
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                <HiDocumentText className="h-5 w-5 mr-2" />
                                Organizer Actions
                            </h2>
                            <ActionMenu
                                trigger={({ buttonProps }) => (
                                    <button
                                        {...buttonProps}
                                        className="inline-flex items-center p-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        title="Actions"
                                    >
                                        <HiCog6Tooth className="w-4 h-4" />
                                    </button>
                                )}
                            >
                                {booking.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleActionClick('confirm', 'confirmed')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-left"
                                            data-menu-item
                                        >
                                            <HiCheckCircle className="mr-2 h-4 w-4" /> Confirm Booking
                                        </button>
                                        <button
                                            onClick={() => handleActionClick('cancel', 'cancelled')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                                            data-menu-item
                                        >
                                            <HiXCircle className="mr-2 h-4 w-4" /> Cancel Booking
                                        </button>
                                    </>
                                )}
                                {booking.status === 'confirmed' && (
                                    <>
                                        <button
                                            onClick={() => handleActionClick('verify', 'verified')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left"
                                            data-menu-item
                                        >
                                            <HiCheckCircle className="mr-2 h-4 w-4" /> Mark as Verified
                                        </button>
                                        <button
                                            onClick={() => handleActionClick('cancel', 'cancelled')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                                            data-menu-item
                                        >
                                            <HiXCircle className="mr-2 h-4 w-4" /> Cancel Booking
                                        </button>
                                    </>
                                )}
                                {booking.status === 'whitelisted' && (
                                    <>
                                        <button
                                            onClick={() => handleActionClick('release-whitelist', 'pending')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left"
                                            data-menu-item
                                        >
                                            <HiArrowPath className="mr-2 h-4 w-4" /> Release Whitelist
                                        </button>
                                        <button
                                            onClick={() => handleActionClick('cancel', 'cancelled')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                                            data-menu-item
                                        >
                                            <HiXCircle className="mr-2 h-4 w-4" /> Cancel Booking
                                        </button>
                                    </>
                                )}
                                {booking.status === 'pending_approval' && (
                                    <>
                                        <button
                                            onClick={() => handleActionClick('approve-conditional-free', 'confirmed')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-left"
                                            data-menu-item
                                        >
                                            <HiCheckCircle className="mr-2 h-4 w-4" /> Approve Conditional Free Entry
                                        </button>
                                        <button
                                            onClick={() => handleActionClick('cancel', 'cancelled')}
                                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                                            data-menu-item
                                        >
                                            <HiXCircle className="mr-2 h-4 w-4" /> Cancel Booking
                                        </button>
                                    </>
                                )}
                            </ActionMenu>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <HiInformationCircle className="h-3 w-3 mr-1" />
                            Status changes will be logged and may trigger notifications.
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmDialog}
                onClose={cancelAction}
                onConfirm={confirmActionHandler}
                title={confirmAction?.title || 'Confirm Action'}
                message={confirmAction?.message || 'Are you sure you want to perform this action?'}
                variant={confirmAction?.variant || 'warning'}
                loading={actionLoading}
            />
        </div>
    );
}
