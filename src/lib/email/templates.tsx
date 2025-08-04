import React from 'react'
import { renderMarkdownForEmail } from '../utils/markdown'

interface BookingConfirmationEmailProps {
  bookingId: string
  eventName: string
  eventDate: string
  eventLocation: string
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
  }>
}

export const BookingConfirmationEmail: React.FC<BookingConfirmationEmailProps> = ({
  bookingId,
  eventName,
  eventDate,
  eventLocation,
  participantCount,
  totalAmount,
  organizerName,
  organizerEmail,
  organizerPhone,
  eventDescription,
  participants
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: '#2d3748', margin: '0' }}>Booking Confirmation</h1>
    </div>

    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#2d3748' }}>Your booking has been confirmed!</h2>

      <div style={{ backgroundColor: '#f7fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#2d3748', marginTop: '0' }}>Event Details</h3>
        <p><strong>Event:</strong> {eventName}</p>
        <p><strong>Date:</strong> {new Date(eventDate).toLocaleDateString('en-AU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p><strong>Location:</strong> {eventLocation}</p>
        <p><strong>Booking ID:</strong> {bookingId}</p>
        <p><strong>Participants:</strong> {participantCount}</p>
        <p><strong>Total Amount:</strong> ${totalAmount.toFixed(2)} AUD</p>
      </div>

      {eventDescription && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2d3748' }}>Event Description</h3>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdownForEmail(eventDescription) }} />
        </div>
      )}

      {participants && participants.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2d3748' }}>Participant Information</h3>
          {participants.map((participant, index) => (
            <div key={index} style={{ backgroundColor: '#f7fafc', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
              <p><strong>Participant {index + 1}:</strong> {participant.first_name} {participant.last_name}</p>
              {participant.date_of_birth && <p><strong>Date of Birth:</strong> {participant.date_of_birth}</p>}
              {participant.contact_email && <p><strong>Contact Email:</strong> {participant.contact_email}</p>}
              {participant.contact_phone && <p><strong>Contact Phone:</strong> {participant.contact_phone}</p>}
              {participant.custom_data && Object.entries(participant.custom_data).map(([key, value]) => (
                <p key={key}><strong>{key.replace(/_/g, ' ')}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      <div style={{ backgroundColor: '#e6fffa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#2d3748', marginTop: '0' }}>Organizer Contact</h3>
        <p><strong>Organizer:</strong> {organizerName}</p>
        <p><strong>Email:</strong> {organizerEmail}</p>
        {organizerPhone && <p><strong>Phone:</strong> {organizerPhone}</p>}
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <p style={{ color: '#718096', fontSize: '14px' }}>
          Thank you for your booking! If you have any questions, please contact the organizer.
        </p>
      </div>
    </div>
  </div>
)

interface EventUpdateEmailProps {
  eventName: string
  eventDate: string
  eventLocation: string
  updateType: 'cancelled' | 'rescheduled' | 'updated'
  updateDetails: string
  organizerName: string
  organizerEmail: string
  organizerPhone?: string
}

export const EventUpdateEmail: React.FC<EventUpdateEmailProps> = ({
  eventName,
  eventDate,
  eventLocation,
  updateType,
  updateDetails,
  organizerName,
  organizerEmail
  // organizerPhone is not used but might be needed in the future
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    <div style={{
      backgroundColor: updateType === 'cancelled' ? '#fed7d7' : '#fef5e7',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ color: '#2d3748', margin: '0' }}>
        Event {updateType === 'cancelled' ? 'Cancelled' : updateType === 'rescheduled' ? 'Rescheduled' : 'Updated'}
      </h1>
    </div>

    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#2d3748' }}>Important Event Update</h2>

      <div style={{ backgroundColor: '#f7fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#2d3748', marginTop: '0' }}>Event Details</h3>
        <p><strong>Event:</strong> {eventName}</p>
        <p><strong>Date:</strong> {new Date(eventDate).toLocaleDateString('en-AU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p><strong>Location:</strong> {eventLocation}</p>
      </div>

      <div style={{
        backgroundColor: updateType === 'cancelled' ? '#fed7d7' : '#fef5e7',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#2d3748', marginTop: '0' }}>Update Details</h3>
        <div dangerouslySetInnerHTML={{ __html: renderMarkdownForEmail(updateDetails) }} />
      </div>

      <div style={{ backgroundColor: '#e6fffa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#2d3748', marginTop: '0' }}>Organizer Contact</h3>
        <p><strong>Organizer:</strong> {organizerName}</p>
        <p><strong>Email:</strong> {organizerEmail}</p>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <p style={{ color: '#718096', fontSize: '14px' }}>
          If you have any questions, please contact the organizer.
        </p>
      </div>
    </div>
  </div>
)

interface WelcomeEmailProps {
  userName: string,
  userEmail?: string // Optional, not used in the email but might be needed in the future
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName
  // userEmail is not used but might be needed in the future
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: '#2d3748', margin: '0' }}>Welcome to HBCC Bookings!</h1>
    </div>

    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#2d3748' }}>Hi {userName},</h2>

      <p>Welcome to HBCC Bookings! We&apos;re excited to have you on board.</p>

      <div style={{ backgroundColor: '#f7fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#2d3748', marginTop: '0' }}>What you can do:</h3>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Browse and book events</li>
          <li>Manage your bookings</li>
          <li>Receive updates about events</li>
          <li>Contact event organizers</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <a
          href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`}
          style={{
            backgroundColor: '#4299e1',
            color: 'white',
            padding: '12px 24px',
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block'
          }}
        >
          View Your Dashboard
        </a>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <p style={{ color: '#718096', fontSize: '14px' }}>
          If you have any questions, please don&apos;t hesitate to contact us.
        </p>
      </div>
    </div>
  </div>
)

interface PasswordResetEmailProps {
  userName: string
  resetUrl: string
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  userName,
  resetUrl
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: '#2d3748', margin: '0' }}>Reset Your Password</h1>
    </div>

    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#2d3748' }}>Hi {userName},</h2>

      <p>We received a request to reset your password for your HBCC Bookings account.</p>

      <div style={{ backgroundColor: '#f7fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <p style={{ margin: '0' }}>
          Click the button below to reset your password. This link will expire in 1 hour for security reasons.
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <a
          href={resetUrl}
          style={{
            backgroundColor: '#4299e1',
            color: 'white',
            padding: '12px 24px',
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block'
          }}
        >
          Reset Password
        </a>
      </div>

      <div style={{ backgroundColor: '#fff5f5', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
        <h3 style={{ color: '#2d3748', marginTop: '0' }}>Security Notice</h3>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#718096' }}>
          <li>This link will expire in 1 hour</li>
          <li>If you didn&apos;t request this reset, you can safely ignore this email</li>
          <li>Your password will not be changed until you click the link above</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <p style={{ color: '#718096', fontSize: '14px' }}>
          If you have any questions, please contact our support team.
        </p>
      </div>
    </div>
  </div>
)