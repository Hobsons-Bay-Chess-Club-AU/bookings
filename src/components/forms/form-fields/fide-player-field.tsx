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
        const pvalue = value as PlayerData
        if (pvalue && typeof pvalue === 'object' && pvalue.id) {
            setSelectedPlayer(value as PlayerData)
            setQuery(pvalue.name || '')
        } else {
            // Clear state when value is null/undefined (switching participants)
            setSelectedPlayer(null)
            setQuery('')
            setPlayers([])
            setShowDropdown(false)
            setSearchError(null)
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
                const response = await fetch(`/api/players/fide/search?q=${encodeURIComponent(query)}`)

                if (response.ok) {
                    const data = await response.json()
                    setPlayers(data.players || [])
                    setShowDropdown(true)
                    
                    if (data.players?.length === 0) {
                        setSearchError('No players found matching your search')
                    }
                } else {
                    throw new Error('Failed to search FIDE players')
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

        const timeoutId = setTimeout(searchPlayers, 300)
        return () => clearTimeout(timeoutId)
    }, [query])

    // Handle FIDE ID lookup
    useEffect(() => {
        const fetchPlayerById = async () => {
            // Check if query looks like a FIDE ID (numeric)
            if (/^\d+$/.test(query.trim()) && query.length >= 3) {
                setIsLoading(true)
                setSearchError(null)
                try {
                    const response = await fetch(`/api/players/fide/${query.trim()}`)
                    if (response.ok) {
                        const player = await response.json()
                        setPlayers([player])
                        setShowDropdown(true)
                    } else {
                        // Player not found by ID
                        setPlayers([])
                        setShowDropdown(false)
                        setSearchError('FIDE ID not found')
                    }
                } catch (error) {
                    console.error('Error fetching FIDE player by ID:', error)
                    setPlayers([])
                    setShowDropdown(false)
                    setSearchError('Failed to fetch player data')
                } finally {
                    setIsLoading(false)
                }
            }
        }

        if (query.trim()) {
            fetchPlayerById()
        }
    }, [query])

    // Handle click outside to close dropdown
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
        setSearchError(null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange(player as unknown as any)
        onPlayerSelect?.(player)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value
        setQuery(newQuery)
        setSearchError(null)

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
        setSearchError(null)
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
                        block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                        ${error ? 'border-red-300 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400' : ''}
                        ${disabled ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
                        ${className}
                    `}
                />

                {/* Loading spinner or clear button */}
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent" />
                    ) : query ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            ✕
                        </button>
                    ) : (
                        <span className="text-gray-400 dark:text-gray-500">🔍</span>
                    )}
                </div>
            </div>

            {/* Dropdown with search results */}
            {showDropdown && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 dark:ring-gray-600 overflow-auto focus:outline-none border border-gray-300 dark:border-gray-600"
                >
                    {players.length > 0 ? (
                        players.map((player) => (
                            <div
                                key={player.id}
                                className="cursor-pointer select-none relative py-2 px-3 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white"
                                onClick={() => handlePlayerSelect(player)}
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{player.name}</span>
                                    <div className="text-sm opacity-75 flex space-x-4 text-gray-600 dark:text-gray-400">
                                        <span>FIDE ID: {player.id}</span>
                                        {player.std_rating && <span>Standard: {player.std_rating}</span>}
                                        {player.rapid_rating && <span>Rapid: {player.rapid_rating}</span>}
                                        {player.blitz_rating && <span>Blitz: {player.blitz_rating}</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : searchError ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {searchError}
                        </div>
                    ) : null}
                </div>
            )}

            {/* Show search error below input if no dropdown */}
            {searchError && !showDropdown && query.trim() && (
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{searchError}</p>
            )}

            {/* Selected player display */}
            {selectedPlayer && (
                <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h4 className="font-medium text-indigo-900 dark:text-indigo-100">{selectedPlayer.name}</h4>
                            <div className="text-sm text-indigo-700 dark:text-indigo-300 flex flex-wrap gap-3 mt-1">
                                <span>FIDE ID: {selectedPlayer.id}</span>
                                {selectedPlayer.std_rating && <span>Standard: {selectedPlayer.std_rating}</span>}
                                {selectedPlayer.rapid_rating && <span>Rapid: {selectedPlayer.rapid_rating}</span>}
                                {selectedPlayer.blitz_rating && <span>Blitz: {selectedPlayer.blitz_rating}</span>}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 ml-2"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    )
}
