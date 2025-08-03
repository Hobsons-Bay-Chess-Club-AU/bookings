import AdminLayout from '@/components/layout/admin-layout'
import { ReactNode } from 'react'

interface OrganizerRouteLayoutProps {
    children: ReactNode
}

export default function OrganizerRouteLayout({ children }: OrganizerRouteLayoutProps) {
    return (
        <AdminLayout requiredRole="organizer">
            {children}
        </AdminLayout>
    )
}
