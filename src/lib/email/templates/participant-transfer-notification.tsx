import React from 'react'
import EmailLayout from '../layout/EmailLayout'

interface ParticipantTransferNotificationProps {
    bookerName: string
    participantName: string
    eventTitle: string
    oldSection: string
    newSection: string
    eventId: string
    organizerName: string
}

export default function ParticipantTransferNotification({
    bookerName,
    participantName,
    eventTitle,
    oldSection,
    newSection,
    eventId,
    organizerName
}: ParticipantTransferNotificationProps) {
    return (
        <EmailLayout>
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
                <div style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '30px', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px'
                        }}>
                            <span style={{ color: 'white', fontSize: '24px' }}>↔️</span>
                        </div>
                        <h1 style={{ 
                            color: '#1e293b', 
                            fontSize: '24px', 
                            fontWeight: 'bold',
                            margin: '0 0 10px 0'
                        }}>
                            Participant Transfer Confirmation
                        </h1>
                        <p style={{ 
                            color: '#64748b', 
                            fontSize: '16px',
                            margin: '0'
                        }}>
                            Hello {bookerName}, your participant has been transferred to a new section
                        </p>
                    </div>

                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '25px', 
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '25px'
                    }}>
                        <h2 style={{ 
                            color: '#1e293b', 
                            fontSize: '20px', 
                            fontWeight: '600',
                            margin: '0 0 20px 0'
                        }}>
                            Transfer Details
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
                                <strong>Participant:</strong> {participantName}
                            </p>
                            <p style={{ 
                                color: '#64748b', 
                                fontSize: '16px',
                                margin: '0 0 10px 0'
                            }}>
                                <strong>Previous Section:</strong> {oldSection}
                            </p>
                            <p style={{ 
                                color: '#64748b', 
                                fontSize: '16px',
                                margin: '0 0 10px 0'
                            }}>
                                <strong>New Section:</strong> {newSection}
                            </p>
                            <p style={{ 
                                color: '#64748b', 
                                fontSize: '16px',
                                margin: '0'
                            }}>
                                <strong>Transferred by:</strong> {organizerName}
                            </p>
                        </div>

                        <div style={{ 
                            backgroundColor: '#f0f9ff', 
                            padding: '15px', 
                            borderRadius: '6px',
                            border: '1px solid #0ea5e9'
                        }}>
                            <p style={{ 
                                color: '#0c4a6e', 
                                fontSize: '14px',
                                margin: '0',
                                fontWeight: '500'
                            }}>
                                ℹ️ This transfer has been completed and your participant is now registered in the new section. 
                                No further action is required from you.
                            </p>
                        </div>
                    </div>

                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '20px', 
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '25px'
                    }}>
                        <h3 style={{ 
                            color: '#1e293b', 
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
                                Your participant will now participate in the {newSection} section
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                All event communications will reflect the new section assignment
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                You can view updated details in your booking confirmation
                            </li>
                            <li style={{ marginBottom: '0' }}>
                                Contact the organizer if you have any questions about this transfer
                            </li>
                        </ul>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <a href={`${process.env.NEXT_PUBLIC_APP_URL}/booking/${eventId}`} 
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
                        borderTop: '1px solid #e2e8f0',
                        textAlign: 'center'
                    }}>
                        <p style={{ 
                            color: '#94a3b8', 
                            fontSize: '14px',
                            margin: '0'
                        }}>
                            If you have any questions about this transfer, please contact the event organizer.
                        </p>
                    </div>
                </div>
            </div>
        </EmailLayout>
    )
}
