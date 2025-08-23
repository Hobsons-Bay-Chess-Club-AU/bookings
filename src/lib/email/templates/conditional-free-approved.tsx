import React from 'react'
import { render } from '@react-email/render'
import EmailLayout from '@/lib/email/layout/EmailLayout'

interface ConditionalFreeApprovedData {
    userName: string
    eventTitle: string
    eventDate: string
    eventLocation: string
    bookingId: string
}

export default function ConditionalFreeApprovedTemplate({ data }: { data: ConditionalFreeApprovedData }) {
    return (
        <EmailLayout>
            <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
                <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>🎉 Your Conditional Free Entry Has Been Approved!</h1>
                
                <p>Dear {data.userName},</p>
                
                <p>Great news! Your conditional free entry request has been approved by the event organizer.</p>
                
                <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    border: '1px solid #0ea5e9', 
                    borderRadius: '8px', 
                    padding: '20px', 
                    margin: '20px 0' 
                }}>
                    <h2 style={{ color: '#0c4a6e', marginTop: '0' }}>Event Details</h2>
                    <p><strong>Event:</strong> {data.eventTitle}</p>
                    <p><strong>Date:</strong> {data.eventDate}</p>
                    <p><strong>Location:</strong> {data.eventLocation}</p>
                    <p><strong>Booking ID:</strong> {data.bookingId}</p>
                </div>
                
                <p>Your booking is now confirmed and you are officially registered for the event. No payment is required.</p>
                
                <p>Please arrive at the event venue on time and bring a form of identification if required by the organizer.</p>
                
                <p>If you have any questions about the event, please contact the event organizer directly.</p>
                
                <p>We look forward to seeing you at the event!</p>
                
                <p>Best regards,<br />The Event Team</p>
            </div>
        </EmailLayout>
    )
}

export async function renderConditionalFreeApprovedEmail(data: ConditionalFreeApprovedData) {
    const html = await render(React.createElement(ConditionalFreeApprovedTemplate, { data }))
    const text = await render(React.createElement(ConditionalFreeApprovedTemplate, { data }), { plainText: true })
    
    return { html, text }
}
