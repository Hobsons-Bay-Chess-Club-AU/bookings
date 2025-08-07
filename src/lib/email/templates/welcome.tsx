import React from 'react'
import { render } from '@react-email/render'
import EmailLayout, { EmailSection, EmailCard, EmailText, EmailHeading, EmailButton } from '../layout/EmailLayout'

interface WelcomeEmailData {
  userName: string
  userEmail?: string
}

function WelcomeEmail({
  userName
}: WelcomeEmailData) {
  return (
    <EmailLayout
      title="Welcome to HBCC Bookings!"
      subtitle="We're excited to have you on board"
      headerColor="#3b82f6"
    >
      <EmailHeading level={2}>Hi {userName},</EmailHeading>

      <EmailText>
        Welcome to HBCC Bookings! We&apos;re excited to have you on board.
      </EmailText>

      <EmailCard backgroundColor="#f7fafc" borderColor="#3b82f6">
        <EmailHeading level={3}>What you can do:</EmailHeading>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#374151' }}>
          <li>Browse and book events</li>
          <li>Manage your bookings</li>
          <li>Receive updates about events</li>
          <li>Contact event organizers</li>
        </ul>
      </EmailCard>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailButton
          href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`}
          backgroundColor="#3b82f6"
        >
          View Your Dashboard
        </EmailButton>
      </EmailSection>

      <EmailSection style={{ textAlign: 'center', marginTop: '30px' }}>
        <EmailText style={{ color: '#718096', fontSize: '14px', marginBottom: '0' }}>
          If you have any questions, please don&apos;t hesitate to contact us.
        </EmailText>
      </EmailSection>
    </EmailLayout>
  )
}

export async function renderWelcomeEmail(data: WelcomeEmailData) {
  const html = await render(React.createElement(WelcomeEmail, data))
  const text = await render(React.createElement(WelcomeEmail, data), { plainText: true })
  
  return { html, text }
}

export default WelcomeEmail 