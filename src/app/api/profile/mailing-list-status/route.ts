import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/utils/auth'

export async function GET() {
    try {
        const profile = await getCurrentProfile()
        
        if (!profile) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const supabase = await createClient()

        // Check if user is subscribed to mailing list
        const { data: mailingListEntry, error } = await supabase
            .from('mailing_list')
            .select('id, status, created_at')
            .eq('email', profile.email)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error checking mailing list status:', error)
            return NextResponse.json(
                { error: 'Failed to check mailing list status' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            isSubscribed: mailingListEntry?.status === 'subscribed',
            status: mailingListEntry?.status || 'not_subscribed',
            subscribedAt: mailingListEntry?.created_at || null
        })

    } catch (error) {
        console.error('Error in mailing list status API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const profile = await getCurrentProfile()
        
        if (!profile) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { action } = await request.json()

        if (!['subscribe', 'unsubscribe'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Must be "subscribe" or "unsubscribe"' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        if (action === 'subscribe') {
            // Check if user already exists in mailing list
            const { data: existingEntry, error: checkError } = await supabase
                .from('mailing_list')
                .select('id, status')
                .eq('email', profile.email)
                .single()

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking existing mailing list entry:', checkError)
                return NextResponse.json(
                    { error: 'Failed to check mailing list status' },
                    { status: 500 }
                )
            }

            if (existingEntry) {
                // Update existing entry to subscribed
                const { error: updateError } = await supabase
                    .from('mailing_list')
                    .update({
                        status: 'subscribed',
                        unsubscribe_reason: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('email', profile.email)

                if (updateError) {
                    console.error('Error updating mailing list subscription:', updateError)
                    return NextResponse.json(
                        { error: 'Failed to subscribe to mailing list' },
                        { status: 500 }
                    )
                }
            } else {
                // Create new mailing list entry
                const { error: insertError } = await supabase
                    .from('mailing_list')
                    .insert({
                        email: profile.email,
                        status: 'subscribed',
                        filter_event: ['all']
                    })

                if (insertError) {
                    console.error('Error creating mailing list subscription:', insertError)
                    return NextResponse.json(
                        { error: 'Failed to subscribe to mailing list' },
                        { status: 500 }
                    )
                }
            }

            return NextResponse.json({
                success: true,
                message: 'Successfully subscribed to mailing list'
            })
        } else {
            // Unsubscribe action
            const { error: updateError } = await supabase
                .from('mailing_list')
                .update({
                    status: 'unsubscribed',
                    unsubscribe_reason: 'User unsubscribed from profile page',
                    updated_at: new Date().toISOString()
                })
                .eq('email', profile.email)

            if (updateError) {
                console.error('Error unsubscribing from mailing list:', updateError)
                return NextResponse.json(
                    { error: 'Failed to unsubscribe from mailing list' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                message: 'Successfully unsubscribed from mailing list'
            })
        }

    } catch (error) {
        console.error('Error in mailing list subscription API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
