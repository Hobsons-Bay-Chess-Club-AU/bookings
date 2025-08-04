import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <span className="text-6xl mb-4 block">📝</span>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Event Not Found
                    </h2>
                    <p className="text-gray-600 mb-8">
                        The event you&apos;re trying to edit doesn&apos;t exist or you don&apos;t have permission to edit it.
                    </p>
                    <div className="space-y-4">
                        <Link
                            href="/organizer"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Back to Dashboard
                        </Link>
                        <div>
                            <Link
                                href="/organizer/events/new"
                                className="text-indigo-600 hover:text-indigo-500 text-sm"
                            >
                                Create New Event
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}