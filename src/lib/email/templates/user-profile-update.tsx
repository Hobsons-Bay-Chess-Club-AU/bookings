import React from 'react'
import { render } from '@react-email/render'

interface UserProfileUpdateEmailData {
    userName: string
    oldRole: string
    newRole: string
    oldName: string
    newName: string
    oldEmail: string
    newEmail: string
    adminName: string
    updatedAt: string
}

function UserProfileUpdateEmail({
    userName,
    oldRole,
    newRole,
    oldName,
    newName,
    oldEmail,
    newEmail,
    adminName,
    updatedAt
}: UserProfileUpdateEmailData) {
    const hasRoleChange = oldRole !== newRole
    const hasNameChange = oldName !== newName
    const hasEmailChange = oldEmail !== newEmail

    const getRoleDescription = (role: string) => {
        switch (role) {
            case 'user':
                return 'Regular user with basic access to book events'
            case 'organizer':
                return 'Event organizer with ability to create and manage events'
            case 'admin':
                return 'System administrator with full access to manage the platform'
            case 'customer_support':
                return 'Customer support representative with access to help users'
            default:
                return 'User with basic access'
        }
    }

    const getRoleChangeMessage = (oldRole: string, newRole: string) => {
        if (newRole === 'organizer') {
            return 'You can now create and manage events on the platform. Visit the organizer dashboard to get started!'
        } else if (newRole === 'admin') {
            return 'You now have full administrative access to the system. You can manage users, events, and system settings.'
        } else if (newRole === 'customer_support') {
            return 'You now have customer support access to help users with their inquiries and issues.'
        } else if (oldRole === 'admin' && newRole !== 'admin') {
            return 'Your administrative privileges have been removed. You now have standard user access.'
        } else if (oldRole === 'organizer' && newRole === 'user') {
            return 'Your organizer privileges have been removed. You can still book events as a regular user.'
        }
        return 'Your role has been updated. Please contact support if you have any questions.'
    }

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <div style={{ backgroundColor: '#1f2937', color: 'white', padding: '30px', textAlign: 'center' }}>
                <h1 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>Account Update Notification</h1>
                <p style={{ margin: '10px 0 0 0', opacity: '0.9' }}>Your account information has been updated</p>
            </div>

            {/* Main Content */}
            <div style={{ backgroundColor: 'white', padding: '40px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', marginBottom: '20px' }}>
                    Hello {userName},
                </p>

                <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', marginBottom: '20px' }}>
                    Your account information has been updated by an administrator. Here are the details of the changes:
                </p>

                {/* Changes Summary */}
                <div style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>Changes Made:</h3>
                    
                    {hasNameChange && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ color: '#374151' }}>Name:</strong>
                            <span style={{ color: '#6b7280', textDecoration: 'line-through', marginLeft: '10px' }}>
                                {oldName || 'Not set'}
                            </span>
                            <span style={{ color: '#059669', marginLeft: '10px' }}>
                                → {newName || 'Not set'}
                            </span>
                        </div>
                    )}

                    {hasEmailChange && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ color: '#374151' }}>Email:</strong>
                            <span style={{ color: '#6b7280', textDecoration: 'line-through', marginLeft: '10px' }}>
                                {oldEmail}
                            </span>
                            <span style={{ color: '#059669', marginLeft: '10px' }}>
                                → {newEmail}
                            </span>
                        </div>
                    )}

                    {hasRoleChange && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ color: '#374151' }}>Role:</strong>
                            <span style={{ color: '#6b7280', textDecoration: 'line-through', marginLeft: '10px' }}>
                                {oldRole.replace('_', ' ')}
                            </span>
                            <span style={{ color: '#059669', marginLeft: '10px' }}>
                                → {newRole.replace('_', ' ')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Role Change Information */}
                {hasRoleChange && (
                    <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px', marginBottom: '30px', borderLeft: '4px solid #3b82f6' }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#1e40af', fontSize: '18px' }}>Role Update Information</h3>
                        <p style={{ margin: '0 0 10px 0', color: '#1e40af', fontSize: '14px' }}>
                            <strong>New Role:</strong> {newRole.replace('_', ' ')}
                        </p>
                        <p style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '14px' }}>
                            {getRoleDescription(newRole)}
                        </p>
                        <p style={{ margin: '0', color: '#374151', fontSize: '14px', fontStyle: 'italic' }}>
                            {getRoleChangeMessage(oldRole, newRole)}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <a 
                        href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`}
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '12px 24px',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            marginRight: '15px'
                        }}
                    >
                        Visit Dashboard
                    </a>
                    {newRole === 'organizer' && (
                        <a 
                            href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer`}
                            style={{
                                display: 'inline-block',
                                backgroundColor: '#059669',
                                color: 'white',
                                padding: '12px 24px',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}
                        >
                            Organizer Dashboard
                        </a>
                    )}
                </div>

                {/* Footer Information */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginTop: '30px' }}>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
                        <strong>Updated by:</strong> {adminName}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
                        <strong>Updated at:</strong> {new Date(updatedAt).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0' }}>
                        If you did not expect these changes or have any questions, please contact our support team immediately.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div style={{ backgroundColor: '#f3f4f6', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
                    This is an automated notification from the booking system.
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0 0 0' }}>
                    Please do not reply to this email.
                </p>
            </div>
        </div>
    )
}

export async function renderUserProfileUpdateEmail(data: UserProfileUpdateEmailData) {
    const html = await render(React.createElement(UserProfileUpdateEmail, data))
    const text = await render(React.createElement(UserProfileUpdateEmail, data), { plainText: true })
    
    return { html, text }
}

export default UserProfileUpdateEmail 