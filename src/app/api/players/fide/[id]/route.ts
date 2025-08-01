import { NextRequest, NextResponse } from 'next/server'
import { PlayerData } from '@/lib/types/database'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const fideId = params.id

    if (!fideId || !/^\d+$/.test(fideId)) {
        return NextResponse.json({ error: 'Invalid FIDE ID' }, { status: 400 })
    }

    try {
        // Make request to FIDE profile page
        const fideUrl = `https://ratings.fide.com/profile/${fideId}`

        const response = await fetch(fideUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: 'Player not found' }, { status: 404 })
            }
            throw new Error('Failed to fetch from FIDE API')
        }

        const html = await response.text()

        // Parse the HTML to extract player data
        const player = parseFideProfile(html, fideId)

        if (!player) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 })
        }

        return NextResponse.json(player)
    } catch (error) {
        console.error('Error fetching FIDE player:', error)
        return NextResponse.json({ error: 'Failed to fetch FIDE player' }, { status: 500 })
    }
}

function parseFideProfile(html: string, fideId: string): PlayerData | null {
    try {
        // Extract player name from the page title or profile section
        const nameMatch = html.match(/<title>([^|]+)\s*\|.*FIDE.*<\/title>/) ||
            html.match(/<h1[^>]*>([^<]+)<\/h1>/)

        if (!nameMatch) {
            return null
        }

        const name = nameMatch[1].trim()

        // Extract ratings from the profile page
        // Look for rating sections - FIDE profile pages typically have rating tables
        let stdRating: number | null = null
        let rapidRating: number | null = null
        let blitzRating: number | null = null

        // Try to find ratings in various possible formats
        const ratingPatterns = [
            /Standard\s*:?\s*(\d+)/i,
            /Classical\s*:?\s*(\d+)/i,
            /Std\s*:?\s*(\d+)/i
        ]

        const rapidPatterns = [
            /Rapid\s*:?\s*(\d+)/i,
            /Rpd\s*:?\s*(\d+)/i
        ]

        const blitzPatterns = [
            /Blitz\s*:?\s*(\d+)/i,
            /Blz\s*:?\s*(\d+)/i
        ]

        // Try to extract standard rating
        for (const pattern of ratingPatterns) {
            const match = html.match(pattern)
            if (match) {
                stdRating = parseInt(match[1])
                break
            }
        }

        // Try to extract rapid rating
        for (const pattern of rapidPatterns) {
            const match = html.match(pattern)
            if (match) {
                rapidRating = parseInt(match[1])
                break
            }
        }

        // Try to extract blitz rating
        for (const pattern of blitzPatterns) {
            const match = html.match(pattern)
            if (match) {
                blitzRating = parseInt(match[1])
                break
            }
        }

        return {
            id: fideId,
            name: name,
            std_rating: stdRating,
            rapid_rating: rapidRating,
            blitz_rating: blitzRating
        }
    } catch (error) {
        console.error('Error parsing FIDE profile:', error)
        return null
    }
}
