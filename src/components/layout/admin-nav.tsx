'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'
import LogoutButton from '@/components/auth/logout-button'
import { 
    HiUser, 
    HiChatBubbleLeftRight, 
    HiArrowRightOnRectangle, 
    HiChevronDown, 
    HiBars3, 
    HiXMark,
    HiMagnifyingGlass
} from 'react-icons/hi2'
import type { User } from '@supabase/supabase-js'

interface AdminNavProps {
    className?: string
}

interface BreadcrumbItem {
    label: string
    href?: string
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    breadcrumbs.push({ label: 'Home', href: '/' })
    let currentPath = ''
    segments.forEach((segment, index) => {
        currentPath += `/${segment}`
        let label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        if (segment === 'admin') label = 'Admin'
        if (segment === 'organizer') label = 'Organizer'
        if (segment === 'events') label = 'Events'
        if (segment === 'bookings') label = 'Bookings'
        if (segment === 'users') label = 'Users'
        if (segment === 'custom-fields') label = 'Custom Fields'
        if (segment === 'html-to-markdown') label = 'HTML to Markdown'
        if (segment === 'mailing-list') label = 'Mailing List'
        if (segment === 'messages') label = 'Messages'
        if (segment === 'pricing') label = 'Pricing'
        if (segment === 'payment-events') label = 'Payment Events'
        if (index === segments.length - 1) {
            breadcrumbs.push({ label })
        } else {
            breadcrumbs.push({ label, href: currentPath })
        }
    })
    return breadcrumbs
}

