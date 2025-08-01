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
})

interface NavWrapperProps {
  className?: string
  showTitle?: boolean
}

export default function NavWrapper({ className, showTitle = true }: NavWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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
                  <h1 className="text-2xl font-bold text-gray-900">Hobsons Bay Chess Club</h1>
                </Link>
              </div>
            )}
            <nav className="flex items-center space-x-4">
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
          </div>
        </div>
      </header>
    )
  }

  return <SiteNav className={className} showTitle={showTitle} />
}
