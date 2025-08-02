'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface LogoutButtonProps {
    className?: string
    children?: React.ReactNode
}

export default function LogoutButton({ className, children }: LogoutButtonProps) {
    const [loading, setLoading] = useState(false)
    const [showEmergencyOption, setShowEmergencyOption] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        setLoading(true)
        try {
            await supabase.auth.signOut()
            router.push('/')
            router.refresh()
        } catch (error) {
            console.error('Error logging out:', error)
            // Show emergency logout option if normal logout fails
            setShowEmergencyOption(true)
        } finally {
            setLoading(false)
        }
    }

    const handleEmergencyLogout = () => {
        // Navigate to the comprehensive logout page
        router.push('/auth/logout')
    }

    if (showEmergencyOption) {
        return (
            <div className="flex flex-col space-y-2">
                <button
                    onClick={handleLogout}
                    disabled={loading}
                    className={className}
                >
                    {children || (loading ? 'Signing out...' : 'Try Again')}
                </button>
                <button
                    onClick={handleEmergencyLogout}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                >
                    Emergency Logout (Force cleanup)
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={handleLogout}
            disabled={loading}
            className={className}
        >
            {children || (loading ? 'Signing out...' : 'Sign out')}
        </button>
    )
}