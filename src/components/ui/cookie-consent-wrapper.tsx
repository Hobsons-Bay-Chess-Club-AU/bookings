'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import CookieConsent from './cookie-consent'

interface CookieConsentWrapperProps {
    children: React.ReactNode
}

export default function CookieConsentWrapper({ children }: CookieConsentWrapperProps) {
    const [showConsent, setShowConsent] = useState(false)
    const [isClient, setIsClient] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setIsClient(true)

        // Don't show consent banner on privacy policy or cookie exit pages
        const excludedPaths = ['/privacy-policy', '/cookie-exit']
        const isExcludedPath = excludedPaths.some(path => pathname.startsWith(path))

        if (isExcludedPath) {
            return
        }

        // Check if user has already made a choice
        const consent = localStorage.getItem('hbcc-cookie-consent')

        if (!consent) {
            setShowConsent(true)
        }
    }, [pathname])

    const handleAccept = () => {
        setShowConsent(false)
    }

    const handleDecline = () => {
        setShowConsent(false)
        // The redirect is handled in the CookieConsent component
    }

    // Don't render anything on server to avoid hydration mismatch
    if (!isClient) {
        return <>{children}</>
    }

    return (
        <>
            {children}
            {showConsent && (
                <CookieConsent
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                />
            )}
        </>
    )
}
