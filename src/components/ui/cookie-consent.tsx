'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CookieConsentProps {
    onAccept?: () => void
    onDecline?: () => void
}

export default function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem('hbcc-cookie-consent')
        if (!consent) {
            // Show banner after a short delay for better UX
            const timer = setTimeout(() => {
                setIsVisible(true)
                setIsAnimating(true)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem('hbcc-cookie-consent', 'accepted')
        localStorage.setItem('hbcc-cookie-consent-date', new Date().toISOString())
        setIsAnimating(false)
        setTimeout(() => {
            setIsVisible(false)
            onAccept?.()
        }, 300)
    }

    const handleDecline = () => {
        localStorage.setItem('hbcc-cookie-consent', 'declined')
        localStorage.setItem('hbcc-cookie-consent-date', new Date().toISOString())
        setIsAnimating(false)
        setTimeout(() => {
            setIsVisible(false)
            onDecline?.()
            // Redirect to exit page
            router.push('/cookie-exit')
        }, 300)
    }

    const handleLearnMore = () => {
        window.open('/privacy-policy#cookies', '_blank')
    }

    if (!isVisible) return null

    return (
        <>
            {/* Backdrop */}
            <div className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'
                }`} />

            {/* Cookie Consent Banner */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'
                }`}>
                <div className="bg-white dark:bg-gray-800 border-t-4 border-indigo-600 shadow-2xl">
                    <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">🍪</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                            We Value Your Privacy
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                                            Hobsons Bay Chess Club uses essential cookies to provide our booking services,
                                            maintain your login session, and ensure website security. These cookies are
                                            necessary for the platform to function properly and cannot be disabled.
                                        </p>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                            <p><strong>Essential Cookies:</strong> Authentication, session management, security</p>
                                            <p><strong>Data Retention:</strong> Session cookies expire when you close your browser</p>
                                            <p><strong>No Tracking:</strong> We don&apos;t use advertising or analytics cookies</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0 lg:ml-6">
                                <button
                                    onClick={handleLearnMore}
                                    className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors duration-200 border border-indigo-200 dark:border-indigo-700"
                                >
                                    Learn More
                                </button>
                                <button
                                    onClick={handleDecline}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 border border-gray-300 dark:border-gray-600"
                                >
                                    Decline & Exit
                                </button>
                                <button
                                    onClick={handleAccept}
                                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-sm"
                                >
                                    Accept & Continue
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                By continuing to use our website, you acknowledge that you understand and agree to our
                                <span className="mx-1">
                                    <button
                                        onClick={handleLearnMore}
                                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                                    >
                                        Privacy Policy
                                    </button>
                                </span>
                                and the use of essential cookies for website functionality.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

// Hook to check cookie consent status
export function useCookieConsent() {
    const [hasConsent, setHasConsent] = useState<boolean | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const consent = localStorage.getItem('hbcc-cookie-consent')
        setHasConsent(consent === 'accepted')
        setIsLoading(false)
    }, [])

    return { hasConsent, isLoading }
}
