import React from 'react'
import { render } from '@react-email/render'
import { renderMarkdownForEmail } from '../../utils/markdown'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading } from '../layout/EmailLayout'

interface EventUpdateEmailData {
  eventName: string
  eventDate: string
  eventLocation: string
  updateType: 'cancelled' | 'rescheduled' | 'updated'
  updateDetails: string
  organizerName: string
  organizerEmail: string
  organizerPhone?: string
}

function EventUpdateEmail({
  eventName,
  eventDate,
  eventLocation,
  updateType,
  updateDetails,
  organizerName,
  organizerEmail
}: EventUpdateEmailData) {
  const getHeaderColor = () => {
    switch (updateType) {
      case 'cancelled':
        return '#dc2626'
      case 'rescheduled':
        return '#f59e0b'
      default:
        return '#3b82f6'
    }
  }

  const getTitle = () => {
    switch (updateType) {
      case 'cancelled':
        return 'Event Cancelled'
      case 'rescheduled':
        return 'Event Rescheduled'
      default:
        return 'Event Updated'
    }
  }

  const getSubtitle = () => {
    switch (updateType) {
      case 'cancelled':
        return 'Important event cancellation notice'
      case 'rescheduled':
        return 'Event date/time has been changed'
      default:
        return 'Event details have been updated'
    }
  }

  const getCardColor = () => {
    switch (updateType) {
      case 'cancelled':
        return { backgroundColor: '#fef2f2', borderColor: '#dc2626' }
      case 'rescheduled':
        return { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }
      default:
        return { backgroundColor: '#eff6ff', borderColor: '#3b82f6' }
    }
  }

  return (
    <EmailLayout
      title={getTitle()}
      subtitle={getSubtitle()}
      headerColor={getHeaderColor()}
    >
      <EmailHeading level={2}>Important Event Update</EmailHeading>

      <EmailCard backgroundColor="#f7fafc" borderColor="#3b82f6">
        <EmailHeading level={3}>Event Details</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Event:</strong> {eventName}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Date:</strong> {new Date(eventDate).toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </EmailText>
        <EmailText style={{ marginBottom: '0' }}>
          <strong>Location:</strong> {eventLocation}
        </EmailText>
      </EmailCard>

      <EmailCard {...getCardColor()}>
        <EmailHeading level={3}>Update Details</EmailHeading>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdownForEmail(updateDetails) }} />
      </EmailCard>

      <EmailCard backgroundColor="#e6fffa" borderColor="#0d9488">
        <EmailHeading level={3}>Organizer Contact</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Organizer:</strong> {organizerName}
        </EmailText>
        <EmailText style={{ marginBottom: '0' }}>
          <strong>Email:</strong> {organizerEmail}
        </EmailText>
      </EmailCard>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          If you have any questions, please contact the organizer.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderEventUpdateEmail(data: EventUpdateEmailData) {
  const html = await render(React.createElement(EventUpdateEmail, data))
  const text = await render(React.createElement(EventUpdateEmail, data), { plainText: true })
  
  return { html, text }
}

export default EventUpdateEmail 