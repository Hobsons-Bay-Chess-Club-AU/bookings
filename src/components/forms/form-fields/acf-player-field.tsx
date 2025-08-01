'use client'

/**
 * ACF Player Field Component
 * 
 * A composite field that allows users to search for and select ACF-rated chess players.
 * 
 * Features:
 * - Search by player name (shows dropdown with matches)
 * - Search by ACF ID (numeric input)
 * - Displays player ratings (Standard, Rapid - no Blitz for ACF)
 * - Returns PlayerData object with id, name, and ratings
 * - Integrated with ACF API using cheerio for HTML parsing
 */

import { useState, useEffect, useRef } from 'react'
import { FormFieldProps } from './types'
import { PlayerData } from '@/lib/types/database'

interface AcfPlayerFieldProps extends FormFieldProps {
    onPlayerSelect?: (player: PlayerData | null) => void
}

export default function AcfPlayerField({ 
    field, 
    value, 
    onChange, 
    error, 
    className = '', 
    disabled = false,
    onPlayerSelect 
}: AcfPlayerFieldProps) {
    const [query, setQuery] = useState('')
    const [players, setPlayers] = useState<PlayerData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Initialize from existing value
    useEffect(() => {
        if (value && typeof value === 'object' && value.id) {
            setSelectedPlayer(value as PlayerData)
            setQuery(value.name || '')
        }
    }, [value])

    // Handle search
    useEffect(() => {
        const searchPlayers = async () => {
            if (!query.trim() || query.length < 2) {
                setPlayers([])
                return
            }

            setIsLoading(true)
            try {
                const response = await fetch(`/api/players/acf/search?q=${encodeURIComponent(query)}`)
                if (response.ok) {
                    const data = await response.json()
                    setPlayers(data.players || [])
                    setShowDropdown(true)
                } else {
                    console.error('Failed to search ACF players')
                    setPlayers([])
                }
            } catch (error) {
                console.error('Error searching ACF players:', error)
                setPlayers([])
            } finally {
                setIsLoading(false)
            }
        }

        const timeoutId = setTimeout(searchPlayers, 300)
        return () => clearTimeout(timeoutId)
    }, [query])

    // Check if query is an ACF ID
    useEffect(() => {
        const fetchPlayerById = async () => {
            // Check if query looks like an ACF ID (numeric)
            if (/^\d+$/.test(query.trim()) && query.length >= 3) {
                setIsLoading(true)
                try {
                    const response = await fetch(`/api/players/acf/${query.trim()}`)
                    if (response.ok) {
                        const player = await response.json()
                        setPlayers([player])
                        setShowDropdown(true)
                    } else {
                        // Player not found by ID, continue with search
                        setPlayers([])
                    }
                } catch (error) {
                    console.error('Error fetching ACF player by ID:', error)
                    setPlayers([])
                } finally {
                    setIsLoading(false)
                }
            }
        }

        const timeoutId = setTimeout(fetchPlayerById, 500)
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
        
        if (!newQuery.trim()) {
            setSelectedPlayer(null)
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
                    placeholder={field.placeholder || "Search by name or enter ACF ID (numeric)..."}
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
            {showDropdown && players.length > 0 && (
                <div 
                    ref={dropdownRef}
                    className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none"
                >
                    {players.map((player) => (
                        <div
                            key={player.id}
                            className="cursor-pointer select-none relative py-2 px-3 hover:bg-indigo-600 hover:text-white"
                            onClick={() => handlePlayerSelect(player)}
                        >
                            <div className="flex flex-col">
                                <span className="font-medium">{player.name}</span>
                                <div className="text-sm opacity-75 flex space-x-4">
                                    <span>ACF ID: {player.id}</span>
                                    {player.std_rating && <span>Standard: {player.std_rating}</span>}
                                    {player.rapid_rating && <span>Rapid: {player.rapid_rating}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected player display */}
            {selectedPlayer && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h4 className="font-medium text-green-900">{selectedPlayer.name}</h4>
                            <div className="text-sm text-green-700 flex flex-wrap gap-3 mt-1">
                                <span>ACF ID: {selectedPlayer.id}</span>
                                {selectedPlayer.std_rating && <span>Standard: {selectedPlayer.std_rating}</span>}
                                {selectedPlayer.rapid_rating && <span>Rapid: {selectedPlayer.rapid_rating}</span>}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-green-400 hover:text-green-600 ml-2"
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
