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
        const token = process.env.QSTASH_TOKEN as string | undefined
        const url = process.env.QSTASH_URL as string | undefined
        qstashClient = url ? new Client({ token: token as string, url }) : new Client({ token: token as string })
    }
    return qstashClient
}

export async function scheduleOneTimeTrigger(options: QstashScheduleOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const { runAtIso, targetUrl, authorizationHeader, method = 'GET', body, idempotencyKey } = options

    try {
        const client = getClient()
        const when = new Date(runAtIso)
        const now = new Date()
        const ms = when.getTime() - now.getTime()
        const minutes = Math.max(0, Math.ceil(ms / 60000))

        // Prefer delay string (e.g., "100m") as per SDK example; fall back to notBefore
        const delay = `${minutes}m`

        const publishRes = await client.publishJSON({
            url: targetUrl,
            method,
            body,
            headers: {
                ...(authorizationHeader ? { 'Upstash-Forward-Authorization': authorizationHeader } : {}),
                ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
            },
            ...(minutes > 0 ? { delay } : { notBefore: when.toISOString() }),
        })
        return { success: true, id: (publishRes as unknown as { messageId?: string }).messageId }
    } catch (err) {
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


