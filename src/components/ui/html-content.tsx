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
        // Configure marked for security and proper paragraph handling
        marked.setOptions({
          breaks: true,
          gfm: true
        })

        // Convert markdown to HTML
        const htmlContent = await marked(content || '')

        // Post-process HTML to ensure proper paragraph spacing
        const processedHtml = htmlContent
          // Ensure paragraphs have proper spacing
          .replace(/<p>/g, '<p class="mb-4">')
          // Ensure headings have proper spacing
          .replace(/<h1>/g, '<h1 class="text-2xl font-bold mb-4 mt-6">')
          .replace(/<h2>/g, '<h2 class="text-xl font-bold mb-3 mt-5">')
          .replace(/<h3>/g, '<h3 class="text-lg font-bold mb-2 mt-4">')
          .replace(/<h4>/g, '<h4 class="text-base font-bold mb-2 mt-3">')
          .replace(/<h5>/g, '<h5 class="text-sm font-bold mb-2 mt-3">')
          .replace(/<h6>/g, '<h6 class="text-xs font-bold mb-2 mt-3">')
          // Ensure lists have proper spacing
          .replace(/<ul>/g, '<ul class="list-disc ml-6 mb-4">')
          .replace(/<ol>/g, '<ol class="list-decimal ml-6 mb-4">')
          .replace(/<li>/g, '<li class="mb-1">')
          // Ensure blockquotes have proper styling
          .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-4 italic bg-gray-50 dark:bg-gray-800">')
          // Ensure code blocks have proper styling
          .replace(/<pre>/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-md my-4 overflow-x-auto">')
          .replace(/<code>/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">')

        // Import DOMPurify dynamically for client-side only
        const { default: DOMPurify } = await import('dompurify')

        // Sanitize HTML content to prevent XSS attacks
        const sanitized = DOMPurify.sanitize(processedHtml, {
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
      <Component className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </Component>
    )
  }

  return (
    <Component
      className={`prose prose-sm dark:prose-invert max-w-none markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      style={{
        // Ensure proper line spacing and paragraph breaks
        lineHeight: '1.6',
        // Add custom CSS for markdown content
      }}
    />
  )
}