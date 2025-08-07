import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MailingListClient from './page-client'

export default async function MailingListPage() {
    const supabase = await createClient()

    // Check if user is authenticated and is an organizer
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'organizer' && profile.role !== 'admin')) {
        redirect('/unauthorized')
    }

    // Fetch mailing list data
    const { data: mailingList, error } = await supabase
        .from('mailing_list')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching mailing list:', error)
    }

    return (
        <div className="container mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mailing List Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your email subscribers and send marketing emails</p>
            </div>

            <MailingListClient 
                initialMailingList={mailingList || []} 
                userRole={profile.role}
            />
        </div>
    )
} 