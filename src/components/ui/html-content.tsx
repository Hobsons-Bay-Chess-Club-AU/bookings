'use client'

import { marked } from 'marked'
import { useEffect, useState } from 'react'
import { renderMarkdownForEmail } from '@/lib/utils/markdown'
import { ElementType } from 'react'

interface MarkdownContentProps {
  content: string
  className?: string
  as?: ElementType
  serverSafe?: boolean // Option to use server-safe rendering
}

export default function MarkdownContent({
  content,
  className = '',
  as: Component = 'div',
  serverSafe = false
}: MarkdownContentProps) {
  const [sanitizedContent, setSanitizedContent] = useState('')
  const [isLoading, setIsLoading] = useState(!serverSafe) // Don't show loading if using server-safe mode

  useEffect(() => {
    if (serverSafe) {
      // Use server-safe rendering immediately
      setSanitizedContent(renderMarkdownForEmail(content))
      setIsLoading(false)
      return
    }

    const sanitizeContent = async () => {
      try {
        // Configure marked for security
        marked.setOptions({
          breaks: true,
          gfm: true,
        })

        // Convert markdown to HTML
        const htmlContent = await marked(content || '')

        // Import DOMPurify dynamically for client-side only
        const { default: DOMPurify } = await import('dompurify')

        // Sanitize HTML content to prevent XSS attacks
        const sanitized = DOMPurify.sanitize(htmlContent, {
          ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'a', 'blockquote', 'code', 'pre'
          ],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
        })

        setSanitizedContent(sanitized)
      } catch (error) {
        console.error('Error sanitizing content:', error)
        // Fallback: just escape HTML tags for basic safety
        const escapedContent = (content || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
        setSanitizedContent(`<p>${escapedContent}</p>`)
      } finally {
        setIsLoading(false)
      }
    }

    sanitizeContent()
  }, [content, serverSafe])

  if (isLoading) {
    return (
      <Component className={`prose prose-sm max-w-none ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Component>
    )
  }

  return (
    <Component
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}