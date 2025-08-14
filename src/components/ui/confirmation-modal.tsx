'use client'

import React, { useState, useEffect } from 'react'
import { HiExclamationTriangle } from 'react-icons/hi2'

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string | React.ReactNode
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info'
    loading?: boolean
    confirmDisabled?: boolean
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false,
    confirmDisabled = false
}: ConfirmationModalProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!isVisible) return null

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: 'text-red-600 dark:text-red-400',
                    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600',
                    border: 'border-red-200 dark:border-red-800',
                    iconBg: 'bg-red-100 dark:bg-red-900/30'
                }
            case 'warning':
                return {
                    icon: 'text-yellow-600 dark:text-yellow-400',
                    button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600',
                    border: 'border-yellow-200 dark:border-yellow-800',
                    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30'
                }
            case 'info':
                return {
                    icon: 'text-blue-600 dark:text-blue-400',
                    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
                    border: 'border-blue-200 dark:border-blue-800',
                    iconBg: 'bg-blue-100 dark:bg-blue-900/30'
                }
            default:
                return {
                    icon: 'text-red-600 dark:text-red-400',
                    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600',
                    border: 'border-red-200 dark:border-red-800',
                    iconBg: 'bg-red-100 dark:bg-red-900/30'
                }
        }
    }

    const styles = getVariantStyles()

    const handleConfirm = () => {
        if (!loading) {
            onConfirm()
        }
    }

    const handleClose = () => {
        if (!loading) {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                {/* Backdrop */}
                <div 
                    className={`fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity ${
                        isOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={handleClose}
                />

                {/* Modal */}
                <div 
                    className={`relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg ${
                        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
                >
                    <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                                <HiExclamationTriangle className={`h-6 w-6 ${styles.icon}`} />
                            </div>
                            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    {typeof message === 'string' ? (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {message}
                                        </p>
                                    ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={`bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 ${styles.border}`}>
                        <button
                            type="button"
                            className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto ${styles.button} ${
                                (loading || confirmDisabled) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={handleConfirm}
                            disabled={loading || confirmDisabled}
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Processing...
                                </div>
                            ) : (
                                confirmText
                            )}
                        </button>
                        <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
} 