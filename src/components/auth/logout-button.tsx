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
        } finally {
            setLoading(false)
        }
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