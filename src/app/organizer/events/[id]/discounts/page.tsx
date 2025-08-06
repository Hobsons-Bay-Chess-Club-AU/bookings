import EventDiscountsPageClient from './page-client'

export default async function EventDiscountsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    
    return <EventDiscountsPageClient eventId={id} />
} 