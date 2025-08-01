'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Dynamically import SiteNav with no SSR to avoid hydration issues
const SiteNav = dynamic(() => import('./site-nav'), { 
  ssr: false,
  loading: () => (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img 
                src="/chess-logo.svg" 
                alt="HBCC Logo" 
                className="h-8 w-8 mr-3"
              />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hobsons Bay Chess Club</h1>
            </Link>
          </div>
          <nav className="flex items-center space-x-4">
            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
          </nav>
        </div>
      </div>
    </header>
  )
})

interface NavWrapperProps {
  className?: string
  showTitle?: boolean
}

export default function NavWrapper({ className, showTitle = true }: NavWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Handle escape key and click outside for mobile menu
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenuButton = document.querySelector('[data-mobile-menu-button]') as HTMLElement
      const mobileMenu = document.querySelector('[data-mobile-menu]') as HTMLElement
      
      if (mobileMenu && 
          !mobileMenu.contains(event.target as Node) &&
          mobileMenuButton &&
          !mobileMenuButton.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!mounted) {
    // Show static nav during SSR
    return (
      <header className={`bg-white shadow ${className || ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {showTitle && (
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
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
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                data-mobile-menu-button
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
            <div className="md:hidden" data-mobile-menu>
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  Events
                </Link>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>
    )
  }

  return <SiteNav className={className} showTitle={showTitle} />
}
