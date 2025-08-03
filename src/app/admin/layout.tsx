import AdminLayout from '@/components/layout/admin-layout'
import { ReactNode } from 'react'

interface AdminRouteLayoutProps {
    children: ReactNode
}

export default function AdminRouteLayout({ children }: AdminRouteLayoutProps) {
    return (
        <AdminLayout requiredRole="admin">
            {children}
        </AdminLayout>
    )
}
