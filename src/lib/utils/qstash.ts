// QStash client helper built on @upstash/qstash
// Schedules a one-time delivery to our cron endpoint using publishJSON
import { Client } from '@upstash/qstash'

export interface QstashScheduleOptions {
    runAtIso: string // ISO8601 timestamp when to trigger
    targetUrl: string
    authorizationHeader?: string // header value for Authorization on target request
    method?: 'GET' | 'POST'
    body?: unknown
    idempotencyKey?: string
}

// QStash expects envs: QSTASH_URL (optional) and QSTASH_TOKEN (required)
let qstashClient: Client | null = null
function getClient(): Client {
    if (!qstashClient) {
        const token = process.env.QSTASH_TOKEN
        if (!token) {
            throw new Error('QSTASH_TOKEN is not configured')
        }
        qstashClient = new Client({ token })
    }
    return qstashClient
}

export async function scheduleOneTimeTrigger(options: QstashScheduleOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const { runAtIso, targetUrl, authorizationHeader, method = 'GET', body, idempotencyKey } = options

    try {
        console.log('[QSTASH] Starting publish request:', {
            targetUrl,
            method,
            runAtIso,
            hasBody: !!body,
            hasAuthHeader: !!authorizationHeader,
            hasIdempotencyKey: !!idempotencyKey
        })

        const client = getClient()
        const when = new Date(runAtIso)
        const now = new Date()
        const ms = when.getTime() - now.getTime()
        const minutes = Math.max(0, Math.ceil(ms / 60000))

        // Use delay in minutes format that SDK expects
        const delayMinutes = minutes > 0 ? minutes : 0

        console.log('[QSTASH] Calculated timing:', {
            scheduledTime: when.toISOString(),
            currentTime: now.toISOString(),
            timeDiffMs: ms,
            delayMinutes,
            willUseDelay: delayMinutes > 0
        })

        const publishOptions = {
            url: targetUrl,
            method,
            body,
            headers: {
                ...(authorizationHeader ? { 'Upstash-Forward-Authorization': authorizationHeader } : {}),
                ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
            },
            ...(delayMinutes > 0 ? { delay: delayMinutes } : {}),
        }

        console.log('[QSTASH] Publishing with options:', {
            url: publishOptions.url,
            method: publishOptions.method,
            delay: publishOptions.delay,
            headers: Object.keys(publishOptions.headers || {}),
            bodyType: typeof publishOptions.body
        })

        const publishRes = await client.publishJSON(publishOptions)
        
        console.log('[QSTASH] Publish successful:', {
            response: publishRes,
            messageId: (publishRes as unknown as { messageId?: string }).messageId
        })

        return { success: true, id: (publishRes as unknown as { messageId?: string }).messageId }
    } catch (err) {
        console.error('[QSTASH] Publish failed:', {
            error: err,
            errorMessage: err instanceof Error ? err.message : 'Unknown error',
            errorStack: err instanceof Error ? err.stack : undefined,
            targetUrl,
            method,
            runAtIso
        })
        
        return { success: false, error: err instanceof Error ? err.message : 'QStash publish failed' }
    }
}

// Utility to generate a minute-bucketed idempotency key for batch runs
export function generateMinuteBucketKey(prefix: string, whenIso: string): string {
    const when = new Date(whenIso)
    const bucket = new Date(when)
    bucket.setSeconds(0, 0)
    return `${prefix}:${bucket.toISOString()}`
}


