export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { handleUpload } from '@vercel/blob/client'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function POST(request: Request) {
    try {
        // Verify user is authenticated and authorized
        const profile = await getCurrentProfile()
        if (!profile || (profile.role !== 'organizer' && profile.role !== 'admin')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        
        const json = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (
                pathname: string,
                _clientPayload: string | null,
                _multipart: boolean
            ) => {
                // Generate a unique path for email attachments
                const timestamp = Date.now()
                const randomSuffix = Math.random().toString(36).substring(2, 15)
                const customPathname = `email-attachments/${timestamp}-${randomSuffix}-${pathname}`
                
                return {
                    allowedContentTypes: [
                        // Documents
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/vnd.ms-powerpoint',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        'text/plain',
                        'text/csv',
                        // Images
                        'image/jpeg',
                        'image/png', 
                        'image/gif',
                        'image/webp',
                        'image/svg+xml',
                        // Archives
                        'application/zip',
                        'application/x-rar-compressed',
                        'application/x-7z-compressed',
                        // Other common formats
                        'application/json',
                        'application/xml',
                        'text/xml'
                    ],
                    addRandomSuffix: false, // We're handling the unique naming ourselves
                    maximumSizeInBytes: 10 * 1024 * 1024, // 10MB limit
                    pathname: customPathname
                }
            },
            onUploadCompleted: async ({ blob }) => {
                console.log('Email attachment uploaded successfully:', {
                    url: blob.url,
                    pathname: blob.pathname,
                    organizerId: profile.id,
                    timestamp: new Date().toISOString()
                })
            }
        })
        
        return NextResponse.json(json)
    } catch (err) {
        console.error('Email attachment upload failed:', err)
        const message = err instanceof Error ? err.message : 'Upload failed'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
