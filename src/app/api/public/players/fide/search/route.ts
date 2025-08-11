import { NextRequest, NextResponse } from 'next/server'
import { PlayerData } from '@/lib/types/database'
import { createCachedResponse, getCachePresets } from '@/lib/utils/cache'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')  // Changed from 'search' to 'q'

    if (!query || query.trim().length < 2) {
        return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 })
    }

    try {
        // Make request to FIDE search API
        const fideUrl = `https://ratings.fide.com/incl_search_l.php?search=${encodeURIComponent(query)}&simple=1`

        const response = await fetch(fideUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        })

        if (!response.ok) {
            throw new Error('Failed to fetch from FIDE API')
        }

        const html = await response.text()

        // Parse the HTML to extract player data
        const players = parseFideSearchResults(html)

        return createCachedResponse({ players }, getCachePresets().SHORT)
    } catch (error) {
        console.error('Error searching FIDE players:', error)
        return NextResponse.json({ error: 'Failed to search FIDE players' }, { status: 500 })
    }
}

function parseFideSearchResults(html: string): PlayerData[] {
    const players: PlayerData[] = []

    try {
        // Extract the results table content more precisely
        const tableMatch = html.match(/<table[^>]*id="table_results"[^>]*>([\s\S]*?)<\/table>/)
        if (!tableMatch) {
            return players
        }

        const tableContent = tableMatch[1]

        // Extract table rows from tbody
        const tbodyMatch = tableContent.match(/<tbody>([\s\S]*?)<\/tbody>/)
        if (!tbodyMatch) {
            return players
        }

        const tbodyContent = tbodyMatch[1]
        const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
        let rowMatch

        while ((rowMatch = tableRowRegex.exec(tbodyContent)) !== null) {
            const row = rowMatch[1]

            // Extract FIDE ID
            const fideidMatch = row.match(/<td[^>]*data-label="FIDEID"[^>]*[^>]*>(\d+)<\/td>/)
            if (!fideidMatch) continue

            // Extract name from the link
            const nameMatch = row.match(/<a[^>]*class="found_name"[^>]*>([^<]+)<\/a>/)
            if (!nameMatch) continue

            const fideId = fideidMatch[1]
            const name = nameMatch[1].trim()

            // Extract all rating cells (there should be 3: Standard, Rapid, Blitz)
            const ratingCells = row.match(/<td[^>]*data-label="Rtg"[^>]*>([^<]*)<\/td>/g) || []

            let stdRating: number | null = null
            let rapidRating: number | null = null
            let blitzRating: number | null = null

            // Parse ratings from the cells
            ratingCells.forEach((cell, index) => {
                const ratingMatch = cell.match(/>(\d+)</)
                if (ratingMatch) {
                    const ratingValue = parseInt(ratingMatch[1])
                    if (index === 0) stdRating = ratingValue
                    else if (index === 1) rapidRating = ratingValue
                    else if (index === 2) blitzRating = ratingValue
                }
            })

            players.push({
                id: fideId,
                name: name,
                std_rating: stdRating,
                rapid_rating: rapidRating,
                blitz_rating: blitzRating,
                quick_rating: null // ACF specific, not applicable for FIDE
            })
        }
    } catch (error) {
        console.error('Error parsing FIDE search results:', error)
    }

    return players
}
