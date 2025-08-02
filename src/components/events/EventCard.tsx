"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import MarkdownContent from '@/components/ui/html-content'
import CopyButton from '@/components/ui/copy-button'
import { HiStar, HiMapPin } from 'react-icons/hi2'

interface EventCardProps {
  event: any
}

export default function EventCard({ event }: EventCardProps) {
  const [showQR, setShowQR] = useState(false)
  const [eventUrl, setEventUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEventUrl(
        event.alias
          ? `${window.location.origin}/e/${event.alias}`
          : `${window.location.origin}/events/${event.id}`
      )
    }
  }, [event.alias, event.id])

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg relative">
      {/* QR Icon */}
      <button
        className="absolute top-1 right-1 z-20 p-1 bg-white rounded-full shadow hover:bg-gray-100"
        title="Show QR code"
        onClick={() => setShowQR(true)}
        type="button"
      >
        {/* QR code SVG icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="3" y="3" width="7" height="7" rx="2" strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" strokeWidth="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" strokeWidth="2" />
          <rect x="10" y="10" width="4" height="4" rx="1" strokeWidth="2" />
        </svg>
      </button>

      {/* QR Overlay */}
      {showQR && eventUrl && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white bg-opacity-95 rounded-lg">
          <button
            className="absolute top-1 right-1 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
            onClick={() => setShowQR(false)}
            title="Close QR code"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <QRCode value={eventUrl} size={180} />
          <div className="mt-4 text-xs text-gray-500 break-all text-center max-w-xs">
            {eventUrl}
          </div>
        </div>
      )}

      {event.image_url && (
        <div className="h-48 bg-gray-200">
          <img
            className="h-full w-full object-cover"
            src={event.image_url}
            alt={event.title}
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <p className="text-sm font-medium text-indigo-600">
                {new Date(event.start_date).toLocaleDateString()}
              </p>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">
                {new Date(event.start_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <div className="flex space-x-2 pr-4">
            {event.is_promoted && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <HiStar className="h-3 w-3 mr-1" />
                Featured
              </span>
            )}
            {event.status === 'entry_closed' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Entry Closed
              </span>
            )}
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-lg font-medium text-gray-900">
            {event.title}
          </h3>
          <MarkdownContent
            content={event.description || ''}
            className="mt-1 text-sm text-gray-500 line-clamp-3"
          />
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500 flex items-center">
            <HiMapPin className="h-4 w-4 mr-1" />
            {event.location}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">
              AUD ${event.price.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">
              {event.max_attendees ?
                `${event.current_attendees}/${event.max_attendees} spots` :
                `${event.current_attendees} attending`
              }
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          <Link
            href={event.alias ? `/e/${event.alias}` : `/events/${event.id}`}
            className="w-full bg-indigo-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Details & Book
          </Link>
          {event.alias && (
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <span>🔗</span>
              <span className="font-mono">localhost:3000/e/{event.alias}</span>
              <CopyButton text={`localhost:3000/e/${event.alias}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}