'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TurndownService from 'turndown'

// Simple Rich Text Editor component
function SimpleRichTextEditor({ value, onChange, placeholder }: {
    value: string,
    onChange: (content: string) => void,
    placeholder: string
}) {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) {
        return (
            <div className="border border-gray-300 rounded-md h-96 flex items-center justify-center">
                <div className="text-gray-500">Loading editor...</div>
            </div>
        )
    }

    return (
        <div className="border border-gray-300 rounded-md text-gray-900">
            {/* Toolbar */}
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
                <div className="flex flex-wrap gap-1">
                    <button
                        type="button"
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        onClick={() => document.execCommand('bold')}
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        onClick={() => document.execCommand('italic')}
                    >
                        <em>I</em>
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        onClick={() => document.execCommand('underline')}
                    >
                        <u>U</u>
                    </button>
                    <div className="border-l border-gray-300 mx-1"></div>
                    <button
                        type="button"
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        onClick={() => document.execCommand('insertUnorderedList')}
                    >
                        • List
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        onClick={() => document.execCommand('insertOrderedList')}
                    >
                        1. List
                    </button>
                    <div className="border-l border-gray-300 mx-1"></div>
                    <button
                        type="button"
                        className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                        onClick={() => {
                            const url = prompt('Enter URL:')
                            if (url) {
                                document.execCommand('createLink', false, url)
                            }
                        }}
                    >
                        Link
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div
                contentEditable
                className="p-4 min-h-96 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
                style={{ minHeight: '400px' }}
                dangerouslySetInnerHTML={{ __html: value }}
                onInput={(e) => {
                    const target = e.target as HTMLDivElement
                    onChange(target.innerHTML)
                }}
                onPaste={(e) => {
                    // Allow rich paste
                    setTimeout(() => {
                        const target = e.target as HTMLDivElement
                        onChange(target.innerHTML)
                    }, 10)
                }}
                data-placeholder={placeholder}
            />
        </div>
    )
}

