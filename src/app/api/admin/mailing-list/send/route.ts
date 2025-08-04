import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/service'

export async function POST(request: NextRequest) {
    try {
        const { subject, body } = await request.json()

        if (!subject || !body) {
            return NextResponse.json(
                { error: 'Subject and body are required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Check if user is authenticated and is an organizer/admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'organizer' && profile.role !== 'admin')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get all subscribed emails
        const { data: subscribers, error: fetchError } = await supabase
            .from('mailing_list')
            .select('email, unsubscribe_code')
            .eq('status', 'subscribed')

        if (fetchError) {
            console.error('Error fetching subscribers:', fetchError)
            return NextResponse.json(
                { error: 'Failed to fetch subscribers' },
                { status: 500 }
            )
        }

        if (!subscribers || subscribers.length === 0) {
            return NextResponse.json(
                { error: 'No subscribers found' },
                { status: 400 }
            )
        }

        // Send emails to all subscribers
        const emailPromises = subscribers.map(async (subscriber) => {
            const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?code=${subscriber.unsubscribe_code}`
            
            const emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                        <h1 style="color: #333; margin: 0;">Event Updates</h1>
                    </div>
                    
                    <div style="padding: 20px; background-color: white;">
                        <div style="margin-bottom: 20px;">
                            ${body.replace(/\n/g, '<br>')}
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                            <p>You received this email because you subscribed to our mailing list.</p>
                            <p>
                                <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
                                    Unsubscribe from this mailing list
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            `

            try {
                await sendEmail({
                    to: subscriber.email,
                    subject: subject,
                    html: emailContent
                })
                return { success: true, email: subscriber.email }
            } catch (error) {
                console.error(`Failed to send email to ${subscriber.email}:`, error)
                return { success: false, email: subscriber.email, error }
            }
        })

        const results = await Promise.allSettled(emailPromises)
        
        const successful = results.filter(result => 
            result.status === 'fulfilled' && result.value.success
        ).length
        
        const failed = results.length - successful

        return NextResponse.json({
            message: `Email sent to ${successful} subscribers${failed > 0 ? `, ${failed} failed` : ''}`,
            total: subscribers.length,
            successful,
            failed
        })

    } catch (error) {
        console.error('Error sending marketing email:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 