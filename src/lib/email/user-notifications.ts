import { sendEmail } from './service'
import UserProfileUpdateEmail from './templates/user-profile-update'
import BookingTransferNotificationEmail from './templates/booking-transfer-notification'
import ParticipantWithdrawalNotificationEmail from './templates/participant-withdrawal-notification'
import { render } from '@react-email/render'
import React from 'react'

interface UserProfileUpdateData {
    userId: string
    userName: string
    userEmail: string
    oldRole: string
    newRole: string
    oldName: string
    newName: string
    oldEmail: string
    newEmail: string
    adminName: string
    updatedAt: string
}

export async function sendUserProfileUpdateNotification(data: UserProfileUpdateData) {
    try {
        // Check if there are any actual changes
        const hasChanges = 
            data.oldRole !== data.newRole ||
            data.oldName !== data.newName ||
            data.oldEmail !== data.newEmail

        if (!hasChanges) {
            console.log('No changes detected, skipping email notification')
            return
        }

        // Render the email template to HTML
        const emailHtml = await render(
            React.createElement(UserProfileUpdateEmail, {
                userName: data.userName,
                oldRole: data.oldRole,
                newRole: data.newRole,
                oldName: data.oldName,
                newName: data.newName,
                oldEmail: data.oldEmail,
                newEmail: data.newEmail,
                adminName: data.adminName,
                updatedAt: data.updatedAt
            })
        )

        // Send the email
        await sendEmail({
            to: data.newEmail, // Use the new email if it was changed
            subject: 'Account Update Notification - Your Profile Has Been Modified',
            html: emailHtml
        })

        console.log(`Profile update notification sent to ${data.newEmail}`)
    } catch (error) {
        console.error('Failed to send profile update notification:', error)
        // Don't throw the error to avoid breaking the main update flow
    }
}

export async function sendRoleChangeNotification(data: UserProfileUpdateData) {
    try {
        // Only send if role actually changed
        if (data.oldRole === data.newRole) {
            return
        }

        // Render the email template to HTML
        const emailHtml = await render(
            React.createElement(UserProfileUpdateEmail, {
                userName: data.userName,
                oldRole: data.oldRole,
                newRole: data.newRole,
                oldName: data.oldName,
                newName: data.newName,
                oldEmail: data.oldEmail,
                newEmail: data.newEmail,
                adminName: data.adminName,
                updatedAt: data.updatedAt
            })
        )

        // Send the email
        await sendEmail({
            to: data.newEmail,
            subject: `Role Update - You are now a ${data.newRole.replace('_', ' ')}`,
            html: emailHtml
        })

        console.log(`Role change notification sent to ${data.newEmail}`)
    } catch (error) {
        console.error('Failed to send role change notification:', error)
        // Don't throw the error to avoid breaking the main update flow
    }
}

interface BookingTransferNotificationData {
    userName: string
    userEmail: string
    bookingId: string
    quantity: number
    totalAmount: number
    fromEventTitle: string
    fromEventDate: string
    fromEventLocation: string
    toEventTitle: string
    toEventDate: string
    toEventLocation: string
    transferReason: string
    transferNotes?: string
    adminName: string
    transferredAt: string
}

export async function sendBookingTransferNotification(data: BookingTransferNotificationData) {
    try {
        // Render the email template to HTML
        const emailHtml = await render(
            React.createElement(BookingTransferNotificationEmail, {
                userName: data.userName,
                userEmail: data.userEmail,
                bookingId: data.bookingId,
                quantity: data.quantity,
                totalAmount: data.totalAmount,
                fromEventTitle: data.fromEventTitle,
                fromEventDate: data.fromEventDate,
                fromEventLocation: data.fromEventLocation,
                toEventTitle: data.toEventTitle,
                toEventDate: data.toEventDate,
                toEventLocation: data.toEventLocation,
                transferReason: data.transferReason,
                transferNotes: data.transferNotes,
                adminName: data.adminName,
                transferredAt: data.transferredAt
            })
        )

        // Send the email
        await sendEmail({
            to: data.userEmail,
            subject: `Booking Transfer Confirmation - ${data.toEventTitle}`,
            html: emailHtml
        })

        console.log(`Booking transfer notification sent to ${data.userEmail}`)
    } catch (error) {
        console.error('Failed to send booking transfer notification:', error)
        // Don't throw the error to avoid breaking the main transfer flow
    }
}

interface ParticipantWithdrawalNotificationData {
    recipientEmail: string
    recipientName: string
    participantName: string
    eventTitle: string
    eventDate: string
    eventLocation: string
    withdrawalMessage: string
    adminName: string
    eventId: string
}

export async function sendParticipantWithdrawalNotification(data: ParticipantWithdrawalNotificationData) {
    try {
        // Render the email template to HTML
        const emailHtml = await render(
            React.createElement(ParticipantWithdrawalNotificationEmail, {
                recipientName: data.recipientName,
                participantName: data.participantName,
                eventTitle: data.eventTitle,
                eventDate: data.eventDate,
                eventLocation: data.eventLocation,
                withdrawalMessage: data.withdrawalMessage,
                adminName: data.adminName,
                eventId: data.eventId
            })
        )

        // Send the email
        await sendEmail({
            to: data.recipientEmail,
            subject: `Participant Withdrawal Notice - ${data.eventTitle}`,
            html: emailHtml
        })

        console.log(`Participant withdrawal notification sent to ${data.recipientEmail}`)
    } catch (error) {
        console.error('Failed to send participant withdrawal notification:', error)
        // Don't throw the error to avoid breaking the main withdrawal flow
    }
} 