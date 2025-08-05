'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import LogoutButton from '@/components/auth/logout-button'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types/database'
import Image from 'next/image'

interface AdminNavProps {
    className?: string
}

interface BreadcrumbItem {
    label: string
    href?: string
}

export default function AdminNav({ className = '' }: AdminNavProps) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const mobileMenuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    // Generate breadcrumbs based on current path
    const getBreadcrumbs = (): BreadcrumbItem[] => {
        const segments = pathname.split('/').filter(Boolean)
        const breadcrumbs: BreadcrumbItem[] = [
            { label: 'Events', href: '/' }
        ]

        if (segments[0] === 'admin') {
            breadcrumbs.push({ label: 'Administration' })

            if (segments[1] === 'users') {
                breadcrumbs.push({ label: 'Manage Users' })
            } else if (segments[1] === 'bookings') {
                breadcrumbs.push({ label: 'Manage Bookings', href: '/admin/bookings' })
                if (segments[2] && segments[3] === 'payment-events') {
                    breadcrumbs.push({ label: 'Payment Events' })
                } else if (segments[2]) {
                    breadcrumbs.push({ label: 'Booking Details' })
                }
            } else if (segments[1] === 'cms') {
                breadcrumbs.push({ label: 'Content Management', href: '/admin/cms' })
                if (segments[2] === 'new') {
                    breadcrumbs.push({ label: 'Create Content' })
                } else if (segments[2] && segments[3] === 'edit') {
                    breadcrumbs.push({ label: 'Edit Content' })
                } else if (segments[2] && segments[3] === 'history') {
                    breadcrumbs.push({ label: 'Version History' })
                } else if (segments[2]) {
                    breadcrumbs.push({ label: 'View Content' })
                }
            } else if (segments[1] === 'create-test-data') {
                breadcrumbs.push({ label: 'Create Test Data' })
            } else if (segments[1] === 'email-test') {
                breadcrumbs.push({ label: 'Email Test' })
            } else if (segments[1] === 'test-password-reset') {
                breadcrumbs.push({ label: 'Test Password Reset' })
            }
        } else if (segments[0] === 'organizer') {
            breadcrumbs.push({ label: 'Management' })

            if (segments[1] === 'events') {
                breadcrumbs.push({ label: 'Events', href: '/organizer' })

                if (segments[2] === 'new') {
                    breadcrumbs.push({ label: 'Create Event' })
                } else if (segments[2] && segments[3] === 'edit') {
                    breadcrumbs.push({ label: 'Edit Event' })
                } else if (segments[2] && segments[3] === 'bookings') {
                    breadcrumbs.push({ label: 'Bookings' })
                } else if (segments[2] && segments[3] === 'participants') {
                    breadcrumbs.push({ label: 'Participants' })
                } else if (segments[2] && segments[3] === 'pricing') {
                    breadcrumbs.push({ label: 'Pricing' })
                }
            } else if (segments[1] === 'custom-fields') {
                breadcrumbs.push({ label: 'Custom Fields' })
            } else if (segments[1] === 'html-to-markdown') {
                breadcrumbs.push({ label: 'HTML to Markdown' })
            } else if (segments[1] === 'mailing-list') {
                breadcrumbs.push({ label: 'Mailing List' })
            } else if (segments.length === 1) {
                breadcrumbs.push({ label: 'Manage Events' })
            }
        }

        return breadcrumbs
    }

    // Helper function to check if a path is active
    const isActivePath = (path: string) => {
        if (path === '/') {
            return pathname === '/' || pathname === '/events' || pathname.startsWith('/e/')
        }
        return pathname === path || pathname.startsWith(path + '/')
    }

    // Helper function to get nav link classes
    const getNavLinkClasses = (path: string, isDesktop = true) => {
        const isActive = isActivePath(path)
        const baseClasses = isDesktop
            ? "px-3 py-2 rounded-md text-sm font-medium transition-colors relative"
            : "block px-3 py-3 rounded-md text-base font-medium transition-colors relative"

        if (isActive) {
            return `${baseClasses} text-indigo-600 cursor-default after:content-[''] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-indigo-600`
        }

        return `${baseClasses} text-gray-700 hover:text-gray-900 ${isDesktop ? 'hover:bg-gray-50' : 'hover:bg-gray-50'}`
    }

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                if (userError) {
                    console.error('Error getting user:', userError)
                }

                setUser(user)

                if (user) {
                    // Fetch user profile to get role information
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()

                    if (profileError) {
                        console.error('Error getting profile:', profileError)
                    }

                    setProfile(profileData as import('@/lib/types/database').Profile)
                }
            } catch (error) {
                console.error('Error in getUser:', error)
            } finally {
                setLoading(false)
            }
        }

        getUser()

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null)

            if (session?.user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()

                setProfile(profileData)
            } else {
                setProfile(null)
            }

            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase])

    // Close dropdown when clicking outside or pressing escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Handle profile dropdown
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false)
            }

            // Handle mobile menu - close if clicking on backdrop
            if (mobileMenuOpen && mobileMenuRef.current) {
                const backdrop = event.target as HTMLElement
                if (backdrop.classList.contains('bg-black') && backdrop.classList.contains('bg-opacity-25')) {
                    setMobileMenuOpen(false)
                }
            }
        }

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false)
                setProfileDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscapeKey)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscapeKey)
        }
    }, [mobileMenuOpen])

    const handleNavigate = (href: string) => {
        setProfileDropdownOpen(false)
        setMobileMenuOpen(false)
        router.push(href)
    }

    const breadcrumbs = getBreadcrumbs()

    if (loading) {
        return (
            <header className={`bg-white shadow ${className}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                                <Image
                                    src="/chess-logo.svg"
                                    alt="HBCC Logo"
                                    className="h-8 w-8 mr-3"
                                    width={32}
                                    height={32}
                                    priority
                                />
                                <h1 className="text-2xl font-bold text-gray-900">Hobsons Bay Chess Club</h1>
                            </Link>
                        </div>
                        <nav className="flex items-center space-x-4">
                            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                        </nav>
                    </div>
                </div>
            </header>
        )
    }

    return (
        <>
            <header className={`bg-white shadow ${className}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                                <Image
                                    src="/chess-logo.svg"
                                    width={32}
                                    height={32}
                                    alt="HBCC Logo"
                                    className="h-8 w-8 mr-3"
                                />
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hobsons Bay Chess Club</h1>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center space-x-4">
                            {user && (
                                <>
                                    {isActivePath('/dashboard') ? (
                                        <span className={getNavLinkClasses('/dashboard', true)}>
                                            Dashboard
                                        </span>
                                    ) : (
                                        <Link
                                            href="/dashboard"
                                            className={getNavLinkClasses('/dashboard', true)}
                                        >
                                            Dashboard
                                        </Link>
                                    )}

                                    {/* Admin/Organizer Quick Links */}
                                    {(profile?.role === 'admin' || profile?.role === 'organizer') && (
                                        <>
                                            <div className="h-6 w-px bg-gray-300 mx-2"></div>

                                            {isActivePath('/organizer') ? (
                                                <span className={getNavLinkClasses('/organizer', true)}>
                                                    Manage Events
                                                </span>
                                            ) : (
                                                <Link
                                                    href="/organizer"
                                                    className={getNavLinkClasses('/organizer', true)}
                                                >
                                                    Manage Events
                                                </Link>
                                            )}

                                            {isActivePath('/organizer/mailing-list') ? (
                                                <span className={getNavLinkClasses('/organizer/mailing-list', true)}>
                                                    Mailing List
                                                </span>
                                            ) : (
                                                <Link
                                                    href="/organizer/mailing-list"
                                                    className={getNavLinkClasses('/organizer/mailing-list', true)}
                                                >
                                                    Mailing List
                                                </Link>
                                            )}

                                            {profile?.role === 'admin' && (
                                                <>
                                                    {isActivePath('/admin/users') ? (
                                                        <span className={getNavLinkClasses('/admin/users', true)}>
                                                            Users
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            href="/admin/users"
                                                            className={getNavLinkClasses('/admin/users', true)}
                                                        >
                                                            Users
                                                        </Link>
                                                    )}

                                                    {isActivePath('/admin/bookings') ? (
                                                        <span className={getNavLinkClasses('/admin/bookings', true)}>
                                                            Bookings
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            href="/admin/bookings"
                                                            className={getNavLinkClasses('/admin/bookings', true)}
                                                        >
                                                            Bookings
                                                        </Link>
                                                    )}

                                                    {isActivePath('/admin/cms') ? (
                                                        <span className={getNavLinkClasses('/admin/cms', true)}>
                                                            Content
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            href="/admin/cms"
                                                            className={getNavLinkClasses('/admin/cms', true)}
                                                        >
                                                            Content
                                                        </Link>
                                                    )}
                                                </>
                                            )}

                                            {/* Customer Support Links */}
                                            {(profile?.role as unknown as string) === 'customer_support' && (
                                                <>
                                                    {isActivePath('/admin/bookings') ? (
                                                        <span className={getNavLinkClasses('/admin/bookings', true)}>
                                                            Bookings
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            href="/admin/bookings"
                                                            className={getNavLinkClasses('/admin/bookings', true)}
                                                        >
                                                            Bookings
                                                        </Link>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* Profile Dropdown */}
                                    <div className="relative" ref={dropdownRef}>
                                        <button
                                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                            className="flex items-center text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                        >
                                            <span>{profile?.full_name || user?.email || 'Profile'}</span>
                                            <svg
                                                className={`ml-1 w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {profileDropdownOpen && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                                {isActivePath('/profile') ? (
                                                    <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 bg-indigo-50 cursor-default">
                                                        <span className="flex items-center">
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            Profile Settings
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleNavigate('/profile')}
                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <span className="flex items-center">
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            Profile Settings
                                                        </span>
                                                    </button>
                                                )}

                                                {/* Messages Link for Organizers */}
                                                {(profile?.role === 'organizer' || profile?.role === 'admin') && (
                                                    <>
                                                        {isActivePath('/organizer/messages') ? (
                                                            <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 bg-indigo-50 cursor-default">
                                                                <span className="flex items-center">
                                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                                    </svg>
                                                                    Messages
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleNavigate('/organizer/messages')}
                                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                            >
                                                                <span className="flex items-center">
                                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                                    </svg>
                                                                    Messages
                                                                </span>
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                <div className="border-t border-gray-100 my-1"></div>
                                                <div className="px-4 py-2">
                                                    <LogoutButton className="w-full text-left text-sm text-red-600 hover:text-red-800 transition-colors">
                                                        <span className="flex items-center">
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                            </svg>
                                                            Sign out
                                                        </span>
                                                    </LogoutButton>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </nav>

                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                                aria-expanded={mobileMenuOpen}
                            >
                                <span className="sr-only">Open main menu</span>
                                {/* Hamburger icon */}
                                <svg
                                    className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                {/* Close icon */}
                                <svg
                                    className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="fixed inset-x-0 top-0 z-50 md:hidden" ref={mobileMenuRef}>
                        {/* Backdrop */}
                        <div className="fixed inset-0 bg-black bg-opacity-25" aria-hidden="true"></div>

                        {/* Menu panel */}
                        <div className="relative bg-white shadow-lg">
                            {/* Header with logo and close button */}
                            <div className="flex justify-between items-center px-4 py-4 border-b border-gray-200">
                                <div className="flex items-center">
                                    <Image
                                        src="/chess-logo.svg"
                                        alt="HBCC Logo"
                                        className="h-8 w-8 mr-3"
                                        width={32}
                                        height={32}
                                    />
                                    <h1 className="text-xl font-bold text-gray-900">Hobsons Bay Chess Club</h1>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                                >
                                    <span className="sr-only">Close menu</span>
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Menu items */}
                            <div className="px-4 py-4 space-y-1 max-h-screen overflow-y-auto">
                                {isActivePath('/') ? (
                                    <span className={getNavLinkClasses('/', false)}>
                                        Events
                                    </span>
                                ) : (
                                    <Link
                                        href="/"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={getNavLinkClasses('/', false)}
                                    >
                                        Events
                                    </Link>
                                )}

                                {user && (
                                    <>
                                        {isActivePath('/dashboard') ? (
                                            <span className={getNavLinkClasses('/dashboard', false)}>
                                                Dashboard
                                            </span>
                                        ) : (
                                            <Link
                                                href="/dashboard"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={getNavLinkClasses('/dashboard', false)}
                                            >
                                                Dashboard
                                            </Link>
                                        )}

                                        {/* Admin/Organizer Menu Items */}
                                        {(profile?.role === 'admin' || profile?.role === 'organizer') && (
                                            <>
                                                <div className="border-t border-gray-200 my-3"></div>
                                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                    Management
                                                </div>

                                                {isActivePath('/organizer') ? (
                                                    <span className={getNavLinkClasses('/organizer', false)}>
                                                        Manage Events
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href="/organizer"
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={getNavLinkClasses('/organizer', false)}
                                                    >
                                                        Manage Events
                                                    </Link>
                                                )}

                                                {isActivePath('/organizer/mailing-list') ? (
                                                    <span className={getNavLinkClasses('/organizer/mailing-list', false)}>
                                                        Mailing List
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href="/organizer/mailing-list"
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={getNavLinkClasses('/organizer/mailing-list', false)}
                                                    >
                                                        Mailing List
                                                    </Link>
                                                )}

                                                {isActivePath('/organizer/custom-fields') ? (
                                                    <span className={getNavLinkClasses('/organizer/custom-fields', false)}>
                                                        Custom Fields
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href="/organizer/custom-fields"
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={getNavLinkClasses('/organizer/custom-fields', false)}
                                                    >
                                                        Custom Fields
                                                    </Link>
                                                )}

                                                {profile?.role === 'admin' && (
                                                    <>
                                                        {isActivePath('/admin/bookings') ? (
                                                            <span className={getNavLinkClasses('/admin/bookings', false)}>
                                                                Manage Bookings
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                href="/admin/bookings"
                                                                onClick={() => setMobileMenuOpen(false)}
                                                                className={getNavLinkClasses('/admin/bookings', false)}
                                                            >
                                                                Manage Bookings
                                                            </Link>
                                                        )}

                                                        {isActivePath('/admin/users') ? (
                                                            <span className={getNavLinkClasses('/admin/users', false)}>
                                                                Manage Users
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                href="/admin/users"
                                                                onClick={() => setMobileMenuOpen(false)}
                                                                className={getNavLinkClasses('/admin/users', false)}
                                                            >
                                                                Manage Users
                                                            </Link>
                                                        )}

                                                        {isActivePath('/admin/cms') ? (
                                                            <span className={getNavLinkClasses('/admin/cms', false)}>
                                                                Content Management
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                href="/admin/cms"
                                                                onClick={() => setMobileMenuOpen(false)}
                                                                className={getNavLinkClasses('/admin/cms', false)}
                                                            >
                                                                Content Management
                                                            </Link>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {isActivePath('/profile') ? (
                                            <span className={getNavLinkClasses('/profile', false)}>
                                                Profile Settings
                                            </span>
                                        ) : (
                                            <Link
                                                href="/profile"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={getNavLinkClasses('/profile', false)}
                                            >
                                                Profile Settings
                                            </Link>
                                        )}

                                        <div className="border-t border-gray-200 my-3"></div>
                                        <div className="px-3 py-2">
                                            <LogoutButton className="block w-full text-left text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-3 rounded-md text-base font-medium transition-colors">
                                                Sign out
                                            </LogoutButton>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 1 && (
                <nav className="bg-gray-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center space-x-4 py-3">
                            {breadcrumbs.map((item, index) => (
                                <div key={index} className="flex items-center">
                                    {index > 0 && (
                                        <svg
                                            className="h-4 w-4 text-gray-400 mx-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    )}
                                    {item.href && index < breadcrumbs.length - 1 ? (
                                        <Link
                                            href={item.href}
                                            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            {item.label}
                                        </Link>
                                    ) : (
                                        <span className={`text-sm font-medium ${index === breadcrumbs.length - 1
                                            ? 'text-gray-900'
                                            : 'text-gray-500'
                                            }`}>
                                            {item.label}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </nav>
            )}
        </>
    )
}
