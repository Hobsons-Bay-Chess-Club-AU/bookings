'use client'

import Link from 'next/link'
import { HiChevronRight, HiHome } from 'react-icons/hi2'

interface BreadcrumbItem {
    label: string
    href?: string
}

interface BreadcrumbProps {
    items: BreadcrumbItem[]
    className?: string
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    return (
        <nav className={`flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
            <Link
                href="/organizer"
                className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
                <HiHome className="h-4 w-4" />
            </Link>
            
            {items.map((item, index) => (
                <div key={index} className="flex items-center">
                    <HiChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}
