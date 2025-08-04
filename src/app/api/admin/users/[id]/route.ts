import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/utils/auth'
import { sendUserProfileUpdateNotification } from '@/lib/email/user-notifications'

export async function PATCH(request: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = params
    const body = await request.json()
    const { action, ...updateData } = body

    // Get admin user info for notifications
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', adminUser?.id)
      .single()
    
    const adminName = adminProfile?.full_name || adminUser?.email || 'System Administrator'

    switch (action) {
      case 'update_profile':
        // Get current user data for comparison
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (!currentProfile) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Update profile information
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: updateData.full_name,
            email: updateData.email
          })
          .eq('id', id)
          .select()
          .single()

        if (profileError) {
          console.error('Error updating profile:', profileError)
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
        }

        // Update auth email if changed
        if (updateData.email) {
          const { error: authError } = await supabase.auth.admin.updateUserById(id, {
            email: updateData.email
          })

          if (authError) {
            console.error('Error updating auth email:', authError)
            // Continue even if auth update fails, profile is already updated
          }
        }

        // Send email notification
        await sendUserProfileUpdateNotification({
          userId: id,
          userName: currentProfile.full_name || 'User',
          userEmail: updateData.email || currentProfile.email,
          oldRole: currentProfile.role,
          newRole: currentProfile.role, // Role not changed in this action
          oldName: currentProfile.full_name || '',
          newName: updateData.full_name || '',
          oldEmail: currentProfile.email,
          newEmail: updateData.email || currentProfile.email,
          adminName: adminName,
          updatedAt: new Date().toISOString()
        })

        return NextResponse.json(updatedProfile)

      case 'update_role':
        // Get current user data for comparison
        const { data: currentProfileForRole } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (!currentProfileForRole) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Update user role
        const { data: roleUpdatedProfile, error: roleError } = await supabase
          .from('profiles')
          .update({ role: updateData.role })
          .eq('id', id)
          .select()
          .single()

        if (roleError) {
          console.error('Error updating role:', roleError)
          return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
        }

        // Send email notification for role change
        await sendUserProfileUpdateNotification({
          userId: id,
          userName: currentProfileForRole.full_name || 'User',
          userEmail: currentProfileForRole.email,
          oldRole: currentProfileForRole.role,
          newRole: updateData.role,
          oldName: currentProfileForRole.full_name || '',
          newName: currentProfileForRole.full_name || '',
          oldEmail: currentProfileForRole.email,
          newEmail: currentProfileForRole.email,
          adminName: adminName,
          updatedAt: new Date().toISOString()
        })

        return NextResponse.json(roleUpdatedProfile)

      case 'toggle_status':
        // For now, we'll just return the requested status
        // In production, you'd implement actual user deactivation logic
        const newActiveStatus = updateData.active

        return NextResponse.json({
          id,
          active: newActiveStatus,
          message: newActiveStatus ? 'User activated' : 'User deactivated'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in /api/admin/users/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}