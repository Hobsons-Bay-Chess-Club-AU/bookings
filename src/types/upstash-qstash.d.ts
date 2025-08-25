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
    }
}


