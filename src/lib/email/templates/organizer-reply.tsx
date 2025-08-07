import React from 'react'
import { render } from '@react-email/render'
import { Message, Profile, Event } from '@/lib/types/database'
import EmailLayout, { EmailCard, EmailText, EmailHeading } from '../layout/EmailLayout'

interface OrganizerReplyEmailData {
    message: Message
    organizer: Profile
    event?: Event
    originalMessage?: Message
}

function OrganizerReplyEmail({
    message,
    organizer,
    event,
    originalMessage
}: OrganizerReplyEmailData) {
    return (
        <EmailLayout
            title="Hobsons Bay Chess Club"
            subtitle="Message from Event Organizer"
            headerColor="#1f2937"
            footerText="This is an automated email from the Hobsons Bay Chess Club messaging system. If you have any questions, please contact us at info@hobsonsbaycc.com"
        >
            <EmailHeading level={2}>Reply from {organizer.full_name || organizer.email}</EmailHeading>

            {event && (
                <EmailCard backgroundColor="#f3f4f6" borderColor="#6b7280">
                    <EmailHeading level={3}>Event: {event.title}</EmailHeading>
                    <EmailText style={{ margin: '0', fontSize: '14px' }}>
                        {new Date(event.start_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })} at {event.location}
                    </EmailText>
                </EmailCard>
            )}

            <EmailCard backgroundColor="#f9fafb" borderColor="#3b82f6">
                <EmailHeading level={4}>Organizer&apos;s Reply:</EmailHeading>
                <EmailText style={{ margin: '0', lineHeight: '1.6' }}>
                    {message.content}
                </EmailText>
                <EmailText style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    Sent on {new Date(message.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </EmailText>
            </EmailCard>

            {originalMessage && (
                <EmailCard backgroundColor="#f3f4f6" borderColor="#9ca3af">
                    <EmailHeading level={4}>Your original message:</EmailHeading>
                    <EmailText style={{ margin: '0', fontSize: '14px', fontStyle: 'italic' }}>
                        &ldquo;{originalMessage.content}&rdquo;
                    </EmailText>
                    <EmailText style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                        Sent on {new Date(originalMessage.created_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </EmailText>
                </EmailCard>
            )}

            <EmailCard backgroundColor="#eff6ff" borderColor="#1e40af">
                <EmailHeading level={4}>Need to reply?</EmailHeading>
                <EmailText style={{ margin: '0', fontSize: '14px', color: '#1e40af' }}>
                    You can reply to this message by visiting the event page and using the chat feature, 
                    or by logging into your account and going to your dashboard.
                </EmailText>
            </EmailCard>
        </EmailLayout>
    )
}

export async function renderOrganizerReplyEmail(data: OrganizerReplyEmailData) {
    const html = await render(React.createElement(OrganizerReplyEmail, data))
    const text = await render(React.createElement(OrganizerReplyEmail, data), { plainText: true })
    
    return { html, text }
}

export default OrganizerReplyEmail 