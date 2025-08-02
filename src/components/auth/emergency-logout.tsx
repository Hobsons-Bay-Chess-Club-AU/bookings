'use client'

import { useRouter } from 'next/navigation'

interface EmergencyLogoutProps {
    className?: string
    children?: React.ReactNode
    variant?: 'button' | 'link'
}

export default function EmergencyLogout({
    className = '',
    children,
    variant = 'button'
}: EmergencyLogoutProps) {
    const router = useRouter()

    const handleEmergencyLogout = () => {
        // Direct navigation to the logout page which will handle all cleanup
        router.push('/auth/logout')
    }

    const baseClasses = variant === 'button'
        ? 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
        : 'text-red-600 hover:text-red-800 underline'

    return (
        <button
            onClick={handleEmergencyLogout}
            className={`${baseClasses} ${className}`}
            title="Use this if regular logout isn't working - performs complete session cleanup"
        >
            {children || 'Emergency Logout'}
        </button>
    )
}
