'use client'

import { useState } from 'react'
import { EventSection } from '@/lib/types/database'
import { HiExclamationTriangle, HiCheck } from 'react-icons/hi2'

interface SectionWhitelistSettingsProps {
    sections: EventSection[]
    onUpdate: (sectionId: string, whitelistEnabled: boolean) => Promise<void>
    loading?: boolean
}

export default function SectionWhitelistSettings({ 
    sections, 
    onUpdate, 
    loading = false 
}: SectionWhitelistSettingsProps) {
    const [updatingSection, setUpdatingSection] = useState<string | null>(null)

    const handleToggleWhitelist = async (sectionId: string, enabled: boolean) => {
        setUpdatingSection(sectionId)
        try {
            await onUpdate(sectionId, enabled)
        } catch (error) {
            console.error('Error updating section whitelist setting:', error)
        } finally {
            setUpdatingSection(null)
        }
    }

    const getSectionStatus = (section: EventSection) => {
        const isFull = (section.available_seats ?? 0) === 0
        const whitelistEnabled = section.whitelist_enabled || false
        const shouldWhitelist = isFull && whitelistEnabled
        return { isFull, whitelistEnabled, shouldWhitelist }
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Section Whitelist Settings
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Enable whitelist for individual sections when they become full. Users will be able to register for whitelist spots in these sections.
                </p>
            </div>

            <div className="space-y-4">
                {sections.map((section) => {
                    const status = getSectionStatus(section)
                    const isUpdating = updatingSection === section.id

                    return (
                        <div
                            key={section.id}
                            className={`p-4 border rounded-lg ${
                                status.shouldWhitelist
                                    ? 'border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {section.title}
                                        </h4>
                                        {status.isFull && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                Full
                                            </span>
                                        )}
                                        {status.shouldWhitelist && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                                Whitelist Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {section.available_seats ?? 0} of {section.max_seats} seats available
                                    </p>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center">
                                        <input
                                            id={`whitelist-${section.id}`}
                                            type="checkbox"
                                            checked={section.whitelist_enabled || false}
                                            onChange={(e) => handleToggleWhitelist(section.id, e.target.checked)}
                                            disabled={loading || isUpdating}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                                        />
                                        <label
                                            htmlFor={`whitelist-${section.id}`}
                                            className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                                        >
                                            Enable Whitelist
                                        </label>
                                    </div>

                                    {isUpdating && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                    )}
                                </div>
                            </div>

                            {status.shouldWhitelist && (
                                <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                                    <div className="flex items-start">
                                        <HiExclamationTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                                        <div className="text-sm text-amber-800 dark:text-amber-200">
                                            <p className="font-medium">Whitelist is active for this section</p>
                                            <p className="mt-1">
                                                New registrations for this section will be placed on the whitelist until you release them.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {section.whitelist_enabled && !status.isFull && (
                                <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                                    <div className="flex items-start">
                                        <HiCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                                        <div className="text-sm text-blue-800 dark:text-blue-200">
                                            <p className="font-medium">Whitelist is enabled</p>
                                            <p className="mt-1">
                                                When this section becomes full, new registrations will automatically be placed on the whitelist.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    How Section Whitelist Works
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• When a section is full and whitelist is enabled, new registrations are captured as whitelisted</li>
                    <li>• Users cannot mix whitelist sections with available sections in the same booking</li>
                    <li>• You can release whitelisted bookings to allow payment completion</li>
                    <li>• Section whitelist works independently of event-level whitelist settings</li>
                </ul>
            </div>
        </div>
    )
}
