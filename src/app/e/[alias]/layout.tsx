import type { Metadata } from 'next'
import { createSimpleClient } from '@/lib/supabase/server'

interface AliasLayoutProps {
  children: React.ReactNode
  params: Promise<{ alias: string }>
}

export async function generateMetadata(
  { params }: { params: Promise<{ alias: string }> }
): Promise<Metadata> {
  try {
    const { alias } = await params
    const supabase = createSimpleClient()

    const aliasUpper = alias.toUpperCase()
    const { data: event } = await supabase
      .from('events')
      .select('id, title, description, image_url')
      .eq('alias', aliasUpper)
      .single()

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (!event) {
      const url = `${siteUrl}/e/${alias}`
      return {
        title: 'Event not found',
        description: 'The event you are looking for could not be found.',
        openGraph: {
          type: 'website',
          url,
          title: 'Event not found',
          description: 'The event you are looking for could not be found.',
        },
        twitter: {
          card: 'summary',
          title: 'Event not found',
          description: 'The event you are looking for could not be found.',
        },
      }
    }

    const title = event.title || 'Event'
    const description = (event.description || '').slice(0, 200) || 'View event details.'

    const makeAbsolute = (src?: string | null) => {
      if (!src) return undefined
      if (/^https?:\/\//i.test(src)) return src
      return `${siteUrl}${src.startsWith('/') ? '' : '/'}${src}`
    }

    const image = makeAbsolute(event.image_url)
    const eventUrl = `${siteUrl}/events/${event.id}`
    const aliasUrl = `${siteUrl}/e/${alias}`

    return {
      title,
      description,
      alternates: {
        canonical: eventUrl,
      },
      openGraph: {
        type: 'website',
        url: aliasUrl,
        title,
        description,
        images: image ? [{ url: image }] : [{ url: `${siteUrl}/api/og/qr?url=${encodeURIComponent(eventUrl)}` }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : [`${siteUrl}/api/og/qr?url=${encodeURIComponent(eventUrl)}`],
      },
    }
  } catch {
    return {
      title: 'Event',
      description: 'View event details.',
    }
  }
}

export default async function AliasLayout({ children }: AliasLayoutProps) {
  return children
}


