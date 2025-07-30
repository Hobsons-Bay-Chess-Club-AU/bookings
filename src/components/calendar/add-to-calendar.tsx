'use client'

import { useState } from 'react'
import { 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl, 
  downloadIcsFile,
  CalendarEvent 
} from '@/lib/utils/calendar'

interface AddToCalendarProps {
  event: CalendarEvent
}

export default function AddToCalendar({ event }: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event)
    window.open(url, '_blank')
  }

  const handleOutlookCalendar = () => {
    const url = generateOutlookCalendarUrl(event)
    window.open(url, '_blank')
  }

  const handleIcsDownload = () => {
    const filename = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`
    downloadIcsFile(event, filename)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg 
          className="w-4 h-4 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
        Add to Calendar
        <svg 
          className="w-4 h-4 ml-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu">
            <button
              onClick={handleGoogleCalendar}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                <path 
                  fill="#4285f4" 
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path 
                  fill="#34a853" 
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path 
                  fill="#fbbc05" 
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path 
                  fill="#ea4335" 
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google Calendar
            </button>
            
            <button
              onClick={handleOutlookCalendar}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                <path 
                  fill="#0078d4" 
                  d="M21.53 4.5v15c0 1.1-.9 2-2 2h-15c-1.1 0-2-.9-2-2v-15c0-1.1.9-2 2-2h15c1.1 0 2 .9 2 2z"
                />
                <path 
                  fill="white" 
                  d="M17.5 11.5h-11v1h11v-1zm0-2h-11v1h11v-1zm0-2h-11v1h11v-1zm0 6h-11v1h11v-1z"
                />
              </svg>
              Outlook Calendar
            </button>
            
            <button
              onClick={handleIcsDownload}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              Download ICS file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}