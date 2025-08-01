# Site Navigation Implementation

## Overview

This document outlines the implementation of the new `SiteNav` component that provides consistent navigation across public-facing pages in the HBCC Booking System.

## Components Created

### 1. SiteNav Component (`/src/components/layout/site-nav.tsx`)

A comprehensive navigation component that provides:

#### Features
- **Responsive Design**: Works on mobile and desktop
- **User Authentication Status**: Different menus for authenticated vs anonymous users
- **Role-Based Navigation**: Shows different menu items based on user role (user/organizer/admin)
- **Profile Dropdown**: Clean dropdown menu with user-specific actions
- **Loading States**: Proper loading indicators while checking auth status
- **Click Outside to Close**: Dropdown closes when clicking outside

#### Props
```tsx
interface SiteNavProps {
  className?: string     // Additional CSS classes
  showTitle?: boolean   // Whether to show the site title (default: true)
}
```

#### User States
1. **Anonymous Users**: See "Events", "Sign in", "Sign up"
2. **Authenticated Users**: See "Events", "Dashboard", and Profile dropdown
3. **Organizers**: Additional "Management" section in dropdown with "Manage Events", "Custom Fields"
4. **Admins**: All organizer features plus "Administration" section with "Manage Users"

## Pages Updated

### 1. Home Page (`/src/app/page.tsx`)
- Replaced `Header` with `SiteNav`
- Shows full site title and navigation

### 2. Dashboard Page (`/src/app/dashboard/page.tsx`)
- Replaced custom header with `SiteNav` (without title)
- Added separate page header section
- Removed redundant navigation buttons (now in dropdown)

### 3. Event Details Page (`/src/app/events/[id]/page.tsx`)
- Replaced custom header with `SiteNav`
- Added breadcrumb navigation
- Maintained "Back to Events" functionality

### 4. Profile Page (`/src/app/profile/page.tsx`)
- Replaced custom header with `SiteNav` (without title)
- Added separate page header section
- Removed redundant logout button (now in dropdown)

## Navigation Structure

```
┌─ Public Users ─┐        ┌─ Authenticated Users ─┐
│ Events         │        │ Events                 │
│ Sign in        │   →    │ Dashboard              │
│ Sign up        │        │ [User Name] ▼         │
└────────────────┘        └────────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │ Profile Settings    │
                          │ ─────────────────── │
                          │ Management          │ ← Organizer+
                          │ • Manage Events     │
                          │ • Custom Fields     │
                          │ ─────────────────── │
                          │ Administration      │ ← Admin only
                          │ • Manage Users      │
                          │ ─────────────────── │
                          │ Sign out            │
                          └─────────────────────┘
```

## Usage Examples

### Basic Usage
```tsx
import SiteNav from '@/components/layout/site-nav'

export default function MyPage() {
  return (
    <div>
      <SiteNav />
      {/* Page content */}
    </div>
  )
}
```

### Without Site Title
```tsx
<SiteNav showTitle={false} />
```

### With Custom Styling
```tsx
<SiteNav className="border-b-2 border-indigo-500" />
```

## Design Decisions

1. **Profile Dropdown**: Keeps the top navigation clean while providing access to all user actions
2. **Role-Based Menus**: Progressive disclosure - users only see what they have access to
3. **Consistent Styling**: Uses same design tokens as existing components
4. **Loading States**: Prevents flash of incorrect content while checking auth status
5. **Accessibility**: Proper ARIA labels, keyboard navigation, and semantic markup

## Benefits

1. **Consistency**: All public pages now have the same navigation structure
2. **Maintainability**: Single component to update navigation across the app
3. **User Experience**: Clean, intuitive navigation with role-appropriate options
4. **Responsive**: Works well on all device sizes
5. **Future-Proof**: Easy to add new navigation items or modify existing ones

## Future Enhancements

- Add notification badges for admins/organizers
- Implement keyboard shortcuts for common actions
- Add search functionality to the navigation
- Support for custom themes/branding

## Integration Notes

The `SiteNav` component is designed to replace custom headers in public-facing pages. For admin-specific pages, a separate `AdminNav` component should be created following the same patterns.
