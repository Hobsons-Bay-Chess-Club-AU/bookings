'use client'

import { LocationSettings } from '@/lib/types/database'
import { HiMapPin, HiArrowTopRightOnSquare } from 'react-icons/hi2'

interface EventLocationMapProps {
    location: string
    locationSettings?: LocationSettings
}

export default function EventLocationMap({ location, locationSettings }: EventLocationMapProps) {
    const hasMapUrl = locationSettings?.map_url
    const hasDirectionUrl = locationSettings?.direction_url

    if (!hasMapUrl && !hasDirectionUrl) {
        return (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-4">
                    <HiMapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Location</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{location}</p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <HiMapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Location</h3>
                    </div>
                    {hasDirectionUrl && (
                        <a
                            href={locationSettings.direction_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                            <HiArrowTopRightOnSquare className="h-4 w-4 mr-1" />
                            Get Directions
                        </a>
                    )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{location}</p>
            </div>

            {/* Embedded Map */}
            {hasMapUrl && (
                <div className="relative w-full" style={{ height: '300px' }}>
                    <iframe
                        src={decodeURIComponent(locationSettings.map_url || '')}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Event Location"
                        className="absolute inset-0"
                    />
                </div>
            )}

            {/* Directions button (if no map but has directions) */}
            {!hasMapUrl && hasDirectionUrl && (
                <div className="p-6">
                    <a
                        href={locationSettings.direction_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        <HiArrowTopRightOnSquare className="h-4 w-4 mr-2" />
                        Get Directions
                    </a>
                </div>
            )}
        </div>
    )
} 