'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'

interface EventQRCodeProps {
    event: {
        id: string
        title: string
        alias?: string
    }
    size?: number
    showLabel?: boolean
    className?: string
}

export default function EventQRCode({ event, size = 120, showLabel = true, className = '' }: EventQRCodeProps) {
    const [eventUrl, setEventUrl] = useState('')
    const [showFullscreen, setShowFullscreen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setEventUrl(
                event.alias
                    ? `${window.location.origin}/e/${event.alias}`
                    : `${window.location.origin}/events/${event.id}`
            )

            // Check if mobile and set up resize listener
            const checkMobile = () => {
                setIsMobile(window.innerWidth < 768)
            }

            checkMobile()
            window.addEventListener('resize', checkMobile)

            return () => window.removeEventListener('resize', checkMobile)
        }
    }, [event.alias, event.id])

    if (!eventUrl) {
        return (
            <div className={`flex items-center justify-center ${className}`}>
                <div className="animate-pulse bg-gray-200 rounded w-20 h-20 md:w-30 md:h-30" />
            </div>
        )
    }

    const handleQRClick = () => {
        // Only show fullscreen on mobile
        if (isMobile) {
            setShowFullscreen(true)
        }
    }

    return (
        <>
            <div className={`flex flex-col items-center ${className}`}>
                <div
                    className={`bg-white p-2 md:p-3 rounded-lg shadow-sm border ${isMobile ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                        }`}
                    onClick={handleQRClick}
                >
                    {/* Responsive QR Code - smaller on mobile, full size on desktop */}
                    <div className="block md:hidden">
                        <QRCode value={eventUrl} size={70} />
                    </div>
                    <div className="hidden md:block">
                        <QRCode value={eventUrl} size={size} />
                    </div>
                </div>
                {showLabel && (
                    <div className="mt-2 text-center">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {isMobile ? 'Tap to expand' : 'Scan to share'}
                        </p>
                        <p className="text-xs text-gray-500 break-all max-w-xs dark:text-gray-300">
                            {event.alias ? `/e/${event.alias}` : `/events/${event.id}`}
                        </p>
                    </div>
                )}
            </div>

            {/* Fullscreen QR Code Modal for Mobile */}
            {showFullscreen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 md:hidden">
                    <div className="bg-white rounded-lg p-8 m-4 max-w-sm w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">Scan QR Code</h3>
                            <button
                                onClick={() => setShowFullscreen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Close QR code"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="bg-white p-4 rounded-lg border">
                                <QRCode value={eventUrl} size={200} />
                            </div>
                            <div className="mt-4 text-center">
                                <p className="text-sm font-medium text-gray-900 mb-1">{event.title}</p>
                                <p className="text-xs text-gray-500 break-all">
                                    {eventUrl}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowFullscreen(false)}
                                className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
