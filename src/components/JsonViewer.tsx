'use client'

import { useEffect, useState } from 'react'
import JsonView from '@uiw/react-json-view'

interface JsonViewerProps {
    data: any
    className?: string
    containerClassName?: string
}

export default function JsonViewer({ data, className = '', containerClassName = '' }: JsonViewerProps) {
    const [isDarkMode, setIsDarkMode] = useState(false)

    // Custom themes for JsonView
    const lightTheme = {
        '--w-rjv-font-family': 'monospace',
        '--w-rjv-color': '#374151',
        '--w-rjv-key-number': '#059669',
        '--w-rjv-key-string': '#dc2626',
        '--w-rjv-background-color': 'transparent',
        '--w-rjv-line-color': '#e5e7eb',
        '--w-rjv-arrow-color': '#6b7280',
        '--w-rjv-edit-color': 'var(--w-rjv-color)',
        '--w-rjv-info-color': '#6b7280',
        '--w-rjv-update-color': '#059669',
        '--w-rjv-copied-color': '#059669',
        '--w-rjv-copied-success-color': '#059669',
        '--w-rjv-curlybraces-color': '#374151',
        '--w-rjv-colon-color': '#374151',
        '--w-rjv-brackets-color': '#374151',
        '--w-rjv-ellipsis-color': '#dc2626',
        '--w-rjv-quotes-color': 'var(--w-rjv-key-string)',
        '--w-rjv-quotes-string-color': 'var(--w-rjv-type-string-color)',
        '--w-rjv-type-string-color': '#059669',
        '--w-rjv-type-int-color': '#dc2626',
        '--w-rjv-type-float-color': '#dc2626',
        '--w-rjv-type-bigint-color': '#dc2626',
        '--w-rjv-type-boolean-color': '#7c3aed',
        '--w-rjv-type-date-color': '#dc2626',
        '--w-rjv-type-url-color': '#2563eb',
        '--w-rjv-type-null-color': '#6b7280',
        '--w-rjv-type-nan-color': '#dc2626',
        '--w-rjv-type-undefined-color': '#6b7280',
    }

    const darkTheme = {
        '--w-rjv-font-family': 'monospace',
        '--w-rjv-color': '#e5e7eb',
        '--w-rjv-key-number': '#10b981',
        '--w-rjv-key-string': '#ef4444',
        '--w-rjv-background-color': 'transparent',
        '--w-rjv-line-color': '#374151',
        '--w-rjv-arrow-color': '#9ca3af',
        '--w-rjv-edit-color': 'var(--w-rjv-color)',
        '--w-rjv-info-color': '#9ca3af',
        '--w-rjv-update-color': '#10b981',
        '--w-rjv-copied-color': '#10b981',
        '--w-rjv-copied-success-color': '#10b981',
        '--w-rjv-curlybraces-color': '#e5e7eb',
        '--w-rjv-colon-color': '#e5e7eb',
        '--w-rjv-brackets-color': '#e5e7eb',
        '--w-rjv-ellipsis-color': '#f87171',
        '--w-rjv-quotes-color': 'var(--w-rjv-key-string)',
        '--w-rjv-quotes-string-color': 'var(--w-rjv-type-string-color)',
        '--w-rjv-type-string-color': '#10b981',
        '--w-rjv-type-int-color': '#f87171',
        '--w-rjv-type-float-color': '#f87171',
        '--w-rjv-type-bigint-color': '#f87171',
        '--w-rjv-type-boolean-color': '#a78bfa',
        '--w-rjv-type-date-color': '#f87171',
        '--w-rjv-type-url-color': '#60a5fa',
        '--w-rjv-type-null-color': '#9ca3af',
        '--w-rjv-type-nan-color': '#f87171',
        '--w-rjv-type-undefined-color': '#9ca3af',
    }

    // Theme detection
    useEffect(() => {
        const checkTheme = () => {
            if (typeof window !== 'undefined') {
                const isDark = document.documentElement.classList.contains('dark')
                setIsDarkMode(isDark)
            }
        }

        // Check initial theme
        checkTheme()

        // Listen for theme changes
        const observer = new MutationObserver(checkTheme)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })

        return () => observer.disconnect()
    }, [])

    return (
        <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 ${containerClassName}`}>
            <JsonView
                value={data}
                style={(isDarkMode ? darkTheme : lightTheme) as React.CSSProperties}
                displayDataTypes={false}
                displayObjectSize={false}
                enableClipboard={false}
                className={className}
                onError={(error) => console.log('JsonView error:', error)}
            />
        </div>
    )
} 