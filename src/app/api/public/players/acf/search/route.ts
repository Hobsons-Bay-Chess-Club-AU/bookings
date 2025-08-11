import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { PlayerData } from '@/lib/types/database'
import { createCachedResponse, getCachePresets } from '@/lib/utils/cache'

export async function GET(request: NextRequest) {
    console.log('Received ACF search request')
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
        return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 })
    }

    try {
        // Use ACF quarterly rating files API
        // Files are published quarterly: March (mar), June (jun), September (sep), December (dec)
        // ACF has both standard and quick (rapid) rating files
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1 // getMonth() returns 0-11

        // Determine the most recent quarter
        let monthAbbr: string
        let monthNum: string
        let year = currentYear

        if (currentMonth >= 12) {
            monthAbbr = 'dec'
            monthNum = '12'
        } else if (currentMonth >= 9) {
            monthAbbr = 'sep'
            monthNum = '09'
        } else if (currentMonth >= 6) {
            monthAbbr = 'jun'
            monthNum = '06'
        } else if (currentMonth >= 3) {
            monthAbbr = 'mar'
            monthNum = '03'
        } else {
            // If we're in January/February, use December of previous year
            monthAbbr = 'dec'
            monthNum = '12'
            year = currentYear - 1
        }

        const yearSuffix = year.toString().slice(-2) // Get last 2 digits of year

        // Fetch both standard and quick rating files
        const standardFilename = `${monthAbbr}mst${yearSuffix}.txt`
        const quickFilename = `${monthAbbr}${yearSuffix}quick.txt`

        const standardUrl = `https://auschess.org.au/file_search.php?file=wp-content/uploads/${year}/${monthNum}/${standardFilename}&search=${encodeURIComponent(query.trim())}`
        const quickUrl = `https://auschess.org.au/file_search.php?file=wp-content/uploads/${year}/${monthNum}/${quickFilename}&search=${encodeURIComponent(query.trim())}`

        console.log('Fetching ACF Standard URL:', standardUrl)
        console.log('Fetching ACF Quick URL:', quickUrl)

        const headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
            'cache-control': 'no-cache',
            'pragma': 'no-cache',
            'priority': 'u=0, i',
            'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        }

        // Fetch both files in parallel
        const [standardResponse, quickResponse] = await Promise.all([
            fetch(standardUrl, { headers }),
            fetch(quickUrl, { headers })
        ])

        console.log('ACF Standard Response status:', standardResponse.status)
        console.log('ACF Quick Response status:', quickResponse.status)

        let standardPlayers: PlayerData[] = []
        let quickPlayers: PlayerData[] = []

        // Parse standard ratings if available
        if (standardResponse.ok) {
            const standardHtml = await standardResponse.text()
            console.log('Standard response length:', standardHtml.length)
            standardPlayers = parseACFTextResults(standardHtml, 'std_rating')
        }

        // Parse quick ratings if available
        if (quickResponse.ok) {
            const quickHtml = await quickResponse.text()
            console.log('Quick response length:', quickHtml.length)
            quickPlayers = parseACFTextResults(quickHtml, 'rapid_rating')
        }

        // Merge the results - combine players with same ID
        const mergedPlayers = mergePlayerRatings(standardPlayers, quickPlayers)
        console.log('Merged players:', mergedPlayers.length)

        return createCachedResponse({ players: mergedPlayers }, getCachePresets().SHORT)
    } catch (error) {
        console.error('Error searching ACF players:', error)
        return NextResponse.json({ error: 'Failed to search ACF players' }, { status: 500 })
    }
}

function parseACFTextResults(content: string, ratingType: 'std_rating' | 'rapid_rating' = 'std_rating'): PlayerData[] {
    try {
        const players: PlayerData[] = []

        // The response could be either HTML containing text results or direct text
        let textContent = content

        // If it's HTML, extract the text content
        if (content.includes('<html') || content.includes('<body')) {
            const $ = cheerio.load(content)
            textContent = $('body').text() || $('pre').text() || content
        }

        console.log(`Text content preview for ${ratingType}:`, textContent.substring(0, 200))

        // Parse the text line by line
        const lines = textContent.split('\n')

        for (const line of lines) {
            const trimmedLine = line.trim()

            // Skip empty lines or lines that are too short
            if (!trimmedLine || trimmedLine.length < 15) continue

            // ACF format: ID  Rating  State  Name
            // Example: 4167754  1501x   QLD    Beilby, Kieton
            // Example: 3206205  1534!!  VIC    Nguyen, Anh Kiet
            // Example: 6244961   New     WA    Soo, Wei Kiet

            // Split by multiple spaces/tabs to handle the fixed-width format
            const parts = trimmedLine.split(/\s{2,}/).filter(part => part.trim())

            if (parts.length >= 4) {
                const id = parts[0]?.trim()
                const ratingPart = parts[1]?.trim()
                const name = parts[3]?.trim()

                // Parse rating - it might have suffixes like 'x', '!', '!!' or be 'New'
                let rating: number | null = null
                if (ratingPart && ratingPart !== 'New') {
                    // Remove non-numeric characters and try to parse
                    const numericRating = ratingPart.replace(/[^0-9]/g, '')
                    const parsedRating = parseInt(numericRating)
                    if (!isNaN(parsedRating) && parsedRating >= 400 && parsedRating <= 3000) {
                        rating = parsedRating
                    }
                }

                if (id && name && id.match(/^\d+$/)) { // ID should be numeric
                    const playerData: PlayerData = {
                        id: id,
                        name: name,
                        std_rating: null,
                        rapid_rating: null,
                        blitz_rating: null,
                        quick_rating: null
                    }

                    // Set the appropriate rating type
                    if (ratingType === 'std_rating') {
                        playerData.std_rating = rating
                    } else if (ratingType === 'rapid_rating') {
                        playerData.rapid_rating = rating
                    }

                    players.push(playerData)
                }
            } else if (parts.length >= 2) {
                // Try alternative parsing for different formats
                const allText = trimmedLine
                const idMatch = allText.match(/^(\d+)/)
                const nameMatch = allText.match(/([A-Za-z,\s]+)$/)

                if (idMatch && nameMatch) {
                    const id = idMatch[1]
                    const name = nameMatch[1].trim()

                    const playerData: PlayerData = {
                        id: id,
                        name: name,
                        std_rating: null,
                        rapid_rating: null,
                        blitz_rating: null,
                        quick_rating: null
                    }

                    players.push(playerData)
                }
            }
        }

        console.log(`Successfully parsed ${players.length} players for ${ratingType}`)
        return players.slice(0, 20) // Increase limit since we're merging
    } catch (error) {
        console.error(`Error parsing ACF text results for ${ratingType}:`, error)
        return []
    }
}

function mergePlayerRatings(standardPlayers: PlayerData[], quickPlayers: PlayerData[]): PlayerData[] {
    const playerMap = new Map<string, PlayerData>()

    // Add all standard players
    for (const player of standardPlayers) {
        playerMap.set(player.id, { ...player })
    }

    // Merge quick ratings
    for (const quickPlayer of quickPlayers) {
        const existing = playerMap.get(quickPlayer.id)
        if (existing) {
            // Player exists in both lists - merge the ratings
            existing.rapid_rating = quickPlayer.rapid_rating
        } else {
            // Player only in quick list - add them
            playerMap.set(quickPlayer.id, { ...quickPlayer })
        }
    }

    // Convert back to array and sort by name
    const mergedPlayers = Array.from(playerMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))

    return mergedPlayers.slice(0, 10) // Final limit of 10 results
}