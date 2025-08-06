'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminNav from '@/components/layout/admin-nav'

interface AdminLayoutProps {
    children: React.ReactNode
    requiredRole?: 'admin' | 'organizer' | 'customer_support'
    className?: string
}

export default function AdminLayout({
    children,
    requiredRole = 'organizer',
    className = ''
}: AdminLayoutProps) {
    // Removed unused user and profile state
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser()
                if (userError || !user) {
                    router.push('/auth/login')
                    return
                }
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                if (profileError || !profileData) {
                    router.push('/unauthorized')
                    return
                }
                // Check role authorization
                const hasPermission = requiredRole === 'organizer'
                    ? ['admin', 'organizer'].includes(profileData.role)
                    : requiredRole === 'customer_support'
                        ? ['admin', 'customer_support'].includes(profileData.role)
                        : profileData.role === 'admin'
                if (!hasPermission) {
                    router.push('/unauthorized')
                    return
                }
                setAuthorized(true)
            } catch (error) {
                console.error('Auth check error:', error)
                router.push('/auth/login')
            } finally {
                setLoading(false)
            }
        }
        checkAuth()
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!session?.user) {
                router.push('/auth/login')
            }
        })
        return () => subscription.unsubscribe()
    }, [supabase, router, requiredRole])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex justify-center items-center min-h-96">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                </main>
            </div>
        )
    }

    if (!authorized) {
        return null // Will redirect
    }

    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className} text-gray-900 dark:text-gray-100`}>
            <AdminNav />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    )
}
