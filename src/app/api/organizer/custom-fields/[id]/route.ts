import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile(supabase)

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const fieldId = params.id

        const { data: customField, error } = await supabase
            .from('custom_fields')
            .select('*')
            .eq('id', fieldId)
            .or(`organizer_id.eq.${profile.id},is_global.eq.true`)
            .single()

        if (error || !customField) {
            return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
        }

        return NextResponse.json(customField)
    } catch (error) {
        console.error('Error in GET /api/organizer/custom-fields/[id]:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile(supabase)

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (profile.role !== 'organizer' && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const fieldId = params.id
        const body = await request.json()
        const {
            name,
            label,
            description,
            type,
            required,
            options,
            validation,
            placeholder
        } = body

        // Validate required fields
        if (!name || !label || !type) {
            return NextResponse.json({ 
                error: 'Name, label, and type are required' 
            }, { status: 400 })
        }

        // Check if field exists and user can edit it
        const { data: existingField, error: fetchError } = await supabase
            .from('custom_fields')
            .select('*')
            .eq('id', fieldId)
            .single()

        if (fetchError || !existingField) {
            return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
        }

        // Check permissions
        const canEdit = existingField.organizer_id === profile.id || 
                       (existingField.is_global && profile.role === 'admin')

        if (!canEdit) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        // Check for duplicate names (excluding current field)
        if (name !== existingField.name) {
            const { data: duplicate, error: checkError } = await supabase
                .from('custom_fields')
                .select('id')
                .eq('organizer_id', profile.id)
                .eq('name', name)
                .neq('id', fieldId)
                .single()

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking for duplicate:', checkError)
                return NextResponse.json({ error: 'Failed to validate field name' }, { status: 500 })
            }

            if (duplicate) {
                return NextResponse.json({ 
                    error: 'A field with this name already exists' 
                }, { status: 400 })
            }
        }

        // Update the custom field
        const { data: updatedField, error: updateError } = await supabase
            .from('custom_fields')
            .update({
                name,
                label,
                description,
                type,
                required: !!required,
                options: options || null,
                validation: validation || null,
                placeholder: placeholder || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', fieldId)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating custom field:', updateError)
            return NextResponse.json({ error: 'Failed to update custom field' }, { status: 500 })
        }

        return NextResponse.json(updatedField)
    } catch (error) {
        console.error('Error in PUT /api/organizer/custom-fields/[id]:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const profile = await getCurrentProfile(supabase)

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (profile.role !== 'organizer' && profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const fieldId = params.id

        // Check if field exists and user can delete it
        const { data: existingField, error: fetchError } = await supabase
            .from('custom_fields')
            .select('*')
            .eq('id', fieldId)
            .single()

        if (fetchError || !existingField) {
            return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
        }

        // Check permissions
        const canDelete = existingField.organizer_id === profile.id || 
                         (existingField.is_global && profile.role === 'admin')

        if (!canDelete) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        // Delete the custom field
        const { error: deleteError } = await supabase
            .from('custom_fields')
            .delete()
            .eq('id', fieldId)

        if (deleteError) {
            console.error('Error deleting custom field:', deleteError)
            return NextResponse.json({ error: 'Failed to delete custom field' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /api/organizer/custom-fields/[id]:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}