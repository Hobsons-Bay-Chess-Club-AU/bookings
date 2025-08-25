// Lightweight QStash client helper
// Uses HTTP fetch to schedule a one-time delivery to our cron endpoint

export interface QstashScheduleOptions {
    runAtIso: string // ISO8601 timestamp when to trigger
    targetUrl: string
    authorizationHeader?: string // header value for Authorization on target request
    method?: 'GET' | 'POST'
    body?: unknown
    idempotencyKey?: string
}

// QStash expects a bearer token in QSTASH_TOKEN env var
const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const QSTASH_BASE = process.env.QSTASH_BASE_URL || 'https://qstash.upstash.io'

if (!QSTASH_TOKEN) {
    // Intentionally do not throw at import time to allow serverless edge to load without env in some envs
    // Calls will fail with explicit error if token is missing.
}

export async function scheduleOneTimeTrigger(options: QstashScheduleOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const { runAtIso, targetUrl, authorizationHeader, method = 'GET', body, idempotencyKey } = options

    if (!QSTASH_TOKEN) {
        return { success: false, error: 'QSTASH_TOKEN is not configured' }
    }

    const headers: Record<string, string> = {
        Authorization: `Bearer ${QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Forward-Authorization': authorizationHeader ?? '',
        'Upstash-Method': method,
        'Upstash-Not-Before': new Date(runAtIso).toISOString(),
    }

    if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey
    }

    const res = await fetch(`${QSTASH_BASE}/v2/publish/${encodeURIComponent(targetUrl)}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        return { success: false, error: `QStash publish failed: ${res.status} ${text}` }
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string }
    return { success: true, id: data.messageId }
}

// Utility to generate a minute-bucketed idempotency key for batch runs
export function generateMinuteBucketKey(prefix: string, whenIso: string): string {
    const when = new Date(whenIso)
    const bucket = new Date(when)
    bucket.setSeconds(0, 0)
    return `${prefix}:${bucket.toISOString()}`
}


