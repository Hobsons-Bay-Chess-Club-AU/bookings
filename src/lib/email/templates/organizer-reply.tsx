import { Message, Profile, Event } from '@/lib/types/database'

interface OrganizerReplyEmailProps {
    message: Message
    organizer: Profile
    event?: Event
    originalMessage?: Message
}

export default function OrganizerReplyEmail({
    message,
    organizer,
    event,
    originalMessage
}: OrganizerReplyEmailProps) {
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', textAlign: 'center' }}>
                <h1 style={{ color: '#1f2937', margin: '0', fontSize: '24px' }}>
                    Hobsons Bay Chess Club
                </h1>
                <p style={{ color: '#6b7280', margin: '10px 0 0 0' }}>
                    Message from Event Organizer
                </p>
            </div>

            <div style={{ padding: '30px', backgroundColor: '#ffffff' }}>
                <h2 style={{ color: '#1f2937', margin: '0 0 20px 0', fontSize: '20px' }}>
                    Reply from {organizer.full_name || organizer.email}
                </h2>

                {event && (
                    <div style={{ 
                        backgroundColor: '#f3f4f6', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        marginBottom: '20px' 
                    }}>
                        <h3 style={{ color: '#374151', margin: '0 0 10px 0', fontSize: '16px' }}>
                            Event: {event.title}
                        </h3>
                        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>
                            {new Date(event.start_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })} at {event.location}
                        </p>
                    </div>
                )}

                <div style={{ 
                    backgroundColor: '#f9fafb', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    borderLeft: '4px solid #3b82f6'
                }}>
                    <h4 style={{ color: '#374151', margin: '0 0 10px 0', fontSize: '16px' }}>
                        Organizer&apos;s Reply:
                    </h4>
                    <p style={{ color: '#1f2937', margin: '0', lineHeight: '1.6' }}>
                        {message.content}
                    </p>
                    <p style={{ color: '#6b7280', margin: '10px 0 0 0', fontSize: '12px' }}>
                        Sent on {new Date(message.created_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                {originalMessage && (
                    <div style={{ 
                        backgroundColor: '#f3f4f6', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        marginBottom: '20px' 
                    }}>
                        <h4 style={{ color: '#374151', margin: '0 0 10px 0', fontSize: '14px' }}>
                            Your original message:
                        </h4>
                        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px', fontStyle: 'italic' }}>
                            &ldquo;{originalMessage.content}&rdquo;
                        </p>
                        <p style={{ color: '#9ca3af', margin: '5px 0 0 0', fontSize: '12px' }}>
                            Sent on {new Date(originalMessage.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                )}

                <div style={{ 
                    backgroundColor: '#eff6ff', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    marginTop: '30px' 
                }}>
                    <h4 style={{ color: '#1e40af', margin: '0 0 15px 0', fontSize: '16px' }}>
                        Need to reply?
                    </h4>
                    <p style={{ color: '#1e40af', margin: '0', fontSize: '14px' }}>
                        You can reply to this message by visiting the event page and using the chat feature, 
                        or by logging into your account and going to your dashboard.
                    </p>
                </div>

                <div style={{ 
                    backgroundColor: '#f9fafb', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    marginTop: '20px',
                    textAlign: 'center' 
                }}>
                    <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>
                        This is an automated email from the Hobsons Bay Chess Club messaging system.
                    </p>
                    <p style={{ color: '#9ca3af', margin: '10px 0 0 0', fontSize: '12px' }}>
                        If you have any questions, please contact us at info@hobsonsbaycc.com
                    </p>
                </div>
            </div>
        </div>
    )
} 