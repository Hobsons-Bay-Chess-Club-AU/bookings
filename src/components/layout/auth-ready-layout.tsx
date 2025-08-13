'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import { HiArrowPath } from 'react-icons/hi2'

interface AuthReadyLayoutProps {
  children: ReactNode
}

export default function AuthReadyLayout({ children }: AuthReadyLayoutProps) {
  const { loading, isReady } = useAuth()
  const pathname = usePathname()

  // Define routes that require auth to be ready
  const authRequiredRoutes = [
    '/dashboard',
    '/profile',
    '/organizer',
    '/admin',
    '/booking'
  ]

  const requiresAuth = authRequiredRoutes.some(route => pathname?.startsWith(route))

  // Show loading spinner only for auth-required routes when auth is not ready
  if (requiresAuth && loading && !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <HiArrowPath className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Render children for public routes or when auth is ready
  return <>{children}</>
}
