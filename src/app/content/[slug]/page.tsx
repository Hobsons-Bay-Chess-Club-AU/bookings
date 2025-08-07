import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Content } from '@/lib/types/database'
import MarkdownContent from '@/components/ui/html-content'

interface ContentPageProps {
    params: Promise<{
        slug: string
    }>
}

// Fetch content for the page
async function getContent(slug: string): Promise<Content | null> {
    try {
        console.log('🔄 Fetching content for slug:', slug)
        const supabase = await createClient()

        const { data: content, error } = await supabase
            .from('content')
            .select(`
                id,
                title,
                slug,
                body,
                version,
                meta_description,
                meta_keywords,
                created_at,
                updated_at,
                is_published
            `)
            .eq('slug', slug)
            .eq('is_published', true)
            .single()

        if (error) {
            console.error('❌ Error fetching content from Supabase:', error)
            return null
        }

        return content
    } catch (error) {
        console.error('❌ Exception in getContent:', error)
        return null
    }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ContentPageProps): Promise<Metadata> {
    const { slug } = await params
    const content = await getContent(slug)

    if (!content) {
        return {
            title: 'Page Not Found - Hobsons Bay Chess Club',
            description: 'The requested page could not be found.',
            robots: 'noindex, nofollow'
        }
    }

    // Create a description from content if meta_description is not provided
    const description = content.meta_description ||
        (content.body ? content.body.substring(0, 160).replace(/[#*`]/g, '') + '...' :
            `${content.title} - Hobsons Bay Chess Club`)

    return {
        title: `${content.title} - Hobsons Bay Chess Club`,
        description,
        keywords: content.meta_keywords?.join(', '),
        authors: [{ name: 'Hobsons Bay Chess Club' }],
        creator: 'Hobsons Bay Chess Club',
        publisher: 'Hobsons Bay Chess Club',
        robots: content.is_published ? 'index, follow' : 'noindex, nofollow',
        openGraph: {
            title: content.title,
            description,
            type: 'article',
            siteName: 'Hobsons Bay Chess Club',
            publishedTime: content.created_at,
            modifiedTime: content.updated_at,
            authors: ['Hobsons Bay Chess Club'],
        },
        twitter: {
            card: 'summary_large_image',
            title: content.title,
            description,
            creator: '@HobsonsBayCC',
        },
        alternates: {
            canonical: `/content/${slug}`
        },
        other: {
            'format-detection': 'telephone=no'
        }
    }
}

// Generate viewport configuration
export function generateViewport() {
    return {
        width: 'device-width',
        initialScale: 1
    }
}

export default async function ContentPage({ params }: ContentPageProps) {
    const { slug } = await params
    const content = await getContent(slug)

    if (!content) {
        console.log('❌ No content found, calling notFound()')
        notFound()
    }

    // Only show published content to public users
    // Admin users could see unpublished content in admin panel
    if (!content.is_published) {
        notFound()
    }


    return (
        <div className="bg-gray-50 dark:bg-gray-900">
            {/* Content */}
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-gray-900 dark:text-gray-100">
                {/* Breadcrumb Navigation */}
                <nav className="mb-8 text-sm" aria-label="Breadcrumb">
                    <ol className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                        <li>
                            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">Home</Link>
                        </li>
                        <li>
                            <span className="mx-2">/</span>
                            <span className="text-gray-900 dark:text-gray-100">{content.title}</span>
                        </li>
                    </ol>
                </nav>

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
                        {content.title}
                    </h1>
                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        Last updated: {new Date(content.updated_at).toLocaleDateString('en-AU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                        {content.version > 1 && (
                            <span className="ml-4">Version {content.version}</span>
                        )}
                    </div>
                </div>

                {/* Content Body */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="p-8">
                        <MarkdownContent
                            content={content.body}
                            className="prose prose-lg dark:prose-invert max-w-none"
                            serverSafe={false}
                        />
                    </div>
                </div>
            </div>

            {/* JSON-LD Structured Data for SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Article",
                        "headline": content.title,
                        "description": content.meta_description || content.body.substring(0, 160).replace(/[#*`]/g, ''),
                        "author": {
                            "@type": "Organization",
                            "name": "Hobsons Bay Chess Club",
                            "url": process.env.NEXT_PUBLIC_APP_URL || 'https://hobsonsbaycc.com'
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "Hobsons Bay Chess Club",
                            "url": process.env.NEXT_PUBLIC_APP_URL || 'https://hobsonsbaycc.com'
                        },
                        "datePublished": content.created_at,
                        "dateModified": content.updated_at,
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": `${process.env.NEXT_PUBLIC_APP_URL || 'https://hobsonsbaycc.com'}/content/${slug}`
                        },
                        "url": `${process.env.NEXT_PUBLIC_APP_URL || 'https://hobsonsbaycc.com'}/content/${slug}`,
                        "version": content.version,
                        "keywords": content.meta_keywords?.join(', ') || '',
                        "inLanguage": "en-AU"
                    })
                }}
            />
        </div>
    )
}