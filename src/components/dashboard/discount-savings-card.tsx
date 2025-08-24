'use client'

import { useState, useEffect } from 'react'
import { HiCurrencyDollar, HiSparkles } from 'react-icons/hi2'

interface DiscountSavingsData {
    totalSavings: number
    totalSpent: number
    totalPaid: number
    discountCount: number
    year: number
}

export default function DiscountSavingsCard() {
    const [savingsData, setSavingsData] = useState<DiscountSavingsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchSavingsData = async () => {
            try {
                setLoading(true)
                const response = await fetch('/api/dashboard/discount-savings')
                
                if (!response.ok) {
                    throw new Error('Failed to fetch discount savings data')
                }
                
                const data = await response.json()
                setSavingsData(data)
            } catch (err) {
                console.error('Error fetching discount savings:', err)
                setError('Failed to load discount savings')
            } finally {
                setLoading(false)
            }
        }

        fetchSavingsData()
    }, [])

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-green-200 dark:bg-green-700 rounded w-1/3 mb-2"></div>
                    <div className="h-8 bg-green-200 dark:bg-green-700 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-green-200 dark:bg-green-700 rounded w-2/3"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
                <div className="text-center text-green-600 dark:text-green-400">
                    <HiCurrencyDollar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Unable to load savings data</p>
                </div>
            </div>
        )
    }

    if (!savingsData || savingsData.totalSavings === 0) {
        return null
    }

    const savingsPercentage = savingsData.totalSpent > 0 
        ? ((savingsData.totalSavings / savingsData.totalSpent) * 100).toFixed(1)
        : '0.0'

    return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
            <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                    <HiSparkles className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                        Your Savings
                    </h3>
                </div>
                
                <p className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1">
                    ${savingsData.totalSavings.toFixed(2)}
                </p>
                
                <p className="text-sm text-green-600 dark:text-green-400 mb-3">
                    {savingsPercentage}% savings in {savingsData.year}
                </p>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="text-center">
                        <p className="text-green-700 dark:text-green-300 font-medium">
                            Total Spent
                        </p>
                        <p className="text-green-900 dark:text-green-100 font-semibold">
                            ${savingsData.totalSpent.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-green-700 dark:text-green-300 font-medium">
                            Discounts Used
                        </p>
                        <p className="text-green-900 dark:text-green-100 font-semibold">
                            {savingsData.discountCount}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
