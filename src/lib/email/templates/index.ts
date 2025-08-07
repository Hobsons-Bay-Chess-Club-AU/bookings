// Email Layout
export { default as EmailLayout } from '../layout/EmailLayout'
export { EmailSection, EmailCard, EmailButton, EmailText, EmailHeading } from '../layout/EmailLayout'

// Email Templates
export { default as BookingConfirmationEmail } from './booking-confirmation'
export { default as EventUpdateEmail } from './event-update'
export { default as WelcomeEmail } from './welcome'
export { default as PasswordResetEmail } from './password-reset'
export { default as OrganizerReplyEmail } from './organizer-reply'
export { default as UserProfileUpdateEmail } from './user-profile-update'
export { default as BookingTransferNotificationEmail } from './booking-transfer-notification'
export { default as OrganizerBookingNotificationEmail } from './organizer-booking-notification'

// Render Functions
export { renderBookingConfirmationEmail } from './booking-confirmation'
export { renderEventUpdateEmail } from './event-update'
export { renderWelcomeEmail } from './welcome'
export { renderPasswordResetEmail } from './password-reset'
export { renderOrganizerReplyEmail } from './organizer-reply'
export { renderUserProfileUpdateEmail } from './user-profile-update'
export { renderBookingTransferNotificationEmail } from './booking-transfer-notification'
export { renderOrganizerBookingNotificationEmail } from './organizer-booking-notification'

// Legacy exports for backward compatibility
export { BookingConfirmationEmail as BookingConfirmationEmailLegacy } from '../templates'
export { EventUpdateEmail as EventUpdateEmailLegacy } from '../templates'
export { WelcomeEmail as WelcomeEmailLegacy } from '../templates'
export { PasswordResetEmail as PasswordResetEmailLegacy } from '../templates' 