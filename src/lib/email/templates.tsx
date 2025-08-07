// Legacy email templates - DEPRECATED
// Please use the new templates from src/lib/email/templates/ instead
// This file is kept for backward compatibility only

// Export the new templates for backward compatibility
export { default as BookingConfirmationEmail } from './templates/booking-confirmation'
export { default as EventUpdateEmail } from './templates/event-update'
export { default as WelcomeEmail } from './templates/welcome'
export { default as PasswordResetEmail } from './templates/password-reset'
export { default as OrganizerReplyEmail } from './templates/organizer-reply'
export { default as UserProfileUpdateEmail } from './templates/user-profile-update'
export { default as BookingTransferNotificationEmail } from './templates/booking-transfer-notification'

// Legacy interface definitions for backward compatibility
export interface BookingConfirmationEmailProps {
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

export interface EventUpdateEmailProps {
  eventName: string
  eventDate: string
  eventLocation: string
  updateType: 'cancelled' | 'rescheduled' | 'updated'
  updateDetails: string
  organizerName: string
  organizerEmail: string
  organizerPhone?: string
}

export interface WelcomeEmailProps {
  userName: string
  userEmail?: string
}

export interface PasswordResetEmailProps {
  userName: string
  resetUrl: string
}