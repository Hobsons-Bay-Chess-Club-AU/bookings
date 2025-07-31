"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CreateTestDataPage() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const createTestData = async () => {
        setLoading(true)
        setMessage('')
        
        try {
            const supabase = createClient()
            
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setMessage('Please log in first')
                return
            }

            // Create a test event
            const { data: event, error: eventError } = await supabase
                .from('events')
                .insert({
                    title: 'Test Event for Participant Search',
                    description: 'This is a test event to create sample data',
                    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
                    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
                    location: 'Test Location',
                    price: 50.00,
                    max_attendees: 100,
                    status: 'published',
                    organizer_id: user.id
                })
                .select()
                .single()

            if (eventError) {
                console.error('Error creating event:', eventError)
                setMessage('Error creating event: ' + eventError.message)
                return
            }

            // Create a test booking
            const { data: booking, error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    event_id: event.id,
                    user_id: user.id,
                    quantity: 3,
                    total_amount: 150.00,
                    status: 'confirmed'
                })
                .select()
                .single()

            if (bookingError) {
                console.error('Error creating booking:', bookingError)
                setMessage('Error creating booking: ' + bookingError.message)
                return
            }

            // Create test participants
            const testParticipants = [
                {
                    booking_id: booking.id,
                    first_name: 'John',
                    last_name: 'Doe',
                    date_of_birth: '2010-05-15',
                    contact_email: 'john.doe@example.com',
                    contact_phone: '0412345678',
                    custom_data: { 'School': 'Primary School A', 'Grade': '5' }
                },
                {
                    booking_id: booking.id,
                    first_name: 'Jane',
                    last_name: 'Smith',
                    date_of_birth: '2012-08-22',
                    contact_email: 'jane.smith@example.com',
                    contact_phone: '0423456789',
                    custom_data: { 'School': 'Primary School B', 'Grade': '3' }
                },
                {
                    booking_id: booking.id,
                    first_name: 'Mike',
                    last_name: 'Johnson',
                    date_of_birth: '2009-03-10',
                    contact_email: 'mike.johnson@example.com',
                    contact_phone: '0434567890',
                    custom_data: { 'School': 'Primary School A', 'Grade': '6' }
                }
            ]

            const { error: participantsError } = await supabase
                .from('participants')
                .insert(testParticipants)

            if (participantsError) {
                console.error('Error creating participants:', participantsError)
                setMessage('Error creating participants: ' + participantsError.message)
                return
            }

            setMessage('Test data created successfully! You can now test the participant search feature.')
            
        } catch (error) {
            console.error('Error creating test data:', error)
            setMessage('Error creating test data: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-2xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">
                        Create Test Data for Participant Search
                    </h1>
                    
                    <div className="mb-6">
                        <p className="text-gray-600 mb-4">
                            This will create:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2">
                            <li>A test event</li>
                            <li>A test booking for the current user</li>
                            <li>3 test participants with different data</li>
                        </ul>
                    </div>

                    <button
                        onClick={createTestData}
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Creating Test Data...' : 'Create Test Data'}
                    </button>

                    {message && (
                        <div className={`mt-4 p-4 rounded-lg ${
                            message.includes('Error') 
                                ? 'bg-red-50 border border-red-200 text-red-600' 
                                : 'bg-green-50 border border-green-200 text-green-600'
                        }`}>
                            {message}
                        </div>
                    )}

                    <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-medium text-blue-900 mb-2">Next Steps:</h3>
                        <ol className="list-decimal list-inside text-blue-800 space-y-1 text-sm">
                            <li>Go to an event page</li>
                            <li>Start the booking process</li>
                            <li>On the participant form, click "Search Recent"</li>
                            <li>You should see the test participants</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    )
} 