// Calendar integration utilities

export interface CalendarEvent {
  title: string
  description?: string
  location?: string
  startDate: Date
  endDate: Date
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

export function generateIcsFile(event: CalendarEvent): string {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hobsons Bay Chess Club//Booking System//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@hobsonsbaycc.com`,
    `DTSTART:${formatDateForCalendar(event.startDate)}`,
    `DTEND:${formatDateForCalendar(event.endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description || ''}`,
    `LOCATION:${event.location || ''}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
  
  return icsContent
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