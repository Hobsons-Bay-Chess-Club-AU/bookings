// Calendar integration utilities

export interface CalendarEvent {
  title: string
  description?: string
  location?: string
  startDate: Date
  endDate: Date
  url?: string
  organizerName?: string
  organizerEmail?: string
}

export function formatDateForCalendar(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDateForCalendar(event.startDate)}/${formatDateForCalendar(event.endDate)}`,
    details: event.description || '',
    location: event.location || '',
  })
  
  return `${baseUrl}?${params.toString()}`
}

export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose'
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    body: event.description || '',
    location: event.location || '',
  })
  
  return `${baseUrl}?${params.toString()}`
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function generateIcsFile(event: CalendarEvent): string {
  const lines: string[] = []
  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Hobsons Bay Chess Club//Booking System//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${Date.now()}@hobsonsbaycc.com`)
  lines.push(`DTSTART:${formatDateForCalendar(event.startDate)}`)
  lines.push(`DTEND:${formatDateForCalendar(event.endDate)}`)
  lines.push(`SUMMARY:${escapeIcsText(event.title)}`)
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`)
  }
  if (event.url) {
    lines.push(`URL:${escapeIcsText(event.url)}`)
  }
  if (event.organizerEmail) {
    const cn = event.organizerName ? `;CN=${escapeIcsText(event.organizerName)}` : ''
    lines.push(`ORGANIZER${cn}:mailto:${escapeIcsText(event.organizerEmail)}`)
  }
  lines.push('STATUS:CONFIRMED')
  lines.push('SEQUENCE:0')
  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcsFile(event: CalendarEvent, filename: string = 'event.ics'): void {
  const icsContent = generateIcsFile(event)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}