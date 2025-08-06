'use client'

import { useTheme, Theme } from '@/contexts/ThemeContext'
import { HiSun, HiMoon, HiComputerDesktop, HiSparkles } from 'react-icons/hi2'

const themes = [
  {
    value: 'light' as const,
    label: 'Light',
    icon: HiSun,
    description: 'Light theme'
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    icon: HiMoon,
    description: 'Dark theme'
  },
  {
    value: 'default' as const,
    label: 'Default',
    icon: HiSparkles,
    description: 'Default theme'
  },
  {
    value: 'system' as const,
    label: 'System',
    icon: HiComputerDesktop,
    description: 'Follow system preference'
  }
]

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  const handleThemeChange = (newTheme: Theme) => {
    console.log('🖱️ Theme button clicked:', newTheme)
    setTheme(newTheme)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Theme</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose your preferred theme for the application.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon
          const isSelected = theme === themeOption.value
          
          return (
            <button
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              className={`relative flex items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <Icon 
                  className={`h-6 w-6 ${
                    isSelected 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} 
                />
                <div className="text-center">
                  <div className={`text-sm font-medium ${
                    isSelected 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {themeOption.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {themeOption.description}
                  </div>
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
} 