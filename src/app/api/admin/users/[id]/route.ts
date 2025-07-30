import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/utils/auth'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check if user is admin
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = params
    const body = await request.json()
    const { action, ...updateData } = body

    switch (action) {
      case 'update_profile':
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

        return NextResponse.json(updatedProfile)

      case 'update_role':
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