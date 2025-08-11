import { format } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

// Common timezone options for Australia
export const TIMEZONE_OPTIONS = [
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
  { value: 'Australia/ACT', label: 'Canberra (AEST/AEDT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
]

// Default timezone
export const DEFAULT_TIMEZONE = 'Australia/Melbourne'

/**
 * Format a date in a specific timezone
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  formatString: string = 'PPP p'
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return formatInTimeZone(dateObj, timezone, formatString)
  } catch (error) {
    console.error('Error formatting date in timezone:', error)
    // Fallback to local formatting
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, formatString)
  }
}

/**
 * Format a date range in a specific timezone
 */
export function formatDateRangeInTimezone(
  startDate: Date | string,
  endDate: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    
    const startFormatted = formatInTimeZone(start, timezone, 'PPP p')
    const endFormatted = formatInTimeZone(end, timezone, 'PPP p')
    
    return `${startFormatted} - ${endFormatted}`
  } catch (error) {
    console.error('Error formatting date range in timezone:', error)
    // Fallback to local formatting
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    return `${format(start, 'PPP p')} - ${format(end, 'PPP p')}`
  }
}

/**
 * Convert a local date to UTC for storage
 */
export function localToUTC(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  try {
    // For date-fns-tz v3, we need to use a different approach
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
    return utcDate
  } catch (error) {
    console.error('Error converting local to UTC:', error)
    return date
  }
}

/**
 * Convert UTC date to local timezone
 */
export function utcToLocal(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  try {
    return toZonedTime(date, timezone)
  } catch (error) {
    console.error('Error converting UTC to local:', error)
    return date
  }
}

/**
 * Get timezone abbreviation (e.g., AEST, AEDT)
 */
export function getTimezoneAbbreviation(timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const now = new Date()
    const formatted = formatInTimeZone(now, timezone, 'zzz')
    return formatted
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error)
    return 'UTC'
  }
}

/**
 * Format date for display with timezone info
 */
export function formatWithTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  includeTimezone: boolean = true
): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const formatted = formatInTimeZone(dateObj, timezone, 'PPP p')
    
    if (includeTimezone) {
      const tzAbbr = getTimezoneAbbreviation(timezone)
      return `${formatted} ${tzAbbr}`
    }
    
    return formatted
  } catch (error) {
    console.error('Error formatting with timezone:', error)
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'PPP p')
  }
}

/**
 * Get timezone offset in hours
 */
export function getTimezoneOffset(timezone: string = DEFAULT_TIMEZONE): number {
  try {
    const now = new Date()
    const utc = formatInTimeZone(now, 'UTC', 'yyyy-MM-dd HH:mm:ss')
    const local = formatInTimeZone(now, timezone, 'yyyy-MM-dd HH:mm:ss')
    
    const utcDate = new Date(utc)
    const localDate = new Date(local)
    
    return (localDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
  } catch (error) {
    console.error('Error getting timezone offset:', error)
    return 0
  }
}

/**
 * Validate if a timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Try to format a date in the timezone
    formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd HH:mm:ss')
    return true
  } catch {
    return false
  }
}

/**
 * Get timezone display name
 */
export function getTimezoneDisplayName(timezone: string): string {
  const option = TIMEZONE_OPTIONS.find(opt => opt.value === timezone)
  return option ? option.label : timezone
}
