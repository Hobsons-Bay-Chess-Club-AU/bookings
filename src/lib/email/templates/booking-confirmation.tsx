import React from 'react'
import { render } from '@react-email/render'
import { renderMarkdownForEmail } from '../../utils/markdown'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading, EmailButton } from '../layout/EmailLayout'

interface BookingConfirmationEmailData {
  bookingId: string
  eventName: string
  eventDate: string
  eventLocation: string
  eventEndDate?: string
  eventTimezone?: string
  participantCount: number
  totalAmount: number
  organizerName: string
  organizerEmail: string
  eventDescription?: string
  organizerPhone?: string
  participants?: Array<{
    first_name: string
    last_name: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data?: Record<string, unknown>
    section?: {
      id: string
      title: string
      start_date: string
      end_date?: string
      description?: string
    }
  }>
  calendarUrls?: { google: string; outlook: string }
  hasIcsAttachment?: boolean
  isMultiSectionEvent?: boolean
}

function BookingConfirmationEmail({
  bookingId,
  eventName,
  eventDate,
  eventLocation,
  eventEndDate,
  eventTimezone,
  participantCount,
  totalAmount,
  organizerName,
  organizerEmail,
  organizerPhone,
  eventDescription,
  participants,
  calendarUrls,
  hasIcsAttachment,
  isMultiSectionEvent
}: BookingConfirmationEmailData) {
  const formattedStart = new Date(eventDate)
  const formattedEnd = eventEndDate ? new Date(eventEndDate) : undefined
  return (
    <EmailLayout
      title="Booking Confirmation"
      subtitle="Your booking has been confirmed!"
      headerColor="#059669"
    >
      <EmailHeading level={2}>Your booking has been confirmed!</EmailHeading>

      <EmailCard backgroundColor="#f0fdf4" borderColor="#059669">
        <EmailHeading level={3}>Event Details</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Event:</strong> {eventName}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Starts:</strong> {formattedStart.toLocaleDateString('en-AU', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
          {eventTimezone && ` (${eventTimezone})`}
        </EmailText>
        {formattedEnd && (
          <EmailText style={{ marginBottom: '10px' }}>
            <strong>Ends:</strong> {formattedEnd.toLocaleDateString('en-AU', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
            {eventTimezone && ` (${eventTimezone})`}
          </EmailText>
        )}
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Location:</strong> {eventLocation}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Booking ID:</strong> {bookingId}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Participants:</strong> {participantCount}
        </EmailText>
        <EmailText style={{ marginBottom: '0' }}>
          <strong>Total Amount:</strong> ${totalAmount.toFixed(2)} AUD
        </EmailText>
      </EmailCard>

      {(calendarUrls || hasIcsAttachment) && (
        <EmailCard backgroundColor="#eef2ff" borderColor="#6366f1">
          <EmailHeading level={3}>Add to your calendar</EmailHeading>
          {calendarUrls && (
            <EmailText style={{ marginBottom: '10px' }}>
              Add this event to your calendar: 
              <a href={calendarUrls.google} style={{ color: '#2563eb', textDecoration: 'underline' }}> Google Calendar</a>
              {' '}|{' '}
              <a href={calendarUrls.outlook} style={{ color: '#2563eb', textDecoration: 'underline' }}> Outlook</a>
            </EmailText>
          )}
          {hasIcsAttachment && (
            <EmailText style={{ marginBottom: '0' }}>
              We&apos;ve attached an .ics calendar invite to this email. Download and open it to add the event to Apple Calendar, Outlook, or other calendar apps.
            </EmailText>
          )}
        </EmailCard>
      )}

      {eventDescription && (
        <EmailSection>
          <EmailHeading level={3}>Event Description</EmailHeading>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdownForEmail(eventDescription) }} />
        </EmailSection>
      )}

      {eventLocation && (
        <EmailCard backgroundColor="#fff7ed" borderColor="#fb923c">
          <EmailHeading level={3}>Getting there</EmailHeading>
          <EmailText style={{ marginBottom: '10px' }}>
            <strong>Venue:</strong> {eventLocation}
          </EmailText>
          <EmailText style={{ marginBottom: '0' }}>
            For directions, open the location in your preferred maps app.
          </EmailText>
        </EmailCard>
      )}

      {(organizerName || organizerEmail || organizerPhone) && (
        <EmailCard backgroundColor="#f0f9ff" borderColor="#38bdf8">
          <EmailHeading level={3}>Organizer</EmailHeading>
          {organizerName && (
            <EmailText style={{ marginBottom: '10px' }}>
              <strong>Name:</strong> {organizerName}
            </EmailText>
          )}
          {organizerEmail && (
            <EmailText style={{ marginBottom: '10px' }}>
              <strong>Email:</strong> {organizerEmail}
            </EmailText>
          )}
          {organizerPhone && (
            <EmailText style={{ marginBottom: '0' }}>
              <strong>Phone:</strong> {organizerPhone}
            </EmailText>
          )}
        </EmailCard>
      )}

      {participants && participants.length > 0 && (
        <EmailSection>
          <EmailHeading level={3}>
            {isMultiSectionEvent ? 'Participant & Section Information' : 'Participant Information'}
          </EmailHeading>
          {participants.map((participant, index) => (
            <EmailCard key={index} backgroundColor="#f7fafc" borderColor="#3b82f6">
              <EmailText style={{ marginBottom: '10px' }}>
                <strong>Participant {index + 1}:</strong> {participant.first_name} {participant.last_name}
                {participant.section && (
                  <span style={{ color: '#059669', fontWeight: 'bold' }}>
                    {' '}- {participant.section.title}
                  </span>
                )}
              </EmailText>
              
              {participant.section && (
                <>
                  <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Section:</strong> {participant.section.title}
                  </EmailText>
                  <EmailText style={{ marginBottom: '10px' }}>
                    <strong>Section Schedule:</strong> {new Date(participant.section.start_date).toLocaleString('en-AU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {participant.section.end_date && ` - ${new Date(participant.section.end_date).toLocaleTimeString('en-AU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
                  </EmailText>
                  {participant.section.description && (
                    <EmailText style={{ marginBottom: '10px' }}>
                      <strong>Section Description:</strong> {participant.section.description}
                    </EmailText>
                  )}
                </>
              )}
              
              {participant.date_of_birth && (
                <EmailText style={{ marginBottom: '10px' }}>
                  <strong>Date of Birth:</strong> {participant.date_of_birth}
                </EmailText>
              )}
              {participant.contact_email && (
                <EmailText style={{ marginBottom: '10px' }}>
                  <strong>Contact Email:</strong> {participant.contact_email}
                </EmailText>
              )}
              {participant.contact_phone && (
                <EmailText style={{ marginBottom: '10px' }}>
                  <strong>Contact Phone:</strong> {participant.contact_phone}
                </EmailText>
              )}
              {participant.custom_data && Object.entries(participant.custom_data).map(([key, value]) => (
                <EmailText key={key} style={{ marginBottom: '10px' }}>
                  <strong>{key.replace(/_/g, ' ')}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                </EmailText>
              ))}
            </EmailCard>
          ))}
        </EmailSection>
      )}

      <EmailCard backgroundColor="#e6fffa" borderColor="#0d9488">
        <EmailHeading level={3}>Organizer Contact</EmailHeading>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Organizer:</strong> {organizerName}
        </EmailText>
        <EmailText style={{ marginBottom: '10px' }}>
          <strong>Email:</strong> {organizerEmail}
        </EmailText>
        {organizerPhone && (
          <EmailText style={{ marginBottom: '0' }}>
            <strong>Phone:</strong> {organizerPhone}
          </EmailText>
        )}
      </EmailCard>

      <EmailCard backgroundColor="#fef3c7" borderColor="#f59e0b">
        <EmailHeading level={3}>Your Event Tickets</EmailHeading>
        <EmailText style={{ marginBottom: '15px' }}>
          Your tickets are ready! Each participant will have their own ticket with a unique QR code for verification.
        </EmailText>
        <EmailSection style={{ textAlign: 'center' }}>
          <EmailButton
            href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tickets/${bookingId}`}
            backgroundColor="#f59e0b"
          >
            View & Download Tickets
          </EmailButton>
        </EmailSection>
        <EmailText style={{ fontSize: '14px', color: '#6b7280', marginTop: '15px', marginBottom: '0' }}>
          <strong>Important:</strong> Please print your tickets and bring them to the event. Each ticket includes terms & conditions and signature lines.
        </EmailText>
      </EmailCard>

      <EmailCard backgroundColor="#f0f9ff" borderColor="#0ea5e9">
        <EmailHeading level={3}>Terms & Conditions</EmailHeading>
        <EmailText style={{ marginBottom: '15px' }}>
          A copy of the terms & conditions you agreed to during booking has been attached to this email as a PDF document.
        </EmailText>
        <EmailText style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0' }}>
          <strong>Note:</strong> Please keep this document for your records. The terms & conditions outline your rights and responsibilities as a participant in this event.
        </EmailText>
      </EmailCard>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          Thank you for your booking! If you have any questions, please contact the organizer.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderBookingConfirmationEmail(data: BookingConfirmationEmailData) {
  const html = await render(React.createElement(BookingConfirmationEmail, data))
  const text = await render(React.createElement(BookingConfirmationEmail, data), { plainText: true })
  
  return { html, text }
}

export default BookingConfirmationEmail 