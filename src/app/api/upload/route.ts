export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { handleUpload } from '@vercel/blob/client'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const json = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (
                _pathname: string,
                _clientPayload: string | null,
                _multipart: boolean
            ) => ({
                allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
                addRandomSuffix: true,
            }),
            onUploadCompleted: async () => {
                // No-op: the client sets the returned public URL into the form field
            }
        })
        return NextResponse.json(json)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}


