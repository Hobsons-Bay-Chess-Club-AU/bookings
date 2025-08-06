import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* About Section */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center mb-4">
                            <Image
                                src="/chess-logo.svg"
                                alt="HBCC Logo"
                                width={32}
                                height={32}
                                className="h-8 w-8 mr-3"
                                priority
                            />
                            <h3 className="text-lg font-bold">Hobsons Bay Chess Club</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            Welcome to the Hobsons Bay Chess Club, where strategy meets community!
                            We are dedicated to promoting the game of chess within the WEST
                            community and providing a welcoming environment for players of all skill levels.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">
                            Quick Links
                        </h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                                    Events
                                </Link>
                            </li>
                            <li>
                                <Link href="/content/about-us" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/content/contact-us" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/content/faq" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                                    FAQ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">
                            Legal
                        </h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/content/privacy-policy" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/content/terms-of-use" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                                    Terms of Use
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookie-exit" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                                    Cookie Settings
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="text-gray-500 dark:text-gray-400 text-sm">
                            © {currentYear} Hobsons Bay Chess Club. All rights reserved.
                        </div>
                        <div className="mt-4 md:mt-0">
                            <div className="flex space-x-6">
                                <a
                                    href="mailto:info@hobsonsbaychessclub.com"
                                    className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors"
                                >
                                    info@hobsonsbaycc.com
                                </a>
                                <span className="text-gray-400 dark:text-gray-600">|</span>
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                    Melbourne, Australia
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
