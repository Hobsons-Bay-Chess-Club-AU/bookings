import { createClient } from '@/lib/supabase/server'
import { Profile, UserRole } from '@/lib/types/database'

export async function getCurrentUser() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    return user
}

export async function getCurrentProfile(): Promise<Profile | null> {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        return null
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
        return null
    }

    return profile
}

export async function hasRole(requiredRole: UserRole): Promise<boolean> {
    const profile = await getCurrentProfile()

    if (!profile) {
        return false
    }

    // Admin has access to everything
    if (profile.role === 'admin') {
        return true
    }

    // Check specific role
    return profile.role === requiredRole
}

export async function isAdmin(): Promise<boolean> {
    return hasRole('admin')
}

export async function isOrganizer(): Promise<boolean> {
    const profile = await getCurrentProfile()
    return profile?.role === 'organizer' || profile?.role === 'admin' || false
}