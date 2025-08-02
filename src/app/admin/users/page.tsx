'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/types/database'
import AdminUsersPageClient from './page-client'

type User = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  active: boolean
  created_at: string
  email_confirmed?: boolean
  last_sign_in?: string | null
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) {
                    setLoading(false)
                    return
                }

                const { data: profiles, error } = await supabase
                    .from('profiles')
                    .select(`
                        id,
                        email,
                        full_name,
                        role,
                        created_at,
                        updated_at
                    `)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error loading users:', error)
                    return
                }

                // Transform the data to match the expected User type
                const transformedUsers: User[] = (profiles || []).map(profile => ({
                    id: profile.id,
                    email: profile.email,
                    full_name: profile.full_name,
                    role: profile.role,
                    active: true, // Default to true since we don't have this field in the schema
                    created_at: profile.created_at,
                    email_confirmed: true, // Default to true since we don't have this field
                    last_sign_in: null // Default to null since we don't have this field
                }))

                setUsers(transformedUsers)
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [supabase])

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return <AdminUsersPageClient users={users} />
}
