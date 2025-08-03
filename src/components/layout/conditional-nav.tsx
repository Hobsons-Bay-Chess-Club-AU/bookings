'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import NavWrapper from './nav-wrapper'
import Footer from './footer'

interface ConditionalLayoutProps {
    children: ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
    const pathname = usePathname()

    // Don't show navigation and footer on admin, auth, or other special pages
    const hideLayoutRoutes = [
        '/admin',
        '/organizer',
        '/auth',
        '/api',
        '/unauthorized',
        '/privacy-policy'
    ]

    // Check if current path starts with any of the hide routes
    const shouldHideLayout = hideLayoutRoutes.some(route => pathname.startsWith(route))

    if (shouldHideLayout) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen flex flex-col">
            <NavWrapper />
            <main className="flex-grow">
                {children}
            </main>
            <Footer />
        </div>
    )
}
