import React from 'react'

interface EmailLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  headerColor?: string
  showFooter?: boolean
  footerText?: string
}

export default function EmailLayout({
  children,
  title = 'Hobsons Bay Chess Club',
  subtitle,
  headerColor = '#1f2937',
  showFooter = true,
  footerText = 'This is an automated email from the Hobsons Bay Chess Club booking system.'
}: EmailLayoutProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: headerColor, color: 'white', padding: '30px', textAlign: 'center' }}>
        <h1 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: '10px 0 0 0', opacity: '0.9' }}>{subtitle}</p>
        )}
      </div>

      {/* Main Content */}
      <div style={{ backgroundColor: 'white', padding: '40px', borderLeft: '4px solid #3b82f6' }}>
        {children}
      </div>

      {/* Footer */}
      {showFooter && (
        <div style={{ backgroundColor: '#f3f4f6', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
            {footerText}
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0 0 0' }}>
            Please do not reply to this email.
          </p>
        </div>
      )}
    </div>
  )
}

// Common styled components for email content
export const EmailSection = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ marginBottom: '20px', ...style }}>
    {children}
  </div>
)

export const EmailCard = ({ children, backgroundColor = '#f3f4f6', borderColor = '#3b82f6' }: {
  children: React.ReactNode
  backgroundColor?: string
  borderColor?: string
}) => (
  <div style={{
    backgroundColor,
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    borderLeft: `4px solid ${borderColor}`
  }}>
    {children}
  </div>
)

export const EmailButton = ({ href, children, backgroundColor = '#3b82f6', style = {} }: {
  href: string
  children: React.ReactNode
  backgroundColor?: string
  style?: React.CSSProperties
}) => (
  <a
    href={href}
    style={{
      display: 'inline-block',
      backgroundColor,
      color: 'white',
      padding: '12px 24px',
      textDecoration: 'none',
      borderRadius: '6px',
      fontWeight: 'bold',
      marginRight: '15px',
      ...style
    }}
  >
    {children}
  </a>
)

export const EmailText = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', marginBottom: '20px', ...style }}>
    {children}
  </p>
)

export const EmailHeading = ({ children, level = 2, style = {} }: {
  children: React.ReactNode
  level?: 1 | 2 | 3 | 4
  style?: React.CSSProperties
}) => {
  const fontSize = level === 1 ? '24px' : level === 2 ? '20px' : level === 3 ? '18px' : '16px'
  
  const headingStyle = {
    color: '#1f2937',
    margin: '0 0 20px 0',
    fontSize,
    fontWeight: 'bold',
    ...style
  }
  
  switch (level) {
    case 1:
      return <h1 style={headingStyle}>{children}</h1>
    case 3:
      return <h3 style={headingStyle}>{children}</h3>
    case 4:
      return <h4 style={headingStyle}>{children}</h4>
    default:
      return <h2 style={headingStyle}>{children}</h2>
  }
} 