import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HiInformationCircle } from 'react-icons/hi2'

interface InfoPopoverProps {
    content: string
    className?: string
}

export default function InfoPopover({ content, className = '' }: InfoPopoverProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState({ top: 0, left: 0 })
    const [mounted, setMounted] = useState(false)
    const [showAbove, setShowAbove] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    // Calculate position dynamically
    const calculatePosition = () => {
        if (!buttonRef.current) return { top: 0, left: 0, showAbove: false }

        const rect = buttonRef.current.getBoundingClientRect()
        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight

        // Use viewport coordinates directly (no scroll offset needed with fixed positioning)
        let leftPos = rect.left + rect.width / 2
        const popoverWidth = 250
        const popoverHeight = 120

        // Adjust if too close to right edge
        if (leftPos + popoverWidth / 2 > windowWidth - 20) {
            leftPos = windowWidth - popoverWidth / 2 - 20
        }

        // Adjust if too close to left edge
        if (leftPos - popoverWidth / 2 < 20) {
            leftPos = popoverWidth / 2 + 20
        }

        // Calculate vertical position - prefer below, but show above if not enough space
        let topPos = rect.bottom + 8
        let isAbove = false

        // If popover would go below viewport, show it above the button instead
        if (rect.bottom + popoverHeight > windowHeight - 20) {
            topPos = rect.top - popoverHeight - 8
            isAbove = true
        }

        return {
            top: topPos,
            left: leftPos,
            showAbove: isAbove
        }
    }

    // Ensure we're mounted before rendering portal
    useEffect(() => {
        setMounted(true)
    }, [])

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isOpen) {
            const newPosition = calculatePosition()
            setPosition({ top: newPosition.top, left: newPosition.left })
            setShowAbove(newPosition.showAbove)
        }
        setIsOpen(!isOpen)
    }

    // Update position when scrolling if popover is open
    useEffect(() => {
        if (!isOpen) return

        const updatePosition = () => {
            const newPosition = calculatePosition()
            setPosition({ top: newPosition.top, left: newPosition.left })
            setShowAbove(newPosition.showAbove)
        }

        // Use requestAnimationFrame for smooth updates
        let rafId: number
        const handleScroll = () => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(updatePosition)
        }

        const handleResize = () => {
            if (rafId) cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(updatePosition)
        }

        // Update position on scroll and resize
        window.addEventListener('scroll', handleScroll, true)
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('scroll', handleScroll, true)
            window.removeEventListener('resize', handleResize)
            if (rafId) cancelAnimationFrame(rafId)
        }
    }, [isOpen])

    // Close popover when clicking outside
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                buttonRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                onMouseDown={(e) => e.stopPropagation()}
                className={`inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all cursor-pointer ${className}`}
                aria-label="More information"
                title="Click for more information"
            >
                <HiInformationCircle className="w-4 h-4" />
            </button>

            {isOpen && mounted && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-[99999] max-w-xs p-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
                    style={{
                        top: position.top,
                        left: position.left,
                        transform: 'translateX(-50%)',
                        minWidth: '250px',
                        maxWidth: '300px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}
                >
                    <div className="relative">
                        {/* Arrow - pointing up when below button, pointing down when above button */}
                        {showAbove ? (
                            // Arrow pointing down (when popover is above button)
                            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                                <div className="w-3 h-3 bg-white border-r border-b border-gray-300 transform rotate-45 shadow-sm"></div>
                            </div>
                        ) : (
                            // Arrow pointing up (when popover is below button)
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                <div className="w-3 h-3 bg-white border-l border-t border-gray-300 transform rotate-45 shadow-sm"></div>
                            </div>
                        )}
                        <div className="pt-1 leading-relaxed whitespace-pre-wrap">
                            {content}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
