'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MarkdownEditor from '@/components/ui/markdown-editor'
import { SectionLoader } from '@/components/ui/loading-states'

interface ContentFormData {
    title: string
    slug: string
    body: string
    is_published: boolean
    meta_description: string
    meta_keywords: string[]
}

interface ContentFormPageProps {
    params: {
        id?: string
    }
}

export default function ContentFormPage({ params }: ContentFormPageProps) {
    const isEdit = Boolean(params.id)
    const [formData, setFormData] = useState<ContentFormData>({
        title: '',
        slug: '',
        body: '',
        is_published: false,
        meta_description: '',
        meta_keywords: []
    })
    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [keywordInput, setKeywordInput] = useState('')
    const router = useRouter()

    // Load existing content for editing
    const fetchContent = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/admin/content/${id}`)
            const data = await response.json()

            if (response.ok) {
                setFormData({
                    title: data.title,
                    slug: data.slug,
                    body: data.body,
                    is_published: data.is_published,
                    meta_description: data.meta_description || '',
                    meta_keywords: data.meta_keywords || []
                })
            } else {
                console.error('Failed to fetch content:', data.error)
                router.push('/admin/cms')
            }
        } catch (error) {
            console.error('Error fetching content:', error)
            router.push('/admin/cms')
        } finally {
            setLoading(false)
        }
    }, [router])

    useEffect(() => {
        if (isEdit && params.id) {
            fetchContent(params.id)
        }
    }, [isEdit, params.id, fetchContent])

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
    }

    const handleTitleChange = (title: string) => {
        setFormData(prev => {
            const newSlug = !isEdit || prev.slug === generateSlug(prev.title)
                ? generateSlug(title)
                : prev.slug

            return {
                ...prev,
                title,
                slug: newSlug
            }
        })

        // Clear title error
        if (errors.title) {
            setErrors(prev => ({ ...prev, title: '' }))
        }
    }

    const handleSlugChange = (slug: string) => {
        const cleanSlug = generateSlug(slug)
        setFormData(prev => ({ ...prev, slug: cleanSlug }))

        // Clear slug error
        if (errors.slug) {
            setErrors(prev => ({ ...prev, slug: '' }))
        }
    }

    const handleBodyChange = (body: string) => {
        setFormData(prev => ({ ...prev, body }))

        // Clear body error
        if (errors.body) {
            setErrors(prev => ({ ...prev, body: '' }))
        }
    }

    const addKeyword = () => {
        const keyword = keywordInput.trim()
        if (keyword && !formData.meta_keywords.includes(keyword)) {
            setFormData(prev => ({
                ...prev,
                meta_keywords: [...prev.meta_keywords, keyword]
            }))
            setKeywordInput('')
        }
    }

    const removeKeyword = (keywordToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            meta_keywords: prev.meta_keywords.filter(k => k !== keywordToRemove)
        }))
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required'
        }

        if (!formData.slug.trim()) {
            newErrors.slug = 'Slug is required'
        } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
            newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
        }

        if (!formData.body.trim()) {
            newErrors.body = 'Content body is required'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setSaving(true)
        setErrors({})

        try {
            const url = isEdit ? `/api/admin/content/${params.id}` : '/api/admin/content'
            const method = isEdit ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (response.ok) {
                router.push('/admin/cms')
            } else {
                if (data.error.includes('slug')) {
                    setErrors({ slug: data.error })
                } else {
                    setErrors({ general: data.error })
                }
            }
        } catch (error) {
            console.error('Error saving content:', error)
            setErrors({ general: 'An error occurred while saving content' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <SectionLoader minHeight="h-64" size="md" text="Loading content..." />
    }

    return (
        <>
            <div className="max-w-7xl mx-auto space-y-2">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                            {isEdit ? 'Edit Content' : 'Create Content'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            {isEdit ? 'Update existing content' : 'Create new website content with Markdown support'}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {errors.general && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                            <div className="text-sm text-red-700 dark:text-red-300">{errors.general}</div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                        {/* Basic Information */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 gap-6">
                                {/* Title */}
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        className={`mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${errors.title ? 'border-red-300 dark:border-red-500' : ''
                                            }`}
                                        placeholder="Enter content title"
                                    />
                                    {errors.title && (
                                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                                    )}
                                </div>

                                {/* Slug */}
                                <div>
                                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        URL Slug *
                                    </label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                                            /
                                        </span>
                                        <input
                                            type="text"
                                            id="slug"
                                            value={formData.slug}
                                            onChange={(e) => handleSlugChange(e.target.value)}
                                            className={`flex-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-none rounded-r-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${errors.slug ? 'border-red-300 dark:border-red-500' : ''
                                                }`}
                                            placeholder="url-friendly-slug"
                                        />
                                    </div>
                                    {errors.slug && (
                                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.slug}</p>
                                    )}
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        This will be the URL path for this content (e.g., /about-us)
                                    </p>
                                </div>

                                {/* Published Status */}
                                <div>
                                    <div className="flex items-center">
                                        <input
                                            id="is_published"
                                            type="checkbox"
                                            checked={formData.is_published}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                        />
                                        <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                                            Publish this content
                                        </label>
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Published content will be visible to the public
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Content Body *
                            </label>
                            <MarkdownEditor
                                value={formData.body}
                                onChange={handleBodyChange}
                                placeholder="Write your content using Markdown..."
                                className={errors.body ? 'border-red-300 dark:border-red-500' : ''}
                            />
                            {errors.body && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.body}</p>
                            )}
                        </div>

                        {/* SEO Settings */}
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">SEO Settings</h2>
                            <div className="space-y-4">
                                {/* Meta Description */}
                                <div>
                                    <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Meta Description
                                    </label>
                                    <textarea
                                        id="meta_description"
                                        value={formData.meta_description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                                        rows={3}
                                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Brief description for search engines (150-160 characters recommended)"
                                        maxLength={160}
                                    />
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {formData.meta_description.length}/160 characters
                                    </p>
                                </div>

                                {/* Meta Keywords */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Keywords
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={keywordInput}
                                            onChange={(e) => setKeywordInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                            className="flex-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            placeholder="Add a keyword"
                                        />
                                        <button
                                            type="button"
                                            onClick={addKeyword}
                                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    {formData.meta_keywords.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {formData.meta_keywords.map((keyword) => (
                                                <span
                                                    key={keyword}
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300"
                                                >
                                                    {keyword}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeKeyword(keyword)}
                                                        className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 hover:text-indigo-800 dark:hover:text-indigo-200 focus:outline-none"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between">
                        <button
                            type="button"
                            onClick={() => router.push('/admin/cms')}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : (isEdit ? 'Update Content' : 'Create Content')}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}
