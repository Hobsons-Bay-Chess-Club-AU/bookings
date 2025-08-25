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

        const scheduleOptions = {
            destination: targetUrl,
            method,
            ...(body ? { body: body as BodyInit } : {}),
            headers: {
                ...(authorizationHeader ? { 'Upstash-Forward-Authorization': authorizationHeader } : {}),
                ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
            },
            delay: delayMinutes > 0 ? delayMinutes : undefined,
            notBefore: delayMinutes === 0 ? when.toISOString() : undefined,
        }

        console.log('[QSTASH] Creating schedule with options:', {
            destination: scheduleOptions.destination,
            method: scheduleOptions.method,
            delay: scheduleOptions.delay,
            notBefore: scheduleOptions.notBefore,
            headers: Object.keys(scheduleOptions.headers || {}),
            bodyType: typeof scheduleOptions.body
        })

        const scheduleRes = await client.schedules.create(scheduleOptions)
        
        console.log('[QSTASH] Schedule created successfully:', {
            response: scheduleRes,
            scheduleId: (scheduleRes as unknown as { scheduleId?: string }).scheduleId
        })

        return { success: true, id: (scheduleRes as unknown as { scheduleId?: string }).scheduleId }
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


