'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { HiSun, HiMoon, HiComputerDesktop, HiSparkles } from 'react-icons/hi2'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return HiSun
      case 'dark':
        return HiMoon
      case 'system':
        return HiComputerDesktop
      case 'default':
        return HiSparkles
      default:
        return HiSun
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
      case 'default':
        return 'Default'
      default:
        return 'Light'
    }
  }

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'default' | 'system'> = ['light', 'dark', 'default', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const Icon = getThemeIcon()

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors duration-200"
      title={`Current theme: ${getThemeLabel()}. Click to cycle themes.`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{getThemeLabel()}</span>
    </button>
  )
} 