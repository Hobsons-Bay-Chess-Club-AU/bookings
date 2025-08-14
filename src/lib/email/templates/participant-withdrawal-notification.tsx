import React from 'react'
import EmailLayout from '../layout/EmailLayout'

interface ParticipantWithdrawalNotificationProps {
    recipientName: string
    participantName: string
    eventTitle: string
    eventDate: string
    eventLocation: string
    withdrawalMessage: string
    adminName: string
    eventId: string
}

export default function ParticipantWithdrawalNotification({
    recipientName,
    participantName,
    eventTitle,
    eventDate,
    eventLocation,
    withdrawalMessage,
    adminName,
    eventId
}: ParticipantWithdrawalNotificationProps) {
    const eventDateFormatted = new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <EmailLayout>
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
                <div style={{ 
                    backgroundColor: '#fef2f2', 
                    padding: '30px', 
                    borderRadius: '8px',
                    border: '1px solid #fecaca'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: '#ef4444',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px'
                        }}>
                            <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>!</span>
                        </div>
                        <h1 style={{ 
                            color: '#7f1d1d', 
                            fontSize: '24px', 
                            fontWeight: 'bold',
                            margin: '0 0 10px 0'
                        }}>
                            Participant Withdrawal Notice
                        </h1>
                        <p style={{ 
                            color: '#a21caf', 
                            fontSize: '16px',
                            margin: '0'
                        }}>
                            Hello {recipientName}, a participant has been withdrawn from your event registration
                        </p>
                    </div>

                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '25px', 
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        marginBottom: '25px'
                    }}>
                        <h2 style={{ 
                            color: '#7f1d1d', 
                            fontSize: '20px', 
                            fontWeight: '600',
                            margin: '0 0 20px 0'
                        }}>
                            Withdrawal Details
                        </h2>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ 
                                color: '#64748b', 
                                fontSize: '16px',
                                margin: '0 0 10px 0'
                            }}>
                                <strong>Event:</strong> {eventTitle}
                            </p>
                            <p style={{ 
                                color: '#64748b', 
                                fontSize: '16px',
                                margin: '0 0 10px 0'
                            }}>
                                <strong>Date:</strong> {eventDateFormatted}
                            </p>
                            <p style={{ 
                                color: '#64748b', 
                                fontSize: '16px',
                                margin: '0 0 10px 0'
                            }}>
                                <strong>Location:</strong> {eventLocation}
                            </p>
                            <p style={{ 
                                color: '#64748b', 
                                fontSize: '16px',
                                margin: '0 0 10px 0'
                            }}>
                                <strong>Participant:</strong> {participantName}
                            </p>
                            <p style={{ 
                                color: '#64748b', 
                                fontSize: '16px',
                                margin: '0'
                            }}>
                                <strong>Withdrawn by:</strong> {adminName}
                            </p>
                        </div>

                        <div style={{ 
                            backgroundColor: '#fef3c7', 
                            padding: '15px', 
                            borderRadius: '6px',
                            border: '1px solid #f59e0b',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ 
                                color: '#92400e', 
                                fontSize: '16px',
                                fontWeight: '600',
                                margin: '0 0 10px 0'
                            }}>
                                Reason for Withdrawal:
                            </h3>
                            <p style={{ 
                                color: '#92400e', 
                                fontSize: '14px',
                                margin: '0',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {withdrawalMessage}
                            </p>
                        </div>
                    </div>

                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '20px', 
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        marginBottom: '25px'
                    }}>
                        <h3 style={{ 
                            color: '#7f1d1d', 
                            fontSize: '18px', 
                            fontWeight: '600',
                            margin: '0 0 15px 0'
                        }}>
                            What happens next?
                        </h3>
                        <ul style={{ 
                            color: '#64748b', 
                            fontSize: '14px',
                            margin: '0',
                            paddingLeft: '20px'
                        }}>
                            <li style={{ marginBottom: '8px' }}>
                                The participant is no longer registered for this event
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                If you believe this withdrawal was made in error, please contact the event organizer immediately
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                Any refunds (if applicable) will be processed according to the event&apos;s refund policy
                            </li>
                            <li style={{ marginBottom: '0' }}>
                                You can re-register the participant if spaces are still available and the withdrawal was made in error
                            </li>
                        </ul>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <a href={`${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}`} 
                           style={{
                               display: 'inline-block',
                               backgroundColor: '#3b82f6',
                               color: 'white',
                               padding: '12px 24px',
                               textDecoration: 'none',
                               borderRadius: '6px',
                               fontWeight: '500',
                               fontSize: '16px'
                           }}>
                            View Event Details
                        </a>
                    </div>

                    <div style={{ 
                        marginTop: '30px', 
                        paddingTop: '20px', 
                        borderTop: '1px solid #fecaca',
                        textAlign: 'center'
                    }}>
                        <p style={{ 
                            color: '#94a3b8', 
                            fontSize: '14px',
                            margin: '0'
                        }}>
                            If you have any questions about this withdrawal, please contact the event organizer or administrator.
                        </p>
                    </div>
                </div>
            </div>
        </EmailLayout>
    )
}
