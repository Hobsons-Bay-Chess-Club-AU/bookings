import React from 'react'
import { render } from '@react-email/render'
import { renderMarkdownForEmail } from '../../utils/markdown'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading } from '../layout/EmailLayout'

interface OrganizerCustomEmailData {
  subject: string
  message: string
  organizerName: string
  organizerEmail?: string
  event?: {
    title: string
    start_date: string
    location: string
    description?: string
  }
  booking?: {
    booking_id?: string
    id: string
    event?: {
      title: string
      start_date: string
      location: string
      description?: string
    }
  }
  participant?: {
    id: string
    first_name: string
    last_name: string
    booking?: {
      booking_id?: string
      id: string
      event?: {
        title: string
        start_date: string
        location: string
        description?: string
      }
    }
  }
  user?: {
    full_name?: string
    email: string
  }
}

function OrganizerCustomEmail({
  subject,
  message,
  organizerName,
  organizerEmail,
  event,
  booking,
  participant,
  user
}: OrganizerCustomEmailData) {
  // Determine the event context from the available data
  const eventContext = event || booking?.event || participant?.booking?.event

  // Get recipient name for personalization
  const getRecipientName = () => {
    if (participant && participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`
    }
    if (user?.full_name) {
      return user.full_name
    }
    if (booking?.event?.title) {
      return 'Participant'
    }
    return 'Member'
  }

  // Get context description for the message
  const getContextDescription = () => {
    if (participant) {
      return `participant in ${eventContext?.title || 'the event'}`
    }
    if (booking) {
      return `participant with booking ${booking.booking_id || booking.id}`
    }
    if (user) {
      return 'member'
    }
    return 'recipient'
  }

  return (
    <EmailLayout
      title="Hobsons Bay Chess Club"
      subtitle={subject}
      headerColor="#1f2937"
    >
      <EmailHeading level={2}>{subject}</EmailHeading>

      <EmailText>
        Dear {getRecipientName()},
      </EmailText>

      <EmailSection>
        <div 
          style={{ 
            whiteSpace: 'pre-wrap', 
            lineHeight: '1.6', 
            color: '#374151',
            fontSize: '16px',
            marginBottom: '20px'
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdownForEmail(message) }}
        />
      </EmailSection>

      {eventContext && (
        <EmailCard backgroundColor="#f7fafc" borderColor="#3b82f6">
          <EmailHeading level={3}>Event Details</EmailHeading>
          <EmailText style={{ marginBottom: '10px' }}>
            <strong>Event:</strong> {eventContext.title}
          </EmailText>
          <EmailText style={{ marginBottom: '10px' }}>
            <strong>Date:</strong> {new Date(eventContext.start_date).toLocaleDateString('en-AU', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </EmailText>
          <EmailText style={{ marginBottom: eventContext.description ? '10px' : '0' }}>
            <strong>Location:</strong> {eventContext.location}
          </EmailText>
          {eventContext.description && (
            <EmailText style={{ marginBottom: '0' }}>
              <strong>Description:</strong> {eventContext.description}
            </EmailText>
          )}
        </EmailCard>
      )}

      {booking && (
        <EmailCard backgroundColor="#f0f9ff" borderColor="#0ea5e9">
          <EmailHeading level={3}>Booking Information</EmailHeading>
          <EmailText style={{ marginBottom: '0' }}>
            <strong>Booking ID:</strong> {booking.booking_id || booking.id}
          </EmailText>
        </EmailCard>
      )}

      {participant && (
        <EmailCard backgroundColor="#f0fdf4" borderColor="#22c55e">
          <EmailHeading level={3}>Participant Information</EmailHeading>
          <EmailText style={{ marginBottom: '10px' }}>
            <strong>Name:</strong> {participant.first_name} {participant.last_name}
          </EmailText>
          <EmailText style={{ marginBottom: '0' }}>
            <strong>Participant ID:</strong> {participant.id}
          </EmailText>
        </EmailCard>
      )}

      <EmailCard backgroundColor="#e6fffa" borderColor="#0d9488">
        <EmailHeading level={3}>Organizer Contact</EmailHeading>
        <EmailText style={{ marginBottom: organizerEmail ? '10px' : '0' }}>
          <strong>Organizer:</strong> {organizerName}
        </EmailText>
        {organizerEmail && (
          <EmailText style={{ marginBottom: '0' }}>
            <strong>Email:</strong> {organizerEmail}
          </EmailText>
        )}
      </EmailCard>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          You are receiving this email as a {getContextDescription()}.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderOrganizerCustomEmail(data: OrganizerCustomEmailData) {
  const html = await render(React.createElement(OrganizerCustomEmail, data))
  const text = await render(React.createElement(OrganizerCustomEmail, data), { plainText: true })
  
  return { html, text }
}

export default OrganizerCustomEmail
