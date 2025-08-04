'use client'

import { useState } from 'react'

interface MarkdownEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter description using Markdown...',
  className = ''
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea[data-markdown-editor="true"]') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end)
      const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end)
      onChange(newValue)

      // Set cursor position after insertion
      setTimeout(() => {
        textarea.focus()
        const newPos = start + before.length + selectedText.length
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    }
  }

  const insertAtLineStart = (prefix: string) => {
    const textarea = document.querySelector('textarea[data-markdown-editor="true"]') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const lineStartPos = value.lastIndexOf('\n', start - 1) + 1
      const lineEndPos = value.indexOf('\n', start)
      const currentLineEnd = lineEndPos === -1 ? value.length : lineEndPos
      const currentLine = value.substring(lineStartPos, currentLineEnd)

      // Remove existing header if present
      const cleanLine = currentLine.replace(/^#+\s*/, '')
      const newLine = prefix + cleanLine

      const newValue = value.substring(0, lineStartPos) + newLine + value.substring(currentLineEnd)
      onChange(newValue)

      setTimeout(() => {
        textarea.focus()
        const newPos = lineStartPos + newLine.length
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    }
  }

  // Convert markdown to HTML for preview
  const convertToHtml = (markdown: string) => {
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>')

      // Bold and Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')

      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')

      // Lists
      .replace(/^\* (.+$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^(\d+)\. (.+$)/gim, '<li class="ml-4">$1. $2</li>')

      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/\n/g, '<br/>')

      // Wrap in paragraphs
      .replace(/^(?!<[h|l])/gm, '<p class="mb-3">')
      .replace(/(?!>)$/gm, '</p>')

      // Clean up extra paragraph tags
      .replace(/<p class="mb-3"><\/p>/g, '')
      .replace(/<p class="mb-3">(<h[1-6])/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
      .replace(/<p class="mb-3">(<li)/g, '$1')
      .replace(/(<\/li>)<\/p>/g, '$1')
  }

  return (
    <div className={`markdown-editor border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-2 flex items-center justify-between bg-gray-50 rounded-t-md text-gray-800">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => insertAtLineStart('# ')}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertAtLineStart('## ')}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertAtLineStart('### ')}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
            title="Heading 3"
          >
            H3
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1"></div>

          <button
            type="button"
            onClick={() => insertText('**', '**')}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 font-bold"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*')}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 italic"
            title="Italic"
          >
            I
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1"></div>

          <button
            type="button"
            onClick={() => insertText('[Link Text](https://example.com)')}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
            title="Link"
          >
            🔗
          </button>
          <button
            type="button"
            onClick={() => insertAtLineStart('* ')}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
            title="Bullet List"
          >
            •
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
            title="Show Help"
          >
            ?
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
          >
            {isPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="p-3 bg-blue-50 border-b border-gray-300 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Headers:</strong><br />
              # Heading 1<br />
              ## Heading 2<br />
              ### Heading 3
            </div>
            <div>
              <strong>Formatting:</strong><br />
              **bold text**<br />
              *italic text*<br />
              [link text](URL)
            </div>
          </div>
          <div className="mt-2">
            <strong>Lists:</strong> Start lines with * for bullets or 1. for numbers
          </div>
        </div>
      )}

      {/* Editor/Preview Area */}
      {isPreview ? (
        <div className="p-4 min-h-[120px] prose prose-sm max-w-none bg-white">
          <div dangerouslySetInnerHTML={{ __html: convertToHtml(value) }} />
        </div>
      ) : (
        <textarea
          data-markdown-editor="true"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 border-0 resize-none focus:outline-none rounded-b-md min-h-[120px] font-mono text-sm"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace' }}
        />
      )}
    </div>
  )
}