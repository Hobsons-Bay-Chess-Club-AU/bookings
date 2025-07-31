import { useState, useRef, useEffect } from 'react'

interface InfoPopoverProps {
  content: string
  className?: string
}

export default function InfoPopover({ content, className = '' }: InfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
      
      setPosition({
        top: rect.bottom + scrollTop + 4,
        left: rect.left + scrollLeft
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
        className={`inline-flex items-center justify-center w-4 h-4 ml-1 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${className}`}
        aria-label="More information"
      >
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed z-50 max-w-sm p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="relative">
            {content}
            {/* Arrow pointing up */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full">
              <div className="w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
