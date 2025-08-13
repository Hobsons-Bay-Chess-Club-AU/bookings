'use client'

import { EventSection } from '@/lib/types/database'
import { HiCalendarDays, HiClock, HiUsers, HiCurrencyDollar, HiShieldCheck } from 'react-icons/hi2'
import { formatInTimezone } from '@/lib/utils/timezone'
 

interface EventSectionsDisplayProps {
    sections: EventSection[]
    eventTimezone: string
}

export default function EventSectionsDisplay({ sections, eventTimezone }: EventSectionsDisplayProps) {
    if (!sections || sections.length === 0) {
        return null
    }

    return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Event Sections
            </h3>
            <div className="space-y-4">
                {sections.map((section) => (
                    <div
                        key={section.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    {section.title}
                                    {(() => {
                                        const rules = section.section_rules
                                        if (!rules) return null
                                        const parts: string[] = []
                                        // Age short label
                                        if (rules.age_constraint?.enabled) {
                                            const minDate = rules.age_constraint.min_date ? new Date(rules.age_constraint.min_date) : null
                                            const maxDate = rules.age_constraint.max_date ? new Date(rules.age_constraint.max_date) : null
                                            if (minDate && maxDate) {
                                                parts.push(`Born between ${minDate.getFullYear()}–${maxDate.getFullYear()}`)
                                            } else if (minDate) {
                                                parts.push(`Born on or before ${minDate.getFullYear()}`)
                                            } else if (maxDate) {
                                                parts.push(`Born on or after ${maxDate.getFullYear()}`)
                                            }
                                        }
                                        // Gender short label
                                        if (rules.gender_rules?.enabled && Array.isArray(rules.gender_rules.allowed_genders) && rules.gender_rules.allowed_genders.length > 0) {
                                            const allowed = rules.gender_rules.allowed_genders
                                                .map(g => g.charAt(0).toUpperCase() + g.slice(1))
                                                .join('/');
                                            parts.push(`Gender: ${allowed}`)
                                        }
                                        if (parts.length === 0) return null
                                        return (
                                            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({parts.join('; ')})</span>
                                        )
                                    })()}
                                </h4>
                                {section.description && (
                                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                                        {section.description}
                                    </p>
                                )}
                                
                                {/* Section rules summary is shown inline next to title when applicable */}
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <HiCalendarDays className="h-4 w-4" />
                                        <span>
                                            {formatInTimezone(section.start_date, eventTimezone, 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <HiClock className="h-4 w-4" />
                                        <span>
                                            {formatInTimezone(section.start_date, eventTimezone, 'h:mm a')} - {formatInTimezone(section.end_date, eventTimezone, 'h:mm a')}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <HiUsers className="h-4 w-4" />
                                        <span>
                                            {section.current_seats} / {section.max_seats} seats
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <HiCurrencyDollar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        <span className="text-gray-600 dark:text-gray-400">
                                            From ${section.pricing?.[0]?.price || 0}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Available seats indicator */}
                                <div className="mt-3">
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const available = (section.available_seats ?? (section.max_seats - section.current_seats));
                                            const isFullOrOver = (available ?? 0) <= 0;
                                            const isLow = (available ?? 0) > 0 && (available ?? 0) < 10;
                                            const colorClass = isFullOrOver
                                                ? (section.whitelist_enabled ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')
                                                : isLow
                                                    ? 'text-amber-600 dark:text-amber-400'
                                                    : 'text-green-600 dark:text-green-400';
                                            const text = isFullOrOver
                                                ? (section.whitelist_enabled ? 'Whitelist only' : 'Fully Booked')
                                                : `${available} seats available`;
                                            return (
                                                <span className={`text-sm font-medium ${colorClass}`}>
                                                    {text}
                                                </span>
                                            )
                                        })()}
                                        {(() => {
                                            const available = (section.available_seats ?? (section.max_seats - section.current_seats));
                                            return (available ?? 0) > 0 && (available ?? 0) < 10 ? (
                                                <span className="text-xs text-amber-600 dark:text-amber-400">
                                                    • Limited availability
                                                </span>
                                            ) : null
                                        })()}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Pricing options */}
                            {section.pricing && section.pricing.length > 0 && (
                                <div className="flex-shrink-0">
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Pricing Options:
                                    </div>
                                    <div className="space-y-1">
                                        {section.pricing.slice(0, 3).map((price) => (
                                            <div key={price.id} className="text-sm">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                    {price.name}:
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-400 ml-1">
                                                    ${price.price}
                                                </span>
                                            </div>
                                        ))}
                                        {section.pricing.length > 3 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-500">
                                                +{section.pricing.length - 3} more options
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
