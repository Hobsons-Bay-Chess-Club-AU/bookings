"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ContentVersion {
    id: string
    title: string
    body: string
    version: number
    created_by?: string
    created_at: string
    created_by_profile?: { full_name: string | null }
    is_current: boolean
}

interface ContentHistoryData {
    content_id: string
    current_version: number
    versions: ContentVersion[]
}

export default function ContentHistoryClient({ id }: { id: string }) {
    const [historyData, setHistoryData] = useState<ContentHistoryData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null)
    const router = useRouter()

    const fetchHistory = useCallback(async () => {
        try {
            const response = await fetch(`/api/admin/content/${id}/history`)
            const data = await response.json()

            if (response.ok) {
                setHistoryData(data)
            } else {
                console.error('Failed to fetch content history:', data.error)
                router.push('/admin/cms')
            }
        } catch (error) {
            console.error('Error fetching content history:', error)
            router.push('/admin/cms')
        } finally {
            setLoading(false)
        }
    }, [id, router])

    useEffect(() => {
        fetchHistory()
    }, [fetchHistory])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getVersionBadge = (version: ContentVersion) => {
        if (version.is_current) {
            return (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Current
                </span>
            )
        }
        return (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                v{version.version}
            </span>
        )
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-2 text-gray-600">Loading version history...</span>
            </div>
        )
    }

    if (!historyData) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Content Not Found</h2>
                <p className="mt-2 text-gray-600">The requested content could not be found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Version History</h1>
                    <p className="text-gray-600 mt-2">
                        Viewing {historyData.versions.length} versions • Current: v{historyData.current_version}
                    </p>
                </div>
                <button
                    onClick={() => router.push('/admin/cms')}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Back to Content List
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Version List */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">All Versions</h2>
                    </div>
                    <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                        {historyData.versions.map((version) => (
                            <div
                                key={`${version.id}-${version.version}`}
                                className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedVersion?.version === version.version ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                                onClick={() => setSelectedVersion(version)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-sm font-medium text-gray-900">
                                            {version.title}
                                        </h3>
                                        {getVersionBadge(version)}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p>
                                        {formatDate(version.created_at)} by{' '}
                                        {version.created_by_profile?.full_name || 'Unknown'}
                                    </p>
                                    <p className="line-clamp-2"></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Version Details */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium text-gray-900">
                                {selectedVersion ? `Version ${selectedVersion.version}` : 'Select a Version'}
                            </h2>
                            {selectedVersion && !selectedVersion.is_current && (
                                <button
                                    onClick={() => {
                                        // TODO: Implement restore functionality
                                        alert('Restore functionality coming soon!')
                                    }}
                                    className="px-3 py-1 border border-indigo-300 rounded text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    Restore
                                </button>
                            )}
                        </div>
                    </div>

                    {selectedVersion ? (
                        <div className="p-6 space-y-4">
                            {/* Version Info */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Version:</span>
                                    <span className="text-sm text-gray-900">{selectedVersion.version}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Created:</span>
                                    <span className="text-sm text-gray-900">{formatDate(selectedVersion.created_at)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Author:</span>
                                    <span className="text-sm text-gray-900">
                                        {selectedVersion.created_by_profile?.full_name || 'Unknown'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Status:</span>
                                    {getVersionBadge(selectedVersion)}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Title</h3>
                                <p className="text-sm text-gray-900 bg-gray-50 rounded p-2">
                                    {selectedVersion.title}
                                </p>
                            </div>

                            {/* Content Preview */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Content Preview</h3>
                                <div className="max-h-64 overflow-y-auto bg-gray-50 rounded p-3">
                                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                                        {selectedVersion.body}
                                    </pre>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-2 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        const blob = new Blob([selectedVersion.body], { type: 'text/markdown' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = `${selectedVersion.title.replace(/\s+/g, '-')}-v${selectedVersion.version}.md`
                                        a.click()
                                        URL.revokeObjectURL(url)
                                    }}
                                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    Download
                                </button>
                                {selectedVersion.is_current && (
                                    <button
                                        onClick={() => router.push(`/admin/cms/${historyData.content_id}/edit`)}
                                        className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        Edit Current
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            <div className="text-4xl mb-4">📋</div>
                            <p>Select a version from the list to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Version Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{historyData.versions.length}</div>
                        <div className="text-sm text-gray-500">Total Versions</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">v{historyData.current_version}</div>
                        <div className="text-sm text-gray-500">Current Version</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {new Set(historyData.versions.map(v => v.created_by_profile?.full_name).filter(Boolean)).size}
                        </div>
                        <div className="text-sm text-gray-500">Contributors</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {Math.round((Date.now() - new Date(historyData.versions[historyData.versions.length - 1]?.created_at || 0).getTime()) / (1000 * 60 * 60 * 24))}
                        </div>
                        <div className="text-sm text-gray-500">Days Since First</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
