'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types/database'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  isReady: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isReady: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // Set up auth state change listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('Auth state change:', event, session?.user?.email)

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
          
          if (mounted) {
            setProfile(profileData)
          }
        } catch (error) {
          console.error('Error fetching profile:', error)
          if (mounted) {
            setProfile(null)
          }
        }
      } else {
        if (mounted) {
          setProfile(null)
        }
      }

      // Mark as ready after auth state change
      if (mounted) {
        setLoading(false)
        setIsReady(true)
      }
    })

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { user: initialUser } } = await supabase.auth.getUser()
        
        if (mounted) {
          setUser(initialUser)
          
          if (initialUser) {
            // Fetch profile for initial user
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', initialUser.id)
              .single()
            
            if (mounted) {
              setProfile(profileData)
            }
          }
          
          // Mark as ready after initial session check
          setLoading(false)
          setIsReady(true)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        if (mounted) {
          setLoading(false)
          setIsReady(true)
        }
      }
    }

    // Get initial session
    getInitialSession()

    // Fallback timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false)
        setIsReady(true)
      }
    }, 3000) // 3 second timeout

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [supabase])

  const value = {
    user,
    profile,
    loading,
    isReady,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
