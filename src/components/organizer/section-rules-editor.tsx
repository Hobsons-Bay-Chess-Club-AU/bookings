'use client'

import { useState } from 'react'
import { SectionRules } from '@/lib/types/database'
import { HiCalendarDays, HiUsers, HiInformationCircle } from 'react-icons/hi2'

interface SectionRulesEditorProps {
    rules: SectionRules | undefined
    onChange: (rules: SectionRules) => void
}

const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' }
]

export default function SectionRulesEditor({ rules, onChange }: SectionRulesEditorProps) {
    const [localRules, setLocalRules] = useState<SectionRules>(rules || {})

    const updateRules = (newRules: SectionRules) => {
        setLocalRules(newRules)
        onChange(newRules)
    }

    const updateAgeConstraint = (updates: Partial<NonNullable<SectionRules['age_constraint']>>) => {
        const newRules = {
            ...localRules,
            age_constraint: {
                enabled: false,
                ...localRules.age_constraint,
                ...updates
            }
        }
        updateRules(newRules)
    }

    const updateGenderRules = (updates: Partial<NonNullable<SectionRules['gender_rules']>>) => {
        const newRules = {
            ...localRules,
            gender_rules: {
                enabled: false,
                allowed_genders: [],
                ...localRules.gender_rules,
                ...updates
            }
        }
        updateRules(newRules)
    }

    const toggleGender = (gender: string) => {
        const currentGenders = localRules.gender_rules?.allowed_genders || []
        const newGenders = currentGenders.includes(gender)
            ? currentGenders.filter(g => g !== gender)
            : [...currentGenders, gender]
        
        updateGenderRules({ allowed_genders: newGenders })
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Section Eligibility Rules
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Configure rules to control who can join this section
                </p>
            </div>

            {/* Age Constraint Rules */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <HiCalendarDays className="h-5 w-5 text-gray-400 mr-2" />
                        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
                            Age Constraints
                        </h4>
                    </div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={localRules.age_constraint?.enabled || false}
                            onChange={(e) => updateAgeConstraint({ enabled: e.target.checked })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable</span>
                    </label>
                </div>

                {localRules.age_constraint?.enabled && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Minimum Birth Date (Youngest Age)
                                </label>
                                <input
                                    type="date"
                                    value={localRules.age_constraint?.min_date || ''}
                                    onChange={(e) => updateAgeConstraint({ min_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Participants must be born on or before this date
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Maximum Birth Date (Oldest Age)
                                </label>
                                <input
                                    type="date"
                                    value={localRules.age_constraint?.max_date || ''}
                                    onChange={(e) => updateAgeConstraint({ max_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Participants must be born on or after this date
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Custom Description (Optional)
                            </label>
                            <input
                                type="text"
                                value={localRules.age_constraint?.description || ''}
                                onChange={(e) => updateAgeConstraint({ description: e.target.value })}
                                placeholder="e.g., Only participants born between 2010-2015"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                This message will be shown to users when validation fails
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Gender Rules */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <HiUsers className="h-5 w-5 text-gray-400 mr-2" />
                        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
                            Gender Restrictions
                        </h4>
                    </div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={localRules.gender_rules?.enabled || false}
                            onChange={(e) => updateGenderRules({ enabled: e.target.checked })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable</span>
                    </label>
                </div>

                {localRules.gender_rules?.enabled && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Allowed Genders
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {GENDER_OPTIONS.map((option) => (
                                    <label key={option.value} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={localRules.gender_rules?.allowed_genders?.includes(option.value) || false}
                                            onChange={() => toggleGender(option.value)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            {option.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {(!localRules.gender_rules?.allowed_genders || localRules.gender_rules.allowed_genders.length === 0) && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                    Please select at least one gender option
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Custom Description (Optional)
                            </label>
                            <input
                                type="text"
                                value={localRules.gender_rules?.description || ''}
                                onChange={(e) => updateGenderRules({ description: e.target.value })}
                                placeholder="e.g., Open to male and female participants"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                This message will be shown to users when validation fails
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Rules Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                    <HiInformationCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                            Rules Summary
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            {getRulesSummary(localRules)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function getRulesSummary(rules: SectionRules): string {
    const summaries: string[] = []

    if (rules.age_constraint?.enabled) {
        if (rules.age_constraint.min_date && rules.age_constraint.max_date) {
            summaries.push(`Age: Born between ${new Date(rules.age_constraint.min_date).toLocaleDateString()} and ${new Date(rules.age_constraint.max_date).toLocaleDateString()}`)
        } else if (rules.age_constraint.min_date) {
            summaries.push(`Age: Born on or before ${new Date(rules.age_constraint.min_date).toLocaleDateString()}`)
        } else if (rules.age_constraint.max_date) {
            summaries.push(`Age: Born on or after ${new Date(rules.age_constraint.max_date).toLocaleDateString()}`)
        } else {
            summaries.push('Age restrictions apply')
        }
    }

    if (rules.gender_rules?.enabled && rules.gender_rules.allowed_genders?.length > 0) {
        const allowedGenders = rules.gender_rules.allowed_genders
            .map(g => g.charAt(0).toUpperCase() + g.slice(1))
            .join(', ')
        summaries.push(`Gender: Open to ${allowedGenders}`)
    }

    if (summaries.length === 0) {
        return 'No restrictions - open to all participants'
    }

    return summaries.join('. ')
}
