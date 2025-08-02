/**
 * Cookie Consent Utility
 * Manages cookie consent state and provides helper functions
 */

import { useState, useEffect } from 'react'

export type CookieConsentStatus = 'accepted' | 'declined' | null

export class CookieConsentManager {
    private static readonly CONSENT_KEY = 'hbcc-cookie-consent'
    private static readonly CONSENT_DATE_KEY = 'hbcc-cookie-consent-date'
    private static readonly CONSENT_VERSION = '1.0'
    private static readonly CONSENT_VERSION_KEY = 'hbcc-cookie-consent-version'

    /**
     * Get the current consent status
     */
    static getConsentStatus(): CookieConsentStatus {
        if (typeof window === 'undefined') return null

        const consent = localStorage.getItem(this.CONSENT_KEY)
        const version = localStorage.getItem(this.CONSENT_VERSION_KEY)

        // If version doesn't match, require new consent
        if (version !== this.CONSENT_VERSION) {
            this.clearConsent()
            return null
        }

        return consent as CookieConsentStatus
    }

    /**
     * Set consent status
     */
    static setConsent(status: 'accepted' | 'declined'): void {
        if (typeof window === 'undefined') return

        localStorage.setItem(this.CONSENT_KEY, status)
        localStorage.setItem(this.CONSENT_DATE_KEY, new Date().toISOString())
        localStorage.setItem(this.CONSENT_VERSION_KEY, this.CONSENT_VERSION)
    }

    /**
     * Clear consent (for version updates or user request)
     */
    static clearConsent(): void {
        if (typeof window === 'undefined') return

        localStorage.removeItem(this.CONSENT_KEY)
        localStorage.removeItem(this.CONSENT_DATE_KEY)
        localStorage.removeItem(this.CONSENT_VERSION_KEY)
    }

    /**
     * Check if user has given consent
     */
    static hasConsent(): boolean {
        return this.getConsentStatus() === 'accepted'
    }

    /**
     * Get consent date
     */
    static getConsentDate(): Date | null {
        if (typeof window === 'undefined') return null

        const dateString = localStorage.getItem(this.CONSENT_DATE_KEY)
        return dateString ? new Date(dateString) : null
    }

    /**
     * Check if consent is required (no consent given or version mismatch)
     */
    static isConsentRequired(): boolean {
        return this.getConsentStatus() === null
    }

    /**
     * Get consent information for debugging/admin purposes
     */
    static getConsentInfo(): {
        status: CookieConsentStatus
        date: Date | null
        version: string | null
        isRequired: boolean
    } {
        if (typeof window === 'undefined') {
            return {
                status: null,
                date: null,
                version: null,
                isRequired: false
            }
        }

        return {
            status: this.getConsentStatus(),
            date: this.getConsentDate(),
            version: localStorage.getItem(this.CONSENT_VERSION_KEY),
            isRequired: this.isConsentRequired()
        }
    }
}

/**
 * React hook for cookie consent
 */
export function useCookieConsent() {
    const [consentStatus, setConsentStatus] = useState<CookieConsentStatus>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        setConsentStatus(CookieConsentManager.getConsentStatus())
        setIsLoading(false)
    }, [])

    const acceptConsent = () => {
        CookieConsentManager.setConsent('accepted')
        setConsentStatus('accepted')
    }

    const declineConsent = () => {
        CookieConsentManager.setConsent('declined')
        setConsentStatus('declined')
    }

    const clearConsent = () => {
        CookieConsentManager.clearConsent()
        setConsentStatus(null)
    }

    return {
        consentStatus,
        isLoading,
        hasConsent: consentStatus === 'accepted',
        isConsentRequired: consentStatus === null,
        acceptConsent,
        declineConsent,
        clearConsent,
        consentInfo: CookieConsentManager.getConsentInfo()
    }
}
