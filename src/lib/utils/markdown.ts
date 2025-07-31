import { marked } from 'marked'

// Server-safe markdown rendering without DOMPurify
// For email templates, we can be more restrictive since we control the content
export function renderMarkdownForEmail(markdown: string): string {
    if (!markdown) return ''

    // Configure marked for basic security
    marked.setOptions({
        breaks: true,
        gfm: true,
    })

    // Convert markdown to HTML
    let html = marked.parse(markdown) as string

    // Basic sanitization - remove potentially dangerous elements
    // Since this is for emails and we control the content, we can be more restrictive
    html = html
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove style tags and their content  
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove iframe tags
        .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
        // Remove form tags
        .replace(/<form\b[^>]*>.*?<\/form>/gi, '')
        // Remove input tags
        .replace(/<input\b[^>]*\/?>/gi, '')
        // Remove button tags (but keep the content)
        .replace(/<button\b[^>]*>(.*?)<\/button>/gi, '$1')
        // Remove event handlers
        .replace(/\s*on\w+="[^"]*"/gi, '')
        .replace(/\s*on\w+='[^']*'/gi, '')
        // Remove javascript: links
        .replace(/javascript:/gi, '')

    return html
}
