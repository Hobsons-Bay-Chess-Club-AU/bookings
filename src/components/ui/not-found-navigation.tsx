'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Profile } from '@/lib/types/database'

interface NotFoundNavigationProps {
    profile: Profile | null
}

export default function NotFoundNavigation({ profile }: NotFoundNavigationProps) {
    const pathname = usePathname()

    // Determine the appropriate navigation based on role and path
    const getNavigationInfo = () => {
        if (!profile) {
            return {
                title: 'Go Home',
                href: '/',
                description: 'Return to the main page'
            }
        }

        // If user is on admin or organizer path, provide role-specific navigation
        if (pathname.startsWith('/admin')) {
            if (profile.role === 'admin') {
                return {
                    title: 'Go to Admin Dashboard',
                    href: '/admin',
                    description: 'Return to admin dashboard'
                }
            } else if (profile.role === 'organizer') {
                return {
                    title: 'Go to Organizer Dashboard',
                    href: '/organizer',
                    description: 'Return to organizer dashboard'
                }
            } else {
                return {
                    title: 'Go Home',
                    href: '/',
                    description: 'Return to the main page'
                }
            }
        }

        if (pathname.startsWith('/organizer')) {
            if (profile.role === 'organizer' || profile.role === 'admin') {
                return {
                    title: 'Go to Organizer Dashboard',
                    href: '/organizer',
                    description: 'Return to organizer dashboard'
                }
            } else {
                return {
                    title: 'Go Home',
                    href: '/',
                    description: 'Return to the main page'
                }
            }
        }

        // Default navigation
        if (profile.role === 'admin') {
            return {
                title: 'Go to Admin Dashboard',
                href: '/admin',
                description: 'Return to admin dashboard'
            }
        } else if (profile.role === 'organizer') {
            return {
                title: 'Go to Organizer Dashboard',
                href: '/organizer',
                description: 'Return to organizer dashboard'
            }
        } else {
            return {
                title: 'Go Home',
                href: '/',
                description: 'Return to the main page'
            }
        }
    }

    const navigation = getNavigationInfo()

    return (
        <div className="space-y-4">
            <Link
                href={navigation.href}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
                <svg 
                    className="w-5 h-5 mr-2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                    />
                </svg>
                {navigation.title}
            </Link>

            <div className="text-sm text-gray-500 dark:text-gray-400">
                {navigation.description}
            </div>
        </div>
    )
} 