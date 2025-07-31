import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/service'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message } = await request.json()

    if (!to || !subject || !message) {
      return NextResponse.json({ 
        error: 'To, subject, and message are required' 
      }, { status: 400 })
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #2d3748; margin: 0;">Test Email</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="color: #2d3748;">Email Test</h2>
          <p>This is a test email from your HBCC Bookings application.</p>
          
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2d3748; margin-top: 0;">Message:</h3>
            <p>${message}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #718096; font-size: 14px;">
              If you received this email, your email configuration is working correctly!
            </p>
          </div>
        </div>
      </div>
    `

    await sendEmail({
      to,
      subject,
      html
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully' 
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
} 