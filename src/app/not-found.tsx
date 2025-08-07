import Link from 'next/link'
import { getCurrentProfile } from '@/lib/utils/auth'
import NotFoundNavigation from '@/components/ui/not-found-navigation'

export default async function NotFound() {
    const profile = await getCurrentProfile()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* 404 Icon */}
                <div className="mb-8">
                    <div className="mx-auto w-32 h-32 bg-gradient-to-br from-red-400 to-red-600 dark:from-red-500 dark:to-red-700 rounded-full flex items-center justify-center shadow-lg">
                        <svg 
                            className="w-16 h-16 text-white" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                            />
                        </svg>
                    </div>
                </div>

                {/* Error Message */}
                <div className="mb-8">
                    <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                        404
                    </h1>
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Page Not Found
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>

                {/* Navigation Buttons */}
                <NotFoundNavigation profile={profile} />

                {/* Additional Help - Only show for logged-in users */}
                {profile && (
                    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Need help? Try these options:
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/dashboard"
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium transition-colors duration-200"
                            >
                                Dashboard
                            </Link>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <Link
                                href="/events"
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium transition-colors duration-200"
                            >
                                Browse Events
                            </Link>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <Link
                                href="/profile"
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium transition-colors duration-200"
                            >
                                Profile
                            </Link>
                        </div>
                    </div>
                )}

                {/* Chess-themed decorative element */}
                <div className="mt-12 opacity-20">
                    <svg 
                        className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
            </div>
        </div>
    )
} 