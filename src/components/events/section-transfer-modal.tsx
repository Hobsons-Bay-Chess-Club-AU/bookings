'use client'

import { useState } from 'react'
import { EventSection, Participant } from '@/lib/types/database'
import { HiArrowRight, HiXMark, HiUsers } from 'react-icons/hi2'

interface SectionTransferModalProps {
    isOpen: boolean
    onClose: () => void
    eventId: string
    sections: EventSection[]
    participants: Participant[]
    onTransfer: (transfers: Array<{ participantId: string; fromSectionId: string; toSectionId: string }>) => Promise<void>
}

export default function SectionTransferModal({
    isOpen,
    onClose,
    sections,
    participants,
    onTransfer
}: SectionTransferModalProps) {
    const [selectedTransfers, setSelectedTransfers] = useState<Array<{ participantId: string; fromSectionId: string; toSectionId: string }>>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Group participants by their current section
    const participantsBySection = sections.reduce((acc, section) => {
        acc[section.id] = participants.filter(p => p.section_id === section.id)
        return acc
    }, {} as Record<string, Participant[]>)

    const filteredParticipants = participants.filter(p => 
        p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleTransfer = (participantId: string, fromSectionId: string, toSectionId: string) => {
        if (fromSectionId === toSectionId) return

        setSelectedTransfers(prev => {
            // Remove any existing transfer for this participant
            const filtered = prev.filter(t => t.participantId !== participantId)
            // Add new transfer
            return [...filtered, { participantId, fromSectionId, toSectionId }]
        })
    }

    const removeTransfer = (participantId: string) => {
        setSelectedTransfers(prev => prev.filter(t => t.participantId !== participantId))
    }

    const getTransferForParticipant = (participantId: string) => {
        return selectedTransfers.find(t => t.participantId === participantId)
    }

    const handleSubmit = async () => {
        if (selectedTransfers.length === 0) return

        setLoading(true)
        try {
            await onTransfer(selectedTransfers)
            setSelectedTransfers([])
            onClose()
        } catch (error) {
            console.error('Error transferring participants:', error)
            alert('Failed to transfer participants')
        } finally {
            setLoading(false)
        }
    }

    const getSectionParticipantCount = (sectionId: string) => {
        return participantsBySection[sectionId]?.length || 0
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Transfer Participants Between Sections
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <HiXMark className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Search */}
                    <div className="mb-6">
                        <input
                            type="text"
                            placeholder="Search participants by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Section Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {sections.map((section) => (
                            <div
                                key={section.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                        {section.title}
                                    </h3>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {getSectionParticipantCount(section.id)} / {section.max_seats}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {section.description}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Participants List */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                            Participants ({filteredParticipants.length})
                        </h3>
                        
                        {filteredParticipants.map((participant) => {
                            const currentSection = sections.find(s => s.id === participant.section_id)
                            const transfer = getTransferForParticipant(participant.id!)

                            return (
                                <div
                                    key={participant.id}
                                    className="flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
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

                                    <div className="flex items-center space-x-3">
                                        {/* Current Section */}
                                        <div className="text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">From:</span>
                                            <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                                                {currentSection?.title || 'Unassigned'}
                                            </span>
                                        </div>

                                        {/* Transfer Arrow */}
                                        {transfer && (
                                            <HiArrowRight className="h-4 w-4 text-indigo-500" />
                                        )}

                                        {/* Target Section */}
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">To:</span>
                                            <select
                                                value={transfer?.toSectionId || ''}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleTransfer(participant.id!, participant.section_id || '', e.target.value)
                                                    } else {
                                                        removeTransfer(participant.id!)
                                                    }
                                                }}
                                                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">No transfer</option>
                                                {sections
                                                    .filter(s => s.id !== participant.section_id)
                                                    .map((section) => (
                                                        <option key={section.id} value={section.id}>
                                                            {section.title} ({getSectionParticipantCount(section.id)}/{section.max_seats})
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* Remove Transfer */}
                                        {transfer && (
                                            <button
                                                onClick={() => removeTransfer(participant.id!)}
                                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <HiXMark className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {filteredParticipants.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <HiUsers className="h-8 w-8 mx-auto mb-2" />
                                <p>No participants found matching your search.</p>
                            </div>
                        )}
                    </div>

                    {/* Transfer Summary */}
                    {selectedTransfers.length > 0 && (
                        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                Transfer Summary ({selectedTransfers.length} transfers)
                            </h4>
                            <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                                {selectedTransfers.map((transfer) => {
                                    const participant = participants.find(p => p.id === transfer.participantId)
                                    const fromSection = sections.find(s => s.id === transfer.fromSectionId)
                                    const toSection = sections.find(s => s.id === transfer.toSectionId)
                                    
                                    return (
                                        <div key={transfer.participantId} className="flex items-center space-x-2">
                                            <span>{participant?.first_name} {participant?.last_name}:</span>
                                            <span>{fromSection?.title}</span>
                                            <HiArrowRight className="h-3 w-3" />
                                            <span>{toSection?.title}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedTransfers.length} transfer{selectedTransfers.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || selectedTransfers.length === 0}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Transferring...' : `Transfer ${selectedTransfers.length} Participant${selectedTransfers.length !== 1 ? 's' : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
