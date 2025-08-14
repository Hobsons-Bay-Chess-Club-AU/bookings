import { del } from '@vercel/blob'

export interface EmailAttachment {
    filename: string;
    blobUrl?: string;
    content?: string; // base64 content for backward compatibility
    contentType: string;
}

export interface ProcessedAttachment {
    filename: string;
    content: string; // base64 content for email service
    contentType: string;
}

/**
 * Process attachments for email sending
 * Downloads from blob storage if blobUrl is provided, or uses existing content
 */
export async function processAttachmentsForEmail(
    attachments: EmailAttachment[]
): Promise<ProcessedAttachment[]> {
    if (!attachments || attachments.length === 0) {
        return []
    }

    const processedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
            try {
                // If we have blob URL, download the file
                if (attachment.blobUrl) {
                    console.log('Downloading attachment from blob:', attachment.filename)
                    
                    const response = await fetch(attachment.blobUrl)
                    if (!response.ok) {
                        throw new Error(`Failed to download attachment: ${response.statusText}`)
                    }
                    
                    const buffer = await response.arrayBuffer()
                    const base64Content = Buffer.from(buffer).toString('base64')
                    
                    return {
                        filename: attachment.filename,
                        content: base64Content,
                        contentType: attachment.contentType
                    }
                }
                
                // Fallback to existing content (backward compatibility)
                if (attachment.content) {
                    return {
                        filename: attachment.filename,
                        content: attachment.content,
                        contentType: attachment.contentType
                    }
                }
                
                throw new Error('Attachment has neither blobUrl nor content')
            } catch (error) {
                console.error(`Failed to process attachment ${attachment.filename}:`, error)
                throw error
            }
        })
    )

    return processedAttachments
}

/**
 * Clean up blob storage after successful email send
 */
export async function cleanupAttachmentBlobs(attachments: EmailAttachment[]): Promise<void> {
    if (!attachments || attachments.length === 0) {
        return
    }

    const cleanupPromises = attachments
        .filter(attachment => attachment.blobUrl)
        .map(async (attachment) => {
            try {
                console.log('Cleaning up blob:', attachment.filename, attachment.blobUrl)
                await del(attachment.blobUrl!)
                console.log('Successfully deleted blob:', attachment.filename)
            } catch (error) {
                console.error(`Failed to cleanup blob for ${attachment.filename}:`, error)
                // Don't throw - we don't want cleanup failures to break email sending
            }
        })

    await Promise.allSettled(cleanupPromises)
}
