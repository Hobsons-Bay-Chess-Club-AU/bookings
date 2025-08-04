import { sendEmail } from './service'
import UserProfileUpdateEmail from './templates/user-profile-update'
import { renderToString } from 'react-dom/server'

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
        const emailHtml = renderToString(
            UserProfileUpdateEmail({
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
        const emailHtml = renderToString(
            UserProfileUpdateEmail({
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