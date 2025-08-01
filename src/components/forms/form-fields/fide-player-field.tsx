'use client'

/**
 * FIDE Player Field Component
 * 
 * A composite field that allows users to search for and select FIDE-rated chess players.
 * 
 * Features:
 * - Search by player name (shows dropdown with matches)
 * - Search by FIDE ID (numeric input, fetches player data directly)
 * - Displays player ratings (Standard, Rapid, Blitz)
 * - Returns PlayerData object with id, name, and ratings
 * - Debounced API calls to prevent overwhelming FIDE servers
 * 
 * API Integration:
 * - Uses /api/players/fide/search for name searches
 * - Uses /api/players/fide/[id] for direct ID lookups
 */

import { useState, useEffect, useRef } from 'react'
import { FormFieldProps } from './types'
import { PlayerData } from '@/lib/types/database'

interface FidePlayerFieldProps extends FormFieldProps {
    onPlayerSelect?: (player: PlayerData | null) => void
}

export default function FidePlayerField({
    field,
    value,
    onChange,
    error,
    className = '',
    disabled = false,
    onPlayerSelect
}: FidePlayerFieldProps) {
    const [query, setQuery] = useState('')
    const [players, setPlayers] = useState<PlayerData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null)
    const [searchError, setSearchError] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Initialize from existing value
    useEffect(() => {
        if (value && typeof value === 'object' && value.id) {
            setSelectedPlayer(value as PlayerData)
            setQuery(value.name || '')
        }
    }, [value])

    // Handle search with debouncing
    useEffect(() => {
        const searchPlayers = async () => {
            if (!query.trim() || query.length < 2) {
                setPlayers([])
                setShowDropdown(false)
                return
            }

            // Skip if it's a numeric FIDE ID (handled by separate effect)
            if (/^\d+$/.test(query.trim())) {
                return
            }

            setIsLoading(true)
            setSearchError(null)
            try {
                const response = await fetch(`/api/players/fide/search?q=${encodeURIComponent(query.trim())}`)

                if (!response.ok) {
                    throw new Error('Failed to search FIDE players')
                }

                const players: PlayerData[] = await response.json()
                setPlayers(players)
                setShowDropdown(true)

                if (players.length === 0) {
                    setSearchError('No players found matching your search')
                }
            } catch (error) {
                console.error('Error searching FIDE players:', error)
                setPlayers([])
                setShowDropdown(false)
                setSearchError('Failed to search FIDE database. Please try again.')
            } finally {
                setIsLoading(false)
            }
        }

        // Debounce search requests - wait 500ms after user stops typing
        const timeoutId = setTimeout(searchPlayers, 500)
        return () => clearTimeout(timeoutId)
    }, [query])

    // Check if query is a FIDE ID (numeric) and fetch player by ID
    useEffect(() => {
        const fetchPlayerById = async () => {
            if (!/^\d+$/.test(query.trim()) || query.length < 4) {
                return
            }

            setIsLoading(true)
            setSearchError(null)
            try {
                const response = await fetch(`/api/players/fide/${query.trim()}`)

                if (response.ok) {
                    const player: PlayerData = await response.json()
                    setPlayers([player])
                    setShowDropdown(true)
                } else if (response.status === 404) {
                    // Player not found
                    setPlayers([])
                    setShowDropdown(false)
                    setSearchError('FIDE ID not found')
                } else {
                    throw new Error('Failed to fetch FIDE player')
                }
            } catch (error) {
                console.error('Error fetching FIDE player by ID:', error)
                setPlayers([])
                setShowDropdown(false)
                setSearchError('Failed to fetch player data. Please try again.')
            } finally {
                setIsLoading(false)
            }
        }

        // Longer debounce for ID lookup since it's more expensive
        const timeoutId = setTimeout(fetchPlayerById, 800)
        return () => clearTimeout(timeoutId)
    }, [query])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handlePlayerSelect = (player: PlayerData) => {
        setSelectedPlayer(player)
        setQuery(player.name)
        setShowDropdown(false)
        onChange(player)
        onPlayerSelect?.(player)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value
        setQuery(newQuery)
        setSearchError(null) // Clear any previous errors

        if (!newQuery.trim()) {
            setSelectedPlayer(null)
            setPlayers([])
            setShowDropdown(false)
            onChange('')
            onPlayerSelect?.(null)
        }
    }

    const handleClear = () => {
        setQuery('')
        setSelectedPlayer(null)
        setPlayers([])
        setShowDropdown(false)
        onChange('')
        onPlayerSelect?.(null)
        inputRef.current?.focus()
    }

    return (
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    placeholder={field.placeholder || "Search by name or enter FIDE ID..."}
                    disabled={disabled}
                    className={`
                        block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm
                        placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                        ${disabled ? 'bg-gray-50 text-gray-500' : ''}
                        ${className}
                    `}
                />

                {/* Loading spinner or clear button */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
                    ) : query ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    ) : (
                        <span className="text-gray-400">🔍</span>
                    )}
                </div>
            </div>

            {/* Dropdown with search results */}
            {showDropdown && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
                >
                    {players.length > 0 ? (
                        players.map((player) => (
                            <div
                                key={player.id}
                                className="cursor-pointer select-none relative py-2 px-3 hover:bg-indigo-600 hover:text-white"
                                onClick={() => handlePlayerSelect(player)}
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">{player.name}</span>
                                    <div className="text-sm opacity-75 flex space-x-4">
                                        <span>FIDE ID: {player.id}</span>
                                        {player.std_rating && <span>Standard: {player.std_rating}</span>}
                                        {player.rapid_rating && <span>Rapid: {player.rapid_rating}</span>}
                                        {player.blitz_rating && <span>Blitz: {player.blitz_rating}</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : searchError ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                            {searchError}
                        </div>
                    ) : null}
                </div>
            )}

            {/* Show search error below input if no dropdown */}
            {searchError && !showDropdown && query.trim() && (
                <p className="mt-1 text-sm text-amber-600">{searchError}</p>
            )}

            {/* Selected player display */}
            {selectedPlayer && (
                <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h4 className="font-medium text-indigo-900">{selectedPlayer.name}</h4>
                            <div className="text-sm text-indigo-700 flex flex-wrap gap-3 mt-1">
                                <span>FIDE ID: {selectedPlayer.id}</span>
                                {selectedPlayer.std_rating && <span>Standard: {selectedPlayer.std_rating}</span>}
                                {selectedPlayer.rapid_rating && <span>Rapid: {selectedPlayer.rapid_rating}</span>}
                                {selectedPlayer.blitz_rating && <span>Blitz: {selectedPlayer.blitz_rating}</span>}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-indigo-400 hover:text-indigo-600 ml-2"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    )
}
