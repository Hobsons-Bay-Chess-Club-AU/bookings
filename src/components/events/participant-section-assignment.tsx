'use client'

import { useState, useEffect } from 'react'
import { EventSection, Participant } from '@/lib/types/database'
import { HiUsers, HiCheck, HiXMark } from 'react-icons/hi2'

interface ParticipantSectionAssignmentProps {
    eventId: string
    sections: EventSection[]
    participants: Participant[]
    onAssignmentChange: (assignments: Array<{ participantId: string; sectionId: string }>) => void
    initialAssignments?: Array<{ participantId: string; sectionId: string }>
}

export default function ParticipantSectionAssignment({
    sections,
    participants,
    onAssignmentChange,
    initialAssignments = []
}: ParticipantSectionAssignmentProps) {
    const [assignments, setAssignments] = useState<Array<{ participantId: string; sectionId: string }>>(initialAssignments)

    // Update parent when assignments change
    useEffect(() => {
        onAssignmentChange(assignments)
    }, [assignments, onAssignmentChange])

    const assignParticipantToSection = (participantId: string, sectionId: string) => {
        setAssignments(prev => {
            // Remove any existing assignment for this participant
            const filtered = prev.filter(a => a.participantId !== participantId)
            // Add new assignment
            return [...filtered, { participantId, sectionId }]
        })
    }

    const removeAssignment = (participantId: string) => {
        setAssignments(prev => prev.filter(a => a.participantId !== participantId))
    }



    const getSectionParticipantCount = (sectionId: string) => {
        return assignments.filter(a => a.sectionId === sectionId).length
    }

    const getUnassignedParticipants = () => {
        const assignedParticipantIds = assignments.map(a => a.participantId)
        return participants.filter(p => !assignedParticipantIds.includes(p.id!))
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Assign Participants to Sections
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag participants to sections or use the assignment controls below.
                </p>
            </div>

            {/* Section Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sections.map((section) => (
                    <div
                        key={section.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                {section.title}
                            </h4>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {getSectionParticipantCount(section.id)} / {section.max_seats}
                            </span>
                        </div>
                        
                        <div className="space-y-2">
                            {assignments
                                .filter(a => a.sectionId === section.id)
                                .map(assignment => {
                                    const participant = participants.find(p => p.id === assignment.participantId)
                                    return participant ? (
                                        <div
                                            key={assignment.participantId}
                                            className="flex items-center justify-between bg-white dark:bg-gray-700 rounded px-3 py-2 text-sm"
                                        >
                                            <span className="text-gray-900 dark:text-gray-100">
                                                {participant.first_name} {participant.last_name}
                                            </span>
                                            <button
                                                onClick={() => removeAssignment(assignment.participantId)}
                                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <HiXMark className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : null
                                })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Unassigned Participants */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Unassigned Participants ({getUnassignedParticipants().length})
                </h4>
                
                <div className="space-y-3">
                    {getUnassignedParticipants().map((participant) => (
                        <div
                            key={participant.id}
                            className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                            <div className="flex items-center space-x-3">
                                <HiUsers className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        {participant.first_name} {participant.last_name}
                                    </p>
                                    {participant.contact_email && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {participant.contact_email}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Assign to:</span>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            assignParticipantToSection(participant.id!, e.target.value)
                                        }
                                    }}
                                    className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select section...</option>
                                    {sections.map((section) => (
                                        <option key={section.id} value={section.id}>
                                            {section.title} ({getSectionParticipantCount(section.id)}/{section.max_seats})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                    
                    {getUnassignedParticipants().length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <HiCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p>All participants have been assigned to sections!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Assignment Summary */}
            {assignments.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Assignment Summary
                    </h4>
                    <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                        {sections.map((section) => {
                            const count = getSectionParticipantCount(section.id)
                            if (count > 0) {
                                return (
                                    <div key={section.id} className="flex justify-between">
                                        <span>{section.title}:</span>
                                        <span>{count} participant{count !== 1 ? 's' : ''}</span>
                                    </div>
                                )
                            }
                            return null
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
