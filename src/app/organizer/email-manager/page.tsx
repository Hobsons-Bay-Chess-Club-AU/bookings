import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/utils/auth'
import Breadcrumb from '@/components/ui/breadcrumb'
import EmailManagerClient from './email-manager-client'

export default async function EmailManagerPage() {
    const profile = await getCurrentProfile()

    if (!profile) {
        redirect('/auth/login')
    }

    // Check if user is organizer or admin
    if (profile.role !== 'organizer' && profile.role !== 'admin') {
        redirect('/unauthorized')
    }

    return (
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <div className="mb-6">
                <Breadcrumb 
                    items={[
                        { label: 'Events', href: '/organizer' },
                        { label: 'Email Manager' }
                    ]} 
                />
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Email Manager
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Send emails to participants, users, or specific bookings with custom templates and scheduling
                </p>
            </div>

            <EmailManagerClient />
        </div>
    )
}
