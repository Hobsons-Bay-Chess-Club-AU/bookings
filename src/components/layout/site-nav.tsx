'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LogoutButton from '@/components/auth/logout-button'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types/database'

interface SiteNavProps {
    className?: string
    showTitle?: boolean
}

export default function SiteNav({ className = '', showTitle = true }: SiteNavProps) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const mobileMenuRef = useRef<HTMLDivElement>(null)
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
    const router = useRouter()
    const supabase = createClient()

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

                    setProfile(profileData)
                }
            } catch (error) {
                console.error('Error in getUser:', error)
            } finally {
                setLoading(false)
            }
        }

        getUser()

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

        return () => subscription.unsubscribe()
    }, [supabase.auth])

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

    if (loading) {
        return (
            <header className={`bg-white shadow ${className}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        {showTitle && (
                            <div className="flex items-center">
                                <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                                    <img 
                                        src="/chess-logo.svg" 
                                        alt="HBCC Logo" 
                                        className="h-8 w-8 mr-3"
                                    />
                                    <h1 className="text-2xl font-bold text-gray-900">Hobsons Bay Chess Club</h1>
                                </Link>
                            </div>
                        )}
                        <nav className="flex items-center space-x-4">
                            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                        </nav>
                    </div>
                </div>
            </header>
        )
    }

    return (
        <header className={`bg-white shadow ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6">
                    {showTitle && (
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                                <img 
                                    src="/chess-logo.svg" 
                                    alt="HBCC Logo" 
                                    className="h-8 w-8 mr-3"
                                />
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hobsons Bay Chess Club</h1>
                            </Link>
                        </div>
                    )}

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-4">
                        <Link
                            href="/"
                            className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Events
                        </Link>

                        {user ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Dashboard
                                </Link>

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

                                            {/* Admin/Organizer Menu Items */}
                                            {(profile?.role === 'admin' || profile?.role === 'organizer') && (
                                                <>
                                                    <div className="border-t border-gray-100 my-1"></div>
                                                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                        Management
                                                    </div>

                                                    <button
                                                        onClick={() => handleNavigate('/organizer')}
                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <span className="flex items-center">
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            Manage Events
                                                        </span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleNavigate('/organizer/custom-fields')}
                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <span className="flex items-center">
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Custom Fields
                                                        </span>
                                                    </button>
                                                </>
                                            )}

                                            {/* Admin Only Menu Items */}
                                            {profile?.role === 'admin' && (
                                                <>
                                                    <div className="border-t border-gray-100 my-1"></div>
                                                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                        Administration
                                                    </div>

                                                    <button
                                                        onClick={() => handleNavigate('/admin/users')}
                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <span className="flex items-center">
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                            </svg>
                                                            Manage Users
                                                        </span>
                                                    </button>
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
                        ) : (
                            <>
                                <Link
                                    href="/auth/login"
                                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            ref={mobileMenuButtonRef}
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
                                    <img 
                                        src="/chess-logo.svg" 
                                        alt="HBCC Logo" 
                                        className="h-8 w-8 mr-3"
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
                                <Link
                                    href="/"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-3 rounded-md text-base font-medium transition-colors"
                                >
                                    Events
                                </Link>

                                {user ? (
                                    <>
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-3 rounded-md text-base font-medium transition-colors"
                                        >
                                            Dashboard
                                        </Link>
                                        
                                        <Link
                                            href="/profile"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-3 rounded-md text-base font-medium transition-colors"
                                        >
                                            Profile Settings
                                        </Link>

                                        {/* Admin/Organizer Menu Items */}
                                        {(profile?.role === 'admin' || profile?.role === 'organizer') && (
                                            <>
                                                <div className="border-t border-gray-200 my-3"></div>
                                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                    Management
                                                </div>

                                                <Link
                                                    href="/organizer"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-3 rounded-md text-base font-medium transition-colors"
                                                >
                                                    Manage Events
                                                </Link>

                                                <Link
                                                    href="/organizer/custom-fields"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-3 rounded-md text-base font-medium transition-colors"
                                                >
                                                    Custom Fields
                                                </Link>
                                            </>
                                        )}

                                        {/* Admin Only Menu Items */}
                                        {profile?.role === 'admin' && (
                                            <>
                                                <div className="border-t border-gray-200 my-3"></div>
                                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                    Administration
                                                </div>

                                                <Link
                                                    href="/admin/users"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-3 rounded-md text-base font-medium transition-colors"
                                                >
                                                    Manage Users
                                                </Link>
                                            </>
                                        )}

                                        <div className="border-t border-gray-200 my-3"></div>
                                        <div className="px-3 py-2">
                                            <LogoutButton className="block w-full text-left text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-3 rounded-md text-base font-medium transition-colors">
                                                Sign out
                                            </LogoutButton>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/auth/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-3 rounded-md text-base font-medium transition-colors"
                                        >
                                            Sign in
                                        </Link>
                                        <Link
                                            href="/auth/signup"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-3 rounded-md text-base font-medium transition-colors"
                                        >
                                            Sign up
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}
