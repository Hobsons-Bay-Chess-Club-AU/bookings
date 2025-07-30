export type UserRole = 'user' | 'admin' | 'organizer'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'

export interface Profile {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
    role: UserRole
    created_at: string
    updated_at: string
}

export interface Event {
    id: string
    title: string
    description?: string
    image_url?: string
    start_date: string
    end_date: string
    location: string
    price: number
    max_attendees?: number
    current_attendees: number
    status: EventStatus
    organizer_id: string
    created_at: string
    updated_at: string
    organizer?: Profile
}

export interface Booking {
    id: string
    event_id: string
    user_id: string
    quantity: number
    total_amount: number
    status: BookingStatus
    stripe_payment_intent_id?: string
    stripe_session_id?: string
    booking_date: string
    created_at: string
    updated_at: string
    event?: Event
    user?: Profile
}

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile
                Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
            }
            events: {
                Row: Event
                Insert: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'current_attendees'>
                Update: Partial<Omit<Event, 'id' | 'created_at' | 'updated_at' | 'current_attendees'>>
            }
            bookings: {
                Row: Booking
                Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'booking_date'>
                Update: Partial<Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'booking_date'>>
            }
        }
    }
}