export function AdminBreadcrumbs() {
    const pathname = usePathname()
    const breadcrumbs = getBreadcrumbs(pathname)
    return (
        <nav className="flex items-center space-x-2 text-sm mb-6" aria-label="Breadcrumb">
            {breadcrumbs.map((breadcrumb, index) => (
                <div key={index} className="flex items-center">
                    {index > 0 && (
                        <svg className="h-4 w-4 text-gray-400 dark:text-gray-500 mx-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                    {breadcrumb.href ? (
                        <Link
                            href={breadcrumb.href}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            {breadcrumb.label}
                        </Link>
                    ) : (
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                            {breadcrumb.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}

export default function AdminNav({ className = '' }: AdminNavProps) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const pathname = usePathname()
    const supabase = createClient()
    const mobileMenuRef = useRef<HTMLDivElement>(null)
    const profileDropdownRef = useRef<HTMLDivElement>(null)

    const getNavLinkClasses = (path: string, isDesktop = true) => {
        const baseClasses = isDesktop
            ? "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            : "block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        
        return isActivePath(path)
            ? isDesktop
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-md text-sm font-medium"
                : "block w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default"
            : baseClasses
    }

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (user) {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()
                    setProfile(profileData)
                }
            } catch (error) {
                console.error('Error fetching user:', error)
            }
        }

        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange( (event, session) => {
            setTimeout(async () => {
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
            }, 0)
        })
    
        return () => subscription.unsubscribe()
    }, [supabase])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false)
            }
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false)
            }
            // Close search on outside click
            const target = event.target as HTMLElement
            if (searchOpen && !target.closest('#admin-search-overlay')) {
                setSearchOpen(false)
            }
        }

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false)
                setProfileDropdownOpen(false)
                setSearchOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscapeKey)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscapeKey)
        }
    }, [searchOpen])

    const handleNavigate = (href: string) => {
        window.location.href = href
        setProfileDropdownOpen(false)
    }

    const handleSearch = () => {
        const q = searchValue.trim()
        if (!q) return
        // Accept either short booking_id or UUID; navigate organizer booking details if found by id
        // Prefer short booking code as bookingId; otherwise assume UUID
        const isUuid = q.length === 36 && q.includes('-')
        if (isUuid) {
            // Organizer booking details requires event id + bookingId; we only have booking id, so send admin API first? Simplify: try admin page pattern later.
            window.location.href = `/admin/bookings?id=${encodeURIComponent(q)}`
        } else {
            // Short booking id; admin flow can resolve, use admin list with filter via query param
            window.location.href = `/admin/bookings?booking_id=${encodeURIComponent(q.toUpperCase())}`
        }
        setSearchOpen(false)
        setSearchValue('')
    }

    const isActivePath = (path: string) => {
        if (path === '/') {
            return pathname === '/'
        }
        return pathname.startsWith(path)
    }

    // Role-based quick menu
    const isOrganizer = profile?.role === 'organizer' || profile?.role === 'admin'
    const isAdmin = profile?.role === 'admin'

    return (
        <nav className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="max-w-7xl mx-auto px-2 py-2 md:px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-12 md:h-16">
                    {/* Logo and site title */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center mr-8">
                            <Image
                                src="/chess-logo.svg"
                                alt="HBCC Logo"
                                width={32}
                                height={32}
                                className="h-8 w-8 mr-3"
                                priority
                            />
                            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                Hobsons Bay Chess Club
                            </h1>
                        </Link>
                    </div>

                    {/* Quick action menu (role-based) */}
                    <div className="hidden md:flex md:items-center md:space-x-4">
                        
                        {isOrganizer && (
                            <>
                                <Link href="/organizer" className={getNavLinkClasses('/organizer', true)}>
                                    Manage Events
                                </Link>
                                <Link href="/organizer/mailing-list" className={getNavLinkClasses('/organizer/mailing-list', true)}>
                                    Mailing List
                                </Link>
                            </>
                        )}
                        {isAdmin && (
                            <>
                                <Link href="/admin/bookings" className={getNavLinkClasses('/admin/bookings', true)}>
                                    Bookings
                                </Link>
                                <Link href="/admin/users" className={getNavLinkClasses('/admin/users', true)}>
                                    Users
                                </Link>
                            </>
                        )}
                        {/* User dropdown menu only (no horizontal admin/organizer links) */}
                        {user && (
                            <div className="relative ml-3 flex items-center" ref={profileDropdownRef}>
                                {/* Search button placed next to profile avatar */}
                                <button
                                    type="button"
                                    className="mr-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Search booking by ID"
                                    onClick={() => setSearchOpen(true)}
                                >
                                    <HiMagnifyingGlass className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                                </button>
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <span className="sr-only">Open user menu</span>
                                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                        <span className="text-sm font-medium text-white">
                                            {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                    <HiChevronDown className="ml-1 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                </button>

                                {profileDropdownOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                        <div className="py-1">
                                            <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                                                <div className="font-medium">{profile?.full_name || 'User'}</div>
                                                <div className="text-gray-500 dark:text-gray-400">{user.email}</div>
                                            </div>
                                            {isActivePath('/profile') ? (
                                                <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default">
                                                    <span className="flex items-center">
                                                        <HiUser className="w-4 h-4 mr-2" />
                                                        Profile Settings
                                                    </span>
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleNavigate('/profile')}
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <span className="flex items-center">
                                                        <HiUser className="w-4 h-4 mr-2" />
                                                        Profile Settings
                                                    </span>
                                                </button>
                                            )}
                                            {(profile?.role === 'organizer' || profile?.role === 'admin') && (
                                                <>
                                                    {isActivePath('/organizer/messages') ? (
                                                        <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default">
                                                        <span className="flex items-center">
                                                            <HiChatBubbleLeftRight className="w-4 h-4 mr-2" />
                                                            Messages
                                                        </span>
                                                    </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleNavigate('/organizer/messages')}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <span className="flex items-center">
                                                                <HiChatBubbleLeftRight className="w-4 h-4 mr-2" />
                                                                Messages
                                                            </span>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                            <div className="px-4 py-2">
                                                <LogoutButton className="w-full text-left text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors">
                                                    <span className="flex items-center">
                                                        <HiArrowRightOnRectangle className="w-4 h-4 mr-2" />
                                                        Sign out
                                                    </span>
                                                </LogoutButton>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            aria-expanded={mobileMenuOpen}
                        >
                            <span className="sr-only">Open main menu</span>
                            {/* Hamburger icon */}
                            <HiBars3 className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`} />
                            {/* Close icon */}
                            <HiXMark className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Search overlay */}
            {searchOpen && (
                <div id="admin-search-overlay" className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-auto px-4">
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Enter booking ID (short code or UUID)"
                                    value={searchValue}
                                    onChange={e => setSearchValue(e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                                >
                                    Search
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSearchOpen(false)}
                                    className="px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Tip: You can paste either the 7-char booking code or the full UUID.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-x-0 top-0 z-50 md:hidden" ref={mobileMenuRef}>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black bg-opacity-25" aria-hidden="true"></div>

                    {/* Menu panel */}
                    <div className="relative bg-white dark:bg-gray-800 shadow-lg">
                        {/* Header with logo and close button */}
                        <div className="flex justify-between items-center px-2 py-2 md:px-4 md:py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center">
                                <Image
                                    src="/chess-logo.svg"
                                    alt="HBCC Logo"
                                    className="h-8 w-8 mr-3"
                                    width={32}
                                    height={32}
                                />
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Hobsons Bay Chess Club</h1>
                            </div>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <span className="sr-only">Close menu</span>
                                <HiXMark className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Menu items */}
                        <div className="px-2 py-2 md:px-4 md:py-4 space-y-1 max-h-screen overflow-y-auto">
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
                                            <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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

                                            {isActivePath('/organizer/messages') ? (
                                                <span className={getNavLinkClasses('/organizer/messages', false)}>
                                                    Messages
                                                </span>
                                            ) : (
                                                <Link
                                                    href="/organizer/messages"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={getNavLinkClasses('/organizer/messages', false)}
                                                >
                                                    Messages
                                                </Link>
                                            )}
                                        </>
                                    )}

                                    <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                                    <LogoutButton className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors">
                                        Sign out
                                    </LogoutButton>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
