import React from 'react'
import { render } from '@react-email/render'
import EmailLayout from '@/lib/email/layout/EmailLayout'

interface EmailConfirmationData {
    recipientEmail: string
    userName: string
    confirmationUrl: string
}

export default function EmailConfirmationEmail({ 
    recipientEmail, 
    userName, 
    confirmationUrl 
}: EmailConfirmationData) {
    return (
        <EmailLayout>
            <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '20px', 
                    textAlign: 'center',
                    borderBottom: '3px solid #3b82f6'
                }}>
                    <h1 style={{ 
                        color: '#1f2937', 
                        margin: '0',
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        Confirm Your Email Subscription
                    </h1>
                </div>
                
                <div style={{ 
                    padding: '30px 20px', 
                    backgroundColor: 'white',
                    lineHeight: '1.6'
                }}>
                    <p style={{ 
                        fontSize: '16px', 
                        color: '#374151',
                        marginBottom: '20px'
                    }}>
                        Hello,
                    </p>
                    
                    <p style={{ 
                        fontSize: '16px', 
                        color: '#374151',
                        marginBottom: '20px'
                    }}>
                        <strong>{userName}</strong> has requested to add <strong>{recipientEmail}</strong> to our mailing list to receive updates about events, promotions, and other exciting news.
                    </p>
                    
                    <p style={{ 
                        fontSize: '16px', 
                        color: '#374151',
                        marginBottom: '30px'
                    }}>
                        To confirm this subscription and start receiving our emails, please click the button below:
                    </p>
                    
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <a 
                            href={confirmationUrl}
                            style={{
                                display: 'inline-block',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '12px 30px',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                border: 'none'
                            }}
                        >
                            Confirm Email Subscription
                        </a>
                    </div>
                    
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#6b7280',
                        marginBottom: '20px'
                    }}>
                        If the button doesn&apos;t work, you can also copy and paste this link into your browser:
                    </p>
                    
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#3b82f6',
                        wordBreak: 'break-all',
                        marginBottom: '30px'
                    }}>
                        {confirmationUrl}
                    </p>
                    
                    <div style={{ 
                        borderTop: '1px solid #e5e7eb', 
                        paddingTop: '20px',
                        marginTop: '30px'
                    }}>
                        <p style={{ 
                            fontSize: '14px', 
                            color: '#6b7280',
                            marginBottom: '10px'
                        }}>
                            <strong>What you&apos;ll receive:</strong>
                        </p>
                        <ul style={{ 
                            fontSize: '14px', 
                            color: '#6b7280',
                            marginBottom: '20px',
                            paddingLeft: '20px'
                        }}>
                            <li>Updates about new events and tournaments</li>
                            <li>Special promotions and early bird offers</li>
                            <li>Important announcements and news</li>
                            <li>Exclusive content and tips</li>
                        </ul>
                        
                        <p style={{ 
                            fontSize: '14px', 
                            color: '#6b7280',
                            marginBottom: '10px'
                        }}>
                            <strong>Important:</strong>
                        </p>
                        <ul style={{ 
                            fontSize: '14px', 
                            color: '#6b7280',
                            marginBottom: '20px',
                            paddingLeft: '20px'
                        }}>
                            <li>You can unsubscribe at any time</li>
                            <li>We respect your privacy and will never share your email</li>
                            <li>This confirmation link will expire for security reasons</li>
                        </ul>
                    </div>
                    
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#6b7280',
                        fontStyle: 'italic'
                    }}>
                        If you didn&apos;t expect this email, you can safely ignore it. The subscription will only be activated if you click the confirmation button above.
                    </p>
                </div>
                
                <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '20px', 
                    textAlign: 'center',
                    borderTop: '1px solid #e5e7eb'
                }}>
                    <p style={{ 
                        fontSize: '12px', 
                        color: '#6b7280',
                        margin: '0'
                    }}>
                        This email was sent to {recipientEmail} because {userName} requested to add this address to our mailing list.
                    </p>
                </div>
            </div>
        </EmailLayout>
    )
}

export async function renderEmailConfirmationEmail(data: EmailConfirmationData) {
    const html = await render(React.createElement(EmailConfirmationEmail, data))
    const text = await render(React.createElement(EmailConfirmationEmail, data), {
        plainText: true,
    })
    
    return { html, text }
}