// Component to handle the conversion logic
function HtmlToMarkdownConverter() {
    const [htmlContent, setHtmlContent] = useState('')
    const [markdownOutput, setMarkdownOutput] = useState('')
    const [turndownService, setTurndownService] = useState<TurndownService | null>(null)
    const [loading, setLoading] = useState(false)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)

        // Initialize Turndown service on client side only
        const service = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            fence: '```',
            emDelimiter: '_',
            strongDelimiter: '**',
            linkStyle: 'inlined',
            linkReferenceStyle: 'full'
        })

        // Add custom rules for better conversion
        service.addRule('strikethrough', {
            filter: ['del', 's'],
            replacement: function (content: string) {
                return '~~' + content + '~~'
            }
        })

        service.addRule('underline', {
            filter: 'u',
            replacement: function (content: string) {
                return '<u>' + content + '</u>'
            }
        })

        service.addRule('highlight', {
            filter: 'mark',
            replacement: function (content: string) {
                return '==' + content + '=='
            }
        })

        setTurndownService(service)
    }, [])

    const convertToMarkdown = () => {
        if (!turndownService || !htmlContent.trim()) {
            setMarkdownOutput('')
            return
        }

        setLoading(true)
        try {
            const markdown = turndownService.turndown(htmlContent.trim())
            setMarkdownOutput(markdown)
        } catch (error) {
            console.error('Conversion error:', error)
            setMarkdownOutput('Error converting HTML to Markdown. Please check your content.')
        } finally {
            setLoading(false)
        }
    }

    const clearAll = () => {
        setHtmlContent('')
        setMarkdownOutput('')
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            // Could add a toast notification here
        })
    }

    const loadSample = () => {
        const sampleHtml = `<h1>Chess Tournament Event</h1>
<p>Join us for an exciting <strong>chess tournament</strong> at our club! This event is perfect for players of all skill levels.</p>

<h2>Event Details</h2>
<ul>
    <li><strong>Date:</strong> Saturday, August 15th, 2025</li>
    <li><strong>Time:</strong> 9:00 AM - 5:00 PM</li>
    <li><strong>Location:</strong> Hobsons Bay Chess Club</li>
    <li><strong>Entry Fee:</strong> $25 for adults, $15 for juniors</li>
</ul>

<h3>What to Bring</h3>
<ol>
    <li>Chess set (if you have one)</li>
    <li>Chess clock (optional)</li>
    <li>Pen and paper for notation</li>
    <li>Lunch or snack money</li>
</ol>

<blockquote>
    <p>"Chess is the gymnasium of the mind." - <em>Blaise Pascal</em></p>
</blockquote>

<p>For more information, visit our <a href="https://example.com">website</a> or contact us at <code>info@hbcc.org</code>.</p>

<hr>

<p><mark>Important:</mark> Registration closes 2 days before the event. <u>Don't miss out!</u></p>`

        setHtmlContent(sampleHtml)
    }

    if (!isClient) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading editor...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-2">How to Use This Tool</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Paste or type rich content in the visual editor below</li>
                    <li>You can paste directly from Word, Google Docs, or other rich text sources</li>
                    <li>Click "Convert to Markdown" to see the result</li>
                    <li>Copy the Markdown output to use in your event descriptions</li>
                    <li>Use the sample content to see how different elements convert</li>
                </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={convertToMarkdown}
                    disabled={!htmlContent.trim() || loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Converting...' : 'Convert to Markdown'}
                </button>

                <button
                    onClick={loadSample}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                    Load Sample Content
                </button>

                <button
                    onClick={clearAll}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                    Clear All
                </button>
            </div>

            {/* Editors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rich Text Editor */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Rich Text Editor</h3>
                        <button
                            onClick={() => copyToClipboard(htmlContent)}
                            disabled={!htmlContent.trim()}
                            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            Copy HTML
                        </button>
                    </div>
                    <div className="space-y-2">
                        <SimpleRichTextEditor
                            value={htmlContent}
                            onChange={setHtmlContent}
                            placeholder="Start typing or paste rich content here..."
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-12">
                        Tip: You can paste directly from Word, Google Docs, or other rich text sources
                    </p>
                </div>

                {/* Markdown Output */}
                <div className="space-y-2 text-gray-900">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Markdown Output</h3>
                        <button
                            onClick={() => copyToClipboard(markdownOutput)}
                            disabled={!markdownOutput.trim()}
                            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            Copy Markdown
                        </button>
                    </div>
                    <textarea
                        value={markdownOutput}
                        readOnly
                        placeholder="Converted Markdown will appear here..."
                        className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm bg-gray-50 resize-none"
                    />
                    <p className="text-xs text-gray-500">
                        Characters: {markdownOutput.length}
                    </p>
                </div>
            </div>

            {/* Raw HTML View (Expandable) */}
            <details className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900">
                <summary className="text-lg font-medium text-gray-900 cursor-pointer hover:text-gray-700">
                    View Raw HTML (Advanced)
                </summary>
                <div className="mt-4">
                    <textarea
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                        placeholder="Raw HTML content..."
                        className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        You can also edit the raw HTML directly here
                    </p>
                </div>
            </details>

            {/* Markdown Reference */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-900">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Common Markdown Syntax</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Headers</h4>
                        <code className="block bg-white p-2 rounded border">
                            # H1<br />
                            ## H2<br />
                            ### H3
                        </code>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Text Formatting</h4>
                        <code className="block bg-white p-2 rounded border">
                            **bold**<br />
                            *italic*<br />
                            ~~strikethrough~~
                        </code>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Lists</h4>
                        <code className="block bg-white p-2 rounded border">
                            - Bullet point<br />
                            1. Numbered item<br />
                            2. Another item
                        </code>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Links & Images</h4>
                        <code className="block bg-white p-2 rounded border">
                            [Link text](URL)<br />
                            ![Alt text](image-url)
                        </code>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function HtmlToMarkdownPage() {
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                if (userError || !user) {
                    router.push('/auth/login')
                    return
                }

                setUser(user)

                // Check if user has organizer or admin role
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (profileError || !profileData) {
                    setError('Unable to load user profile')
                    return
                }

                if (profileData.role !== 'organizer' && profileData.role !== 'admin') {
                    router.push('/unauthorized')
                    return
                }

                setProfile(profileData)
            } catch (err) {
                console.error('Auth check error:', err)
                setError('Authentication error')
            } finally {
                setLoading(false)
            }
        }

        checkAuth()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Link href="/organizer" className="text-indigo-600 hover:text-indigo-500">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">HTML to Markdown Converter</h1>
                            <p className="mt-2 text-gray-600">
                                Convert rich text content to Markdown format for your event descriptions
                            </p>
                        </div>
                        <Link
                            href="/organizer"
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white shadow rounded-lg p-6">
                    <HtmlToMarkdownConverter />
                </div>
            </div>
        </div>
    )
}
