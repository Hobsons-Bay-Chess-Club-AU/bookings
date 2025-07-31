import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{
    alias: string
  }>
}

export default async function ShortUrlPage({ params }: PageProps) {
  const { alias } = await params

  console.log('alias', alias)
  if (!alias || alias.length !== 5) {
    //redirect('/')
  }

  const supabase = createServiceClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('id')
    .eq('alias', alias.toUpperCase())
    .single()

    console.log('event', event, error)
  if (error || !event) {
    redirect('/')
  }

  // Redirect to the full event page
  redirect(`/events/${event.id}`)
} 