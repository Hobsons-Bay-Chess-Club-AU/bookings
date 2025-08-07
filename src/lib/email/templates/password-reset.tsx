import React from 'react'
import { render } from '@react-email/render'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading, EmailButton } from '../layout/EmailLayout'

interface PasswordResetEmailData {
  userName: string
  resetUrl: string
}

function PasswordResetEmail({
  userName,
  resetUrl
}: PasswordResetEmailData) {
  return (
    <EmailLayout
      title="Reset Your Password"
      subtitle="Secure password reset for your account"
      headerColor="#dc2626"
    >
      <EmailHeading level={2}>Hi {userName},</EmailHeading>

      <EmailText>
        We received a request to reset your password for your HBCC Bookings account.
      </EmailText>

      <EmailCard backgroundColor="#f7fafc" borderColor="#3b82f6">
        <EmailText style={{ margin: '0' }}>
          Click the button below to reset your password. This link will expire in 1 hour for security reasons.
        </EmailText>
      </EmailCard>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailButton
          href={resetUrl}
          backgroundColor="#dc2626"
        >
          Reset Password
        </EmailButton>
      </EmailSection>

      <EmailCard backgroundColor="#fef2f2" borderColor="#dc2626">
        <EmailHeading level={3}>Security Notice</EmailHeading>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#374151' }}>
          <li>This link will expire in 1 hour</li>
          <li>If you didn&apos;t request this reset, you can safely ignore this email</li>
          <li>Your password will not be changed until you click the link above</li>
        </ul>
      </EmailCard>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          If you have any questions, please contact our support team.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderPasswordResetEmail(data: PasswordResetEmailData) {
  const html = await render(React.createElement(PasswordResetEmail, data))
  const text = await render(React.createElement(PasswordResetEmail, data), { plainText: true })
  
  return { html, text }
}

export default PasswordResetEmail 