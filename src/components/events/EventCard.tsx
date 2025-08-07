"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import MarkdownContent from '@/components/ui/html-content'
import CopyButton from '@/components/ui/copy-button'
import Image from 'next/image'
import { HiStar, HiMapPin, HiQrCode, HiXMark } from 'react-icons/hi2'
import type { Event } from '@/lib/types/database'

interface EventCardProps {
  event: Event
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
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-lg relative flex flex-col h-full transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] group border border-gray-100 dark:border-gray-700">
      {/* QR Icon */}
      <button
        className="absolute top-1 right-1 z-20 p-1 bg-white dark:bg-gray-900 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-lg hover:scale-110"
        title="Show QR code"
        onClick={() => setShowQR(true)}
        type="button"
      >
        <HiQrCode className="h-5 w-5 text-gray-500 dark:text-gray-300" />
      </button>

      {/* QR Overlay */}
      {showQR && eventUrl && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95 rounded-lg animate-fadeIn">
          <button
            className="absolute top-1 right-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110"
            onClick={() => setShowQR(false)}
            title="Close QR code"
            type="button"
          >
            <HiXMark className="h-5 w-5 text-gray-500 dark:text-gray-300" />
          </button>
          <QRCode value={eventUrl} size={180} />
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-300 break-all text-center max-w-xs">
            {eventUrl}
          </div>
        </div>
      )}

      {event.image_url && (
        <div className="h-48 bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
          <Image
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={event.image_url}
            alt={event.title}
            width={400}
            height={200}
            priority={true}
          />
        </div>
      )}
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 transition-colors duration-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                {new Date(event.start_date).toLocaleDateString()}
              </p>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(event.start_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </p>
            </div>
          </div>
          <div className="flex space-x-2 pr-4">
            {event.is_promoted && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 animate-pulse">
                <HiStar className="h-3 w-3 mr-1" />
                Featured
              </span>
            )}
            {event.status === 'entry_closed' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                Entry Closed
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-2 flex-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 transition-colors duration-200 group-hover:text-gray-800 dark:group-hover:text-gray-200">
            {event.title}
          </h3>
          <MarkdownContent
            content={event.description || ''}
            className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-3"
          />
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <HiMapPin className="h-4 w-4 mr-1 transition-transform duration-200 group-hover:scale-110" />
            {event.location}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200 group-hover:text-gray-800 dark:group-hover:text-gray-200">
              AUD ${event.price.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {event.max_attendees ?
                `${event.current_attendees}/${event.max_attendees} spots` :
                `${event.current_attendees} attending`
              }
            </p>
          </div>
        </div>
        
        <div className="mt-6 space-y-2 mt-auto">
          <Link
            href={event.alias ? `/e/${event.alias}` : `/events/${event.id}`}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] dark:focus:ring-offset-0"
          >
            View Details & Book
          </Link>
          {event.alias && (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <span className="transition-transform duration-200 group-hover:scale-110">🔗</span>
                <span className="font-mono">{`/e/${event.alias}`}</span>
              </div>
              <CopyButton text={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/e/${event.alias}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}