import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface ActionMenuProps {
    align?: 'right' | 'left'
    widthClass?: string
    className?: string
    menuClassName?: string
    closeOnMenuClick?: boolean
    strategy?: 'auto' | 'fixed'
    groupId?: string
    trigger: (opts: { open: boolean; toggle: () => void; buttonProps: React.ComponentPropsWithoutRef<'button'> & { ref: React.Ref<HTMLButtonElement> } }) => React.ReactNode
    children: React.ReactNode
}

/**
 * ActionMenu: A responsive dropdown menu that supports desktop (fixed-position) and mobile (anchored) rendering.
 * - The parent supplies the trigger and the menu content (children).
 * - This component handles open/close behavior, click-outside, escape key, and positioning.
 */
export default function ActionMenu({
    align = 'right',
    widthClass = 'w-48',
    className = '',
    menuClassName = '',
    closeOnMenuClick = true,
    strategy = 'auto',
    groupId = 'default',
    trigger,
    children,
}: ActionMenuProps) {
    const [open, setOpen] = useState(false)
    const [desktopPos, setDesktopPos] = useState<{ top: number; left: number } | null>(null)
    const anchorRef = useRef<HTMLButtonElement | null>(null)
    const desktopMenuRef = useRef<HTMLDivElement | null>(null)
    const mobileMenuRef = useRef<HTMLDivElement | null>(null)
    const instanceIdRef = useRef<string>('')
    if (!instanceIdRef.current) {
        const g = (typeof globalThis !== 'undefined' ? (globalThis as unknown as { crypto?: { randomUUID?: () => string } }) : {})
        const rand = g.crypto?.randomUUID ? g.crypto.randomUUID() : `am-${Math.random().toString(36).slice(2)}`
        instanceIdRef.current = rand
    }

    const toggle = useCallback(() => {
        setOpen(prev => {
            const next = !prev
            if (next && typeof window !== 'undefined') {
                const eventName = `action-menu:open:${groupId}`
                const ev: CustomEvent<{ instanceId: string }> = new CustomEvent(eventName, {
                    detail: { instanceId: instanceIdRef.current }
                })
                window.dispatchEvent(ev)
            }
            return next
        })
    }, [groupId])
    const close = useCallback(() => setOpen(false), [])

    const isDesktop = useMemo(() => {
        if (typeof window === 'undefined') return true
        return window.matchMedia('(min-width: 1024px)').matches
    }, [])

    // Compute desktop fixed position near trigger
    const computeDesktopPosition = useCallback(() => {
        if (!anchorRef.current) return
        const rect = anchorRef.current.getBoundingClientRect()
        // Initial placement directly below the trigger; we will correct after measuring actual menu height
        const left = align === 'right' ? rect.right : rect.left
        const top = rect.bottom + 8
        setDesktopPos({ top, left })
    }, [align])

    // Recalculate position on open and on viewport changes
    useEffect(() => {
        if (!open) return
        if (strategy === 'fixed' || isDesktop) computeDesktopPosition()
        const handleWindowChange = () => close()
        window.addEventListener('scroll', handleWindowChange, true)
        window.addEventListener('resize', handleWindowChange)
        return () => {
            window.removeEventListener('scroll', handleWindowChange, true)
            window.removeEventListener('resize', handleWindowChange)
        }
    }, [open, isDesktop, computeDesktopPosition, close, strategy])

    // After render, measure actual menu height to avoid using an assumed height and correct vertical position if needed
    useEffect(() => {
        if (!open) return
        // Only relevant when rendering the fixed menu
        if (!(strategy === 'fixed' || isDesktop)) return
        requestAnimationFrame(() => {
            if (!anchorRef.current || !desktopMenuRef.current) return
            const rect = anchorRef.current.getBoundingClientRect()
            const menuEl = desktopMenuRef.current
            const menuHeight = menuEl.offsetHeight
            const viewportPadding = 8
            let top = rect.bottom + 8
            if (top + menuHeight > window.innerHeight - viewportPadding) {
                top = Math.max(viewportPadding, rect.top - menuHeight - 8)
            }
            const left = align === 'right' ? rect.right : rect.left
            setDesktopPos({ top, left })
        })
    }, [open, isDesktop, strategy, align])

    // Click outside to close
    useEffect(() => {
        if (!open) return
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            if (
                anchorRef.current && anchorRef.current.contains(target)
            ) return
            if (
                (desktopMenuRef.current && desktopMenuRef.current.contains(target)) ||
                (mobileMenuRef.current && mobileMenuRef.current.contains(target))
            ) return
            close()
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open, close])

    // Escape to close
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [open, close])

    // Ensure only one ActionMenu is open at a time per groupId
    useEffect(() => {
        const eventName = `action-menu:open:${groupId}`
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ instanceId: string }>
            if (ce.detail?.instanceId && ce.detail.instanceId !== instanceIdRef.current) {
                setOpen(false)
            }
        }
        window.addEventListener(eventName, handler)
        return () => window.removeEventListener(eventName, handler)
    }, [groupId])

    const handleMenuClickCapture: React.MouseEventHandler<HTMLDivElement> = useCallback(() => {
        if (!closeOnMenuClick) return
        // If any click inside menu, close it after event finishes
        // Allow consumer handlers to run first
        setTimeout(() => close(), 0)
    }, [closeOnMenuClick, close])

    const commonMenuClasses = `bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 ${widthClass} ${menuClassName}`

    const setAnchorRef = (el: HTMLButtonElement | null) => {
        anchorRef.current = el
    }

    const buttonProps: React.ComponentPropsWithoutRef<'button'> & { ref: React.Ref<HTMLButtonElement> } = {
        onClick: (e) => {
            e.stopPropagation()
            toggle()
        },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        ref: setAnchorRef,
    }


    return (
        <div className={`relative inline-block ${className}`}>
            {trigger({ open, toggle, buttonProps })}

            {/* Fixed-position menu (used on desktop or when strategy === 'fixed') */}
            {open && (strategy === 'fixed' ? desktopPos : (isDesktop && desktopPos)) && desktopPos && (
                <div
                    ref={desktopMenuRef}
                    style={{ position: 'fixed', top: desktopPos.top, left: desktopPos.left, transform: align === 'right' ? 'translateX(-100%)' : undefined }}
                    className={`${commonMenuClasses} z-[9999] ${strategy === 'fixed' ? '' : 'hidden lg:block'}`}
                    onClickCapture={handleMenuClickCapture}
                >
                    <div className="py-1">
                        {children}
                    </div>
                </div>
            )}

            {/* Mobile menu (anchored under trigger) - auto strategy only */}
            {open && strategy === 'auto' && !isDesktop && (
                <div
                    ref={mobileMenuRef}
                    className={`${commonMenuClasses} absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 z-50 lg:hidden`}
                    onClickCapture={handleMenuClickCapture}
                >
                    <div className="py-1">
                        {children}
                    </div>
                </div>
            )}
        </div>
    )
}


