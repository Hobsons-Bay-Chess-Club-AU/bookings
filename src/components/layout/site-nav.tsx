'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'
import LogoutButton from '@/components/auth/logout-button'
import { 
    HiUser, 
    HiCalendarDays, 
    HiDocumentText, 
    HiCodeBracket, 
    HiUsers, 
    HiArrowRightOnRectangle, 
    HiBars3, 
    HiXMark, 
    HiMagnifyingGlass,
    HiHome
} from 'react-icons/hi2'
import type { User } from '@supabase/supabase-js'

interface SiteNavProps {
    className?: string
    showTitle?: boolean
}

export default function SiteNav({ className = '', showTitle = true }: SiteNavProps) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const [searchAnimating, setSearchAnimating] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const mobileMenuRef = useRef<HTMLDivElement>(null)
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
    const userMenuRef = useRef<HTMLDivElement>(null)
    const userMenuButtonRef = useRef<HTMLButtonElement>(null)
    const searchFormRef = useRef<HTMLFormElement>(null)

    const isActivePath = (path: string) => {
        if (path === '/') {
            return pathname === '/'
        }
        return pathname.startsWith(path)
    }

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

    const handleSearchOpen = () => {
        setSearchOpen(true)
        setSearchAnimating(true)
    }
    const handleSearchClose = () => {
        setSearchAnimating(false)
        setTimeout(() => setSearchOpen(false), 200)
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
                mobileMenuButtonRef.current && !mobileMenuButtonRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false)
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node) &&
                userMenuButtonRef.current && !userMenuButtonRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false)
            }
        }

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false)
                setUserMenuOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscapeKey)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscapeKey)
        }
    }, [])

    useEffect(() => {
        if (!searchOpen) return
        function handleClickOutside(event: MouseEvent) {
            if (searchFormRef.current && !searchFormRef.current.contains(event.target as Node)) {
                handleSearchClose()
            }
        }
        function handleEscapeKey(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                handleSearchClose()
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
        setUserMenuOpen(false)
    }

    return (
        <nav className={`bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and title */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/chess-logo.svg"
                                alt="HBCC Logo"
                                width={32}
                                height={32}
                                className="h-8 w-8 mr-3"
                                priority
                            />
                            {showTitle && (
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    Hobsons Bay Chess Club
                                </h1>
                            )}
                        </Link>
                    </div>

                    {/* Desktop navigation */}
                    <div className="hidden md:flex md:items-center md:space-x-4">
                        <nav className="flex space-x-4">
                            {isActivePath('/') ? (
                                <span className={getNavLinkClasses('/', true)}>
                                    Events
                                </span>
                            ) : (
                                <Link
                                    href="/"
                                    className={getNavLinkClasses('/', true)}
                                >
                                    Events
                                </Link>
                            )}
                            <Link
                                href="/past"
                                className={getNavLinkClasses('/past', true)}
                            >
                                Past Events
                            </Link>
                            {pathname !== '/search' && (
                                <button
                                    type="button"
                                    className="ml-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Search events"
                                    onClick={handleSearchOpen}
                                >
                                    <HiMagnifyingGlass className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                                </button>
                            )}
                        </nav>

                        {/* User menu */}
                        {user ? (
                            <div className="relative ml-3">
                                <button
                                    ref={userMenuButtonRef}
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <span className="sr-only">Open user menu</span>
                                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                                        <span className="text-sm font-medium text-white">
                                            {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                </button>

                                {userMenuOpen && (
                                    <div
                                        ref={userMenuRef}
                                        className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                                    >
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

                                            {/* Dashboard for all logged-in users */}
                                            {isActivePath('/dashboard') ? (
                                                <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default">
                                                    <span className="flex items-center">
                                                        <HiHome className="w-4 h-4 mr-2" />
                                                        Dashboard
                                                    </span>
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleNavigate('/dashboard')}
                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <span className="flex items-center">
                                                        <HiHome className="w-4 h-4 mr-2" />
                                                        Dashboard
                                                    </span>
                                                </button>
                                            )}

                                            {/* Admin/Organizer Menu Items */}
                                            {(profile?.role === 'admin' || profile?.role === 'organizer') && (
                                                <>
                                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                        Management
                                                    </div>

                                                    {isActivePath('/organizer') ? (
                                                        <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default">
                                                            <span className="flex items-center">
                                                                <HiCalendarDays className="w-4 h-4 mr-2" />
                                                                Manage Events
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleNavigate('/organizer')}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <span className="flex items-center">
                                                                <HiCalendarDays className="w-4 h-4 mr-2" />
                                                                Manage Events
                                                            </span>
                                                        </button>
                                                    )}

                                                    {isActivePath('/organizer/custom-fields') ? (
                                                        <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default">
                                                            <span className="flex items-center">
                                                                <HiDocumentText className="w-4 h-4 mr-2" />
                                                                Custom Fields
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleNavigate('/organizer/custom-fields')}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <span className="flex items-center">
                                                                <HiDocumentText className="w-4 h-4 mr-2" />
                                                                Custom Fields
                                                            </span>
                                                        </button>
                                                    )}

                                                    {isActivePath('/organizer/html-to-markdown') ? (
                                                        <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default">
                                                            <span className="flex items-center">
                                                                <HiCodeBracket className="w-4 h-4 mr-2" />
                                                                HTML to Markdown
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleNavigate('/organizer/html-to-markdown')}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <span className="flex items-center">
                                                                <HiCodeBracket className="w-4 h-4 mr-2" />
                                                                HTML to Markdown
                                                            </span>
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            {/* Admin Only Menu Items */}
                                            {profile?.role === 'admin' && (
                                                <>
                                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                        Administration
                                                    </div>

                                                    {isActivePath('/admin/users') ? (
                                                        <span className="block w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 cursor-default">
                                                            <span className="flex items-center">
                                                                <HiUsers className="w-4 h-4 mr-2" />
                                                                Manage Users
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleNavigate('/admin/users')}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            <span className="flex items-center">
                                                                <HiUsers className="w-4 h-4 mr-2" />
                                                                Manage Users
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
                        ) : (
                            <>
                                {isActivePath('/auth/login') ? (
                                    <span className={getNavLinkClasses('/auth/login', true)}>
                                        Sign in
                                    </span>
                                ) : (
                                    <Link
                                        href="/auth/login"
                                        className={getNavLinkClasses('/auth/login', true)}
                                    >
                                        Sign in
                                    </Link>
                                )}
                                {isActivePath('/auth/signup') ? (
                                    <span className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium cursor-default">
                                        Sign up
                                    </span>
                                ) : (
                                    <Link
                                        href="/auth/signup"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                        Sign up
                                    </Link>
                                )}
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        {pathname !== '/search' && (
                            <button
                                type="button"
                                className="mr-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                title="Search events"
                                onClick={handleSearchOpen}
                            >
                                <HiMagnifyingGlass className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                            </button>
                        )}
                        <button
                            ref={mobileMenuButtonRef}
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

                {/* Search Overlay */}
                {searchOpen && (
                    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ease-out ${
                        searchAnimating 
                            ? 'bg-black/70 backdrop-blur-sm' 
                            : 'bg-black/0 backdrop-blur-none'
                    }`}>
                        <form
                            ref={searchFormRef}
                            className={`w-full px-3 max-w-2xl mx-auto flex flex-col items-center relative transition-all duration-200 ease-out ${
                                searchAnimating 
                                    ? 'opacity-100 scale-100' 
                                    : 'opacity-0 scale-95'
                            }`}
                            onSubmit={e => {
                                e.preventDefault()
                                if (searchValue.trim()) {
                                    handleSearchClose()
                                    router.push(`/search?keyword=${encodeURIComponent(searchValue.trim())}`)
                                }
                            }}
                        >
                            <div className="relative w-full">
                                <input
                                    autoFocus
                                    type="text"
                                    value={searchValue}
                                    onChange={e => setSearchValue(e.target.value)}
                                    placeholder="Search events by title or description..."
                                    className="w-full text-xl md:text-3xl px-5 py-5 md:px-8 md:py-8 rounded-2xl border-0 shadow-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-indigo-500 pr-20"
                                    style={{ fontWeight: 600 }}
                                />
                                <button
                                    type="submit"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    tabIndex={-1}
                                    aria-label="Search"
                                >
                                    <HiMagnifyingGlass className="h-7 w-7" />
                                </button>
                            </div>
                            <button
                                type="button"
                                className="mt-8 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 text-lg"
                                onClick={handleSearchClose}
                            >
                                Cancel
                            </button>
                        </form>
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
                            <div className="flex justify-between items-center px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center">
                                    <Image
                                        src="/chess-logo.svg"
                                        alt="HBCC Logo"
                                        width={32}
                                        height={32}
                                        className="h-8 w-8 mr-3"
                                        priority
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

                                {user ? (
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

                                                {isActivePath('/organizer/html-to-markdown') ? (
                                                    <span className={getNavLinkClasses('/organizer/html-to-markdown', false)}>
                                                        HTML to Markdown
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href="/organizer/html-to-markdown"
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={getNavLinkClasses('/organizer/html-to-markdown', false)}
                                                    >
                                                        HTML to Markdown
                                                    </Link>
                                                )}
                                            </>
                                        )}

                                        {/* Admin Only Menu Items */}
                                        {profile?.role === 'admin' && (
                                            <>
                                                <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                    Administration
                                                </div>

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
                                            </>
                                        )}

                                        <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                                        <LogoutButton className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors">
                                            Sign out
                                        </LogoutButton>
                                    </>
                                ) : (
                                    <>
                                        <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                                        {isActivePath('/auth/login') ? (
                                            <span className={getNavLinkClasses('/auth/login', false)}>
                                                Sign in
                                            </span>
                                        ) : (
                                            <Link
                                                href="/auth/login"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={getNavLinkClasses('/auth/login', false)}
                                            >
                                                Sign in
                                            </Link>
                                        )}
                                        {isActivePath('/auth/signup') ? (
                                            <span className="block w-full text-left px-4 py-2 text-sm bg-indigo-600 text-white rounded-md cursor-default">
                                                Sign up
                                            </span>
                                        ) : (
                                            <Link
                                                href="/auth/signup"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="block w-full text-left px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                                            >
                                                Sign up
                                            </Link>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}
