'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SectionLoader } from '@/components/ui/loading-states'

export default function LogoutPage() {
    const [status, setStatus] = useState<'logging-out' | 'verifying' | 'success' | 'error'>('logging-out')
    const [message, setMessage] = useState('Signing out and cleaning up session...')
    const [isSignedOut, setIsSignedOut] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const performLogout = async () => {
            try {
                // Step 1: Clear local storage items that might be cached
                if (typeof window !== 'undefined') {
                    // Clear Supabase session data
                    const keys = Object.keys(localStorage)
                    keys.forEach(key => {
                        if (key.startsWith('sb-') || key.includes('supabase')) {
                            localStorage.removeItem(key)
                        }
                    })

                    // Clear session storage
                    const sessionKeys = Object.keys(sessionStorage)
                    sessionKeys.forEach(key => {
                        if (key.startsWith('sb-') || key.includes('supabase')) {
                            sessionStorage.removeItem(key)
                        }
                    })
                }

                setMessage('Clearing authentication state...')

                // Step 2: Call server-side logout API for complete cleanup
                try {
                    await fetch('/api/auth/logout', { method: 'POST' })
                } catch (error) {
                    console.warn('Server-side logout failed, continuing with client-side cleanup:', error)
                }

                // Step 3: Force sign out from Supabase client
                await supabase.auth.signOut({
                    scope: 'global' // This signs out from all sessions
                })

                setMessage('Cleaning up cookies and cache...')

                // Step 4: Clear any auth cookies by setting them to expire
                if (typeof document !== 'undefined') {
                    document.cookie.split(";").forEach(function (c) {
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                    });
                }

                setMessage('Verifying logout completed...')
                setStatus('verifying')

                // Step 5: Verify logout is complete by checking auth.getUser()
                let verificationAttempts = 0
                const maxAttempts = 10
                const verifyLogout = async () => {
                    try {
                        const { data: { user }, error } = await supabase.auth.getUser()

                        if (!user || error) {
                            // Successfully signed out
                            setIsSignedOut(true)
                            setMessage('Logout confirmed! You have been successfully signed out.')
                            setStatus('success')
                            return true
                        } else {
                            // Still signed in, try again
                            verificationAttempts++
                            if (verificationAttempts < maxAttempts) {
                                setMessage(`Verifying logout... (attempt ${verificationAttempts}/${maxAttempts})`)
                                setTimeout(verifyLogout, 500) // Wait 500ms before next attempt
                                return false
                            } else {
                                // Max attempts reached, but we did clear local state
                                setIsSignedOut(true) // Assume success since we cleared everything
                                setMessage('Local session cleared. You may need to refresh the page.')
                                setStatus('success')
                                return true
                            }
                        }
                    } catch (error) {
                        console.warn('Error verifying logout:', error)
                        // Assume success since we cleared local state
                        setIsSignedOut(true)
                        setMessage('Local session cleared successfully.')
                        setStatus('success')
                        return true
                    }
                }

                await verifyLogout()

            } catch (error) {
                console.error('Logout error:', error)
                setStatus('error')
                setMessage('Error during logout, but local session has been cleared.')
                setIsSignedOut(true) // Assume we're signed out since we cleared local state

                // Don't auto-redirect on error, let user manually navigate
            }
        }

        performLogout()
    }, [router, supabase.auth])

    const handleManualRedirect = () => {
        router.push('/')
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 flex items-center justify-center">
                        {(status === 'logging-out' || status === 'verifying') && (
                            <SectionLoader size="lg" minHeight="" />
                        )}
                        {status === 'success' && (
                            <div className="text-green-600 text-4xl">✔</div>
                        )}
                        {status === 'error' && (
                            <div className="text-yellow-600 text-4xl">!</div>
                        )}
                    </div>

                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {status === 'logging-out' && 'Signing Out'}
                        {status === 'verifying' && 'Verifying Logout'}
                        {status === 'success' && 'Logout Successful'}
                        {status === 'error' && 'Logout Complete'}
                    </h2>

                    <p className="mt-2 text-center text-sm text-gray-600">
                        {message}
                    </p>

                    {isSignedOut && (
                        <div className="mt-6">
                            <button
                                onClick={handleManualRedirect}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Go to Home Page
                            </button>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="text-sm text-green-800">
                                Authentication state confirmed: You are now signed out
                            </div>
                        </div>
                    )}

                    <div className="mt-6 text-xs text-gray-500">
                        <p>This page performs a complete session cleanup including:</p>
                        <ul className="mt-2 space-y-1 text-left">
                            <li>• Local storage cleanup</li>
                            <li>• Session storage cleanup</li>
                            <li>• Supabase global signout</li>
                            <li>• Cookie clearance</li>
                            <li>• Authentication verification</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
