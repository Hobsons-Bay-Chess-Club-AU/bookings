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
    const buttonRef = useRef<HTMLButtonElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    // Ensure we're mounted before rendering portal
    useEffect(() => {
        setMounted(true)
    }, [])

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
            const windowWidth = window.innerWidth
            
            // Calculate left position, ensuring it doesn't go off-screen
            let leftPos = rect.left + scrollLeft + rect.width / 2
            const popoverWidth = 200 // Approximate popover width
            
            // Adjust if too close to right edge
            if (leftPos + popoverWidth / 2 > windowWidth - 20) {
                leftPos = windowWidth - popoverWidth / 2 - 20
            }
            
            // Adjust if too close to left edge
            if (leftPos - popoverWidth / 2 < 20) {
                leftPos = popoverWidth / 2 + 20
            }

            setPosition({
                top: rect.bottom + scrollTop + 8,
                left: leftPos
            })
        }
        setIsOpen(!isOpen)
    }

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
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
                    className="fixed z-[9999] max-w-xs p-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
                    style={{
                        top: position.top,
                        left: position.left,
                        transform: 'translateX(-50%)',
                        minWidth: '200px'
                    }}
                >
                    <div className="relative">
                        {/* Arrow pointing up */}
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <div className="w-3 h-3 bg-white border-l border-t border-gray-300 transform rotate-45 shadow-sm"></div>
                        </div>
                        <div className="pt-1 leading-relaxed">
                            {content}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
