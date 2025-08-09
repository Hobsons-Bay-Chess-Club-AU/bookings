'use client'

interface EventStructuredDataProps {
    event: {
        id: string
        title: string
        description?: string
        start_date: string
        end_date: string
        location: string
        price: number
        image_url?: string
        alias?: string
        organizer?: {
            full_name?: string
            email: string
        }
        max_attendees?: number
        current_attendees: number
    }
}

export default function EventStructuredData({ event }: EventStructuredDataProps) {
    const eventUrl = typeof window !== 'undefined'
        ? event.alias
            ? `${window.location.origin}/e/${event.alias}`
            : `${window.location.origin}/events/${event.id}`
        : ''

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": event.title,
        "description": event.description || `Join us for ${event.title} at ${event.location}`,
        "startDate": event.start_date,
        "endDate": event.end_date,
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": {
            "@type": "Place",
            "name": event.location,
            "address": {
                "@type": "PostalAddress",
                "addressLocality": event.location
            }
        },
        "image": event.image_url ? [event.image_url] : [],
        "organizer": {
            "@type": "Organization",
            "name": event.organizer?.full_name || "Hobsons Bay Chess Club",
            "email": event.organizer?.email,
            "url": typeof window !== 'undefined' ? window.location.origin : ''
        },
        "offers": {
            "@type": "AggregateOffer",
            "url": eventUrl,
            "priceCurrency": "AUD",
            // Note: we do not have pricing tiers here; approximate using base price as low/high fallback
            "lowPrice": event.price,
            "highPrice": event.price,
            "offerCount": 1,
            "availability": event.max_attendees && event.current_attendees >= event.max_attendees
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
            "validFrom": new Date().toISOString()
        },
        "performer": {
            "@type": "Organization",
            "name": "Hobsons Bay Chess Club"
        },
        "url": eventUrl,
        "isAccessibleForFree": event.price === 0,
        ...(event.max_attendees && {
            "maximumAttendeeCapacity": event.max_attendees
        })
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData)
            }}
        />
    )
}
