'use client'

import { useTheme } from '@/contexts/ThemeContext'

export default function ThemePreview() {
  const { theme, resolvedTheme } = useTheme()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Theme Preview</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Current theme: <span className="font-medium">{theme}</span>
          {theme === 'system' && ` (resolved: ${resolvedTheme})`}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sample Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Sample Card</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            This is how content will look with the current theme.
          </p>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md">
              Primary Button
            </button>
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm rounded-md">
              Secondary
            </button>
          </div>
        </div>

        {/* Sample Form */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Sample Form</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sample Input
              </label>
              <input
                type="text"
                placeholder="Enter text here..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sample-checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="sample-checkbox" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Sample checkbox
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 