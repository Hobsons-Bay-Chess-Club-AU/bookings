import { Suspense } from 'react'
import BanListClient from './page-client'

export default function BanListPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Ban List Management
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage the list of banned participants across all events.
                </p>
            </div>
            
            <Suspense fallback={<div>Loading...</div>}>
                <BanListClient />
            </Suspense>
        </div>
    )
}
