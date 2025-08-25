declare module '@upstash/qstash' {
    export class Client {
        constructor(init: { token: string; url?: string | undefined })
        publishJSON(input: {
            url: string
            method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
            body?: unknown
            headers?: Record<string, string>
            notBefore?: string | number
        }): Promise<unknown>
        
        schedules: {
            create(input: {
                destination: string
                method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
                body?: BodyInit
                headers?: HeadersInit
                delay?: number | `${bigint}s` | `${bigint}m` | `${bigint}h` | `${bigint}d`
                notBefore?: string
                cron?: string
                deduplicationId?: string
                flowControl?: unknown
            }): Promise<unknown>
        }
    }
}
