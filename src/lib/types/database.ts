export type UserRole = 'user' | 'admin' | 'organizer'

export type MembershipType = 'member' | 'non_member' | 'all'

export type PricingType = 'early_bird' | 'regular' | 'late_bird' | 'special'

export type FormFieldType = 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'file'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'verified'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed' | 'entry_closed'

export interface Profile {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
    role: UserRole
    membership_type: MembershipType
    created_at: string
    updated_at: string
}

export interface FormField {
    id: string
    name: string
    label: string
    description?: string
    type: FormFieldType
    required: boolean
    options?: string[] // For select/multiselect fields
    validation?: {
        regex?: string
        minLength?: number
        maxLength?: number
        min?: number
        max?: number
    }
    placeholder?: string
}

export interface CustomField {
    id: string
    organizer_id: string
    name: string
    label: string
    description?: string
    type: FormFieldType
    required: boolean
    options?: string[] // For select/multiselect fields
    validation?: {
        regex?: string
        minLength?: number
        maxLength?: number
        min?: number
        max?: number
    }
    placeholder?: string
    is_global: boolean
    usage_count: number
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
    entry_close_date?: string
    organizer_id: string
    organizer_name?: string
    organizer_email?: string
    organizer_phone?: string
    alias?: string
    custom_form_fields: FormField[]
    created_at: string
    updated_at: string
    organizer?: Profile
}

export interface EventPricing {
    id: string
    event_id: string
    name: string
    description?: string
    pricing_type: PricingType
    membership_type: MembershipType
    price: number
    start_date: string
    end_date: string
    is_active: boolean
    max_tickets?: number
    tickets_sold: number
    available_tickets?: number | null // Added for API responses
    created_at: string
    updated_at: string
}

export interface Participant {
    id: string
    booking_id: string
    first_name: string
    last_name: string
    date_of_birth?: string
    contact_email?: string
    contact_phone?: string
    custom_data: Record<string, any>
    created_at: string
    updated_at: string
}

export interface Booking {
    id: string
    event_id: string
    user_id: string
    pricing_id?: string
    quantity: number
    unit_price?: number
    total_amount: number
    participant_count: number
    status: BookingStatus
    stripe_payment_intent_id?: string
    stripe_session_id?: string
    booking_date: string
    created_at: string
    updated_at: string
    event?: Event
    user?: Profile
    pricing?: EventPricing
    participants?: Participant[]
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