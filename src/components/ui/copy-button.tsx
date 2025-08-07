'use client'

import { useState } from 'react'
import { HiCheck, HiClipboardDocument } from 'react-icons/hi2'

interface CopyButtonProps {
  text: string
  className?: string
  children?: React.ReactNode
}

export default function CopyButton({ text, className = '', children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border transition-colors ${
        copied
          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
      } ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <HiCheck className="w-3 h-3 mr-1" />
          Copied
        </>
      ) : (
        <>
          <HiClipboardDocument className="w-3 h-3 mr-1" />
          {children || 'Copy'}
        </>
      )}
    </button>
  )
} 