'use client'


import { Event, Profile } from '@/lib/types/database'

interface ContactOrganizerButtonProps {
    event: Event
    organizer?: Profile
    bookingId?: string
}

export default function ContactOrganizerButton({ organizer }: ContactOrganizerButtonProps) {
    const handleContactClick = () => {
        // Trigger the existing chat widget button
        setTimeout(() => {
            const chatButton = document.querySelector('[data-chat-widget-button]') as HTMLButtonElement
            if (chatButton) {
                chatButton.click()
            }
        }, 100)
    }

    if (!organizer) return null

    return (
        <button
            type="button"
            onClick={handleContactClick}
            className="w-full bg-green-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
            💬 Contact Event Organizer
        </button>
    )
} 