import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Cookie Consent Required - Hobsons Bay Chess Club',
    description: 'Essential cookies are required to use our booking platform',
    robots: 'noindex, nofollow'
}

export default function CookieExitPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-3xl">🚫</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    Service Unavailable
                                </h1>
                                <p className="text-red-100 mt-1">
                                    Essential cookies are required
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-8">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                                    We&apos;re Sorry, But We Cannot Provide Our Services
                                </h2>
                                <p className="text-gray-600 leading-relaxed">
                                    Hobsons Bay Chess Club&apos;s booking platform requires essential cookies to function properly.
                                    Without these cookies, we cannot provide you with a secure and reliable booking experience.
                                </p>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <span className="text-amber-600 text-xl flex-shrink-0 mt-0.5">⚠️</span>
                                    <div>
                                        <h3 className="font-medium text-amber-800 mb-2">Why We Need Essential Cookies</h3>
                                        <ul className="text-sm text-amber-700 space-y-1">
                                            <li>• <strong>Security:</strong> Protect against malicious attacks and ensure safe transactions</li>
                                            <li>• <strong>Authentication:</strong> Keep you logged in and verify your identity</li>
                                            <li>• <strong>Session Management:</strong> Maintain your booking progress and preferences</li>
                                            <li>• <strong>Functionality:</strong> Enable core features like form submissions and payments</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <span className="text-blue-600 text-xl flex-shrink-0 mt-0.5">🔒</span>
                                    <div>
                                        <h3 className="font-medium text-blue-800 mb-2">Your Privacy is Protected</h3>
                                        <div className="text-sm text-blue-700 space-y-2">
                                            <p>We want to assure you that:</p>
                                            <ul className="space-y-1 ml-4">
                                                <li>• We <strong>DO NOT</strong> use tracking or advertising cookies</li>
                                                <li>• We <strong>DO NOT</strong> sell your data to third parties</li>
                                                <li>• We <strong>DO NOT</strong> collect unnecessary personal information</li>
                                                <li>• Session cookies are automatically deleted when you close your browser</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-6">
                                <h3 className="font-medium text-gray-900 mb-3">What Are Your Options?</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-green-600">✅</span>
                                            <h4 className="font-medium text-green-800">Recommended</h4>
                                        </div>
                                        <p className="text-sm text-green-700 mb-3">
                                            Accept essential cookies and enjoy our full booking platform with complete security and functionality.
                                        </p>
                                        <Link
                                            href="/"
                                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Return & Accept Cookies
                                        </Link>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-gray-600">📞</span>
                                            <h4 className="font-medium text-gray-800">Alternative</h4>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-3">
                                            Contact us directly to make bookings via phone or email without using our online platform.
                                        </p>
                                        <a
                                            href="mailto:contact@hobsonsbayCC.com.au"
                                            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            Contact Us
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <p className="text-xs text-gray-500">
                                This decision is stored locally in your browser and can be changed at any time by clearing your browser data.
                            </p>
                            <div className="flex space-x-4">
                                <a
                                    href="/privacy-policy"
                                    target="_blank"
                                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                                >
                                    Privacy Policy
                                </a>
                                <a
                                    href="/terms"
                                    target="_blank"
                                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                                >
                                    Terms of Service
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
