'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'default' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('theme') as Theme
    console.log('🔍 Loading theme from localStorage:', savedTheme)
    if (savedTheme && ['light', 'dark', 'default', 'system'].includes(savedTheme)) {
      console.log('✅ Setting theme from localStorage:', savedTheme)
      setTheme(savedTheme)
    } else {
      console.log('⚠️ No valid theme in localStorage, using system default')
    }
  }, [])

  useEffect(() => {
    console.log('🎨 Theme changed to:', theme)
    // Save theme to localStorage
    localStorage.setItem('theme', theme)
    
    // Determine the actual theme to apply
    let actualTheme: 'light' | 'dark' = 'light'
    
    if (theme === 'system') {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      actualTheme = systemPrefersDark ? 'dark' : 'light'
      console.log('🖥️ System theme detected:', actualTheme)
    } else if (theme === 'default') {
      // Use default theme (light)
      actualTheme = 'light'
      console.log('✨ Using default theme (light)')
    } else {
      actualTheme = theme
      console.log('🎯 Using explicit theme:', actualTheme)
    }
    
    setResolvedTheme(actualTheme)
    
    // Apply theme to document
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(actualTheme)
    console.log('📝 Applied theme class to document:', actualTheme)
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', actualTheme === 'dark' ? '#1f2937' : '#ffffff')
    }
  }, [theme])

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (theme === 'system') {
        const newTheme = mediaQuery.matches ? 'dark' : 'light'
        console.log('🔄 System theme changed to:', newTheme)
        setResolvedTheme(newTheme)
        
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(newTheme)
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 