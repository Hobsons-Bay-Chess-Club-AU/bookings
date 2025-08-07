import { Metadata } from 'next'
import Link from 'next/link'
import { HiShieldCheck, HiXMark, HiInformationCircle, HiExclamationTriangle } from 'react-icons/hi2'

export const metadata: Metadata = {
    title: 'Privacy Policy - Hobsons Bay Chess Club',
    description: 'Our privacy policy and cookie usage information',
}

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-indigo-600 px-8 py-6">
                        <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
                        <p className="text-indigo-100 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-8 prose prose-gray dark:prose-invert max-w-none">
                        <div className="space-y-8">
                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Introduction</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Hobsons Bay Chess Club (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
                                    This Privacy Policy explains how we collect, use, and protect your information when you use our booking platform.
                                </p>
                            </section>

                            <section id="cookies">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                                    <HiShieldCheck className="mr-2 text-indigo-600 dark:text-indigo-400" />
                                    Cookie Policy
                                </h2>

                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">What Are Cookies?</h3>
                                    <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                                        Cookies are small text files stored on your device when you visit our website.
                                        They help us provide you with a better experience by remembering your preferences and keeping you logged in.
                                    </p>
                                </div>

                                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Essential Cookies We Use</h3>
                                <div className="grid md:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Authentication Cookies</h4>
                                        <p className="text-sm text-green-800 dark:text-green-200">Keep you logged in securely</p>
                                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">Duration: Session only</p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Security Cookies</h4>
                                        <p className="text-sm text-green-800 dark:text-green-200">Protect against malicious attacks</p>
                                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">Duration: Session only</p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Session Cookies</h4>
                                        <p className="text-sm text-green-800 dark:text-green-200">Maintain your booking progress</p>
                                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">Duration: Until browser closes</p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Consent Cookies</h4>
                                        <p className="text-sm text-green-800 dark:text-green-200">Remember your cookie preferences</p>
                                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">Duration: 1 year</p>
                                    </div>
                                </div>

                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
                                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center">
                                        <HiXMark className="mr-2 text-red-600 dark:text-red-400" />
                                        What We DON&apos;T Use
                                    </h4>
                                    <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                                        <li>• Advertising cookies</li>
                                        <li>• Tracking cookies</li>
                                        <li>• Third-party analytics cookies</li>
                                        <li>• Social media cookies</li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Information We Collect</h2>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Information</h3>
                                        <p className="text-gray-600 dark:text-gray-300">Name, email address, and profile information you provide when creating an account.</p>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Booking Information</h3>
                                        <p className="text-gray-600 dark:text-gray-300">Event bookings, participant details, and payment information necessary for our services.</p>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Technical Information</h3>
                                        <p className="text-gray-600 dark:text-gray-300">IP address, browser type, and device information for security and functionality purposes.</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">How We Use Your Information</h2>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                                    <li>Process your bookings and provide our services</li>
                                    <li>Maintain your account and authenticate your identity</li>
                                    <li>Send important updates about your bookings</li>
                                    <li>Ensure website security and prevent fraud</li>
                                    <li>Comply with legal obligations</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Data Protection</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                    We implement appropriate security measures to protect your personal information against unauthorized access,
                                    alteration, disclosure, or destruction.
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Security Measures Include:</h4>
                                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                        <li>• Encrypted data transmission (HTTPS)</li>
                                        <li>• Secure authentication systems</li>
                                        <li>• Regular security audits</li>
                                        <li>• Limited access to personal data</li>
                                    </ul>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Your Rights</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">You have the right to:</p>
                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2">
                                    <li>Access your personal information</li>
                                    <li>Correct inaccurate information</li>
                                    <li>Delete your account and associated data</li>
                                    <li>Withdraw consent for non-essential processing</li>
                                    <li>Request data portability</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Managing Your Cookie Preferences</h2>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                                    <p className="text-yellow-800 dark:text-yellow-200 mb-3">
                                        You can manage your cookie preferences at any time by clearing your browser data,
                                        which will reset your consent and show the cookie banner again on your next visit.
                                    </p>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                        <strong>Note:</strong> Declining essential cookies will prevent you from using our booking platform.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Contact Us</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    If you have any questions about this Privacy Policy or our cookie usage, please contact us:
                                </p>
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <p className="text-gray-700 dark:text-gray-300"><strong>Email:</strong> privacy@hobsonsbaycc.com.au</p>
                                    <p className="text-gray-700 dark:text-gray-300"><strong>Phone:</strong> (03) 1234 5678</p>
                                    <p className="text-gray-700 dark:text-gray-300"><strong>Address:</strong> Hobsons Bay Chess Club, Victoria, Australia</p>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 dark:bg-gray-700 px-8 py-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center">
                            <Link
                                href="/"
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                            >
                                ← Back to Home
                            </Link>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                This policy is effective as of {new Date().toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
