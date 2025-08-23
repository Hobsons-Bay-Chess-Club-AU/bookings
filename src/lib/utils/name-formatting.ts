/**
 * Utility functions for formatting participant names
 */

/**
 * Formats a participant's full name, including middle name if available
 * @param participant - The participant object with name fields
 * @returns Formatted full name string
 */
export function formatParticipantName(participant: {
    first_name: string
    middle_name?: string
    last_name: string
}): string {
    const { first_name, middle_name, last_name } = participant
    
    if (middle_name && middle_name.trim()) {
        return `${first_name} ${middle_name} ${last_name}`.trim()
    }
    
    return `${first_name} ${last_name}`.trim()
}

/**
 * Formats a participant's initials for display (e.g., for avatars)
 * @param participant - The participant object with name fields
 * @returns Formatted initials string
 */
export function formatParticipantInitials(participant: {
    first_name: string
    middle_name?: string
    last_name: string
}): string {
    const { first_name, middle_name, last_name } = participant
    
    const firstInitial = first_name.charAt(0).toUpperCase()
    const lastInitial = last_name.charAt(0).toUpperCase()
    
    if (middle_name && middle_name.trim()) {
        const middleInitial = middle_name.charAt(0).toUpperCase()
        return `${firstInitial}${middleInitial}${lastInitial}`
    }
    
    return `${firstInitial}${lastInitial}`
}
