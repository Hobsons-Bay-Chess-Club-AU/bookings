export type UserRole = 'user' | 'admin' | 'organizer' | 'customer_support'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'verified'
export type RefundStatus = 'none' | 'requested' | 'processing' | 'completed' | 'failed'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed' | 'entry_closed'
export type MembershipType = 'member' | 'non_member' | 'all'
export type PricingType = 'early_bird' | 'regular' | 'late_bird' | 'special'
export type FormFieldType = 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'file' | 'fide_id' | 'acf_id'
export type TimelineType = 'refund'
export type RefundValueType = 'percentage' | 'fixed'

// Player data structure for FIDE and ACF composite fields
export interface PlayerData {
    id: string
    name: string
    std_rating: number | null
    blitz_rating: number | null  // FIDE only
    rapid_rating: number | null  // FIDE only
    quick_rating: number | null  // ACF only
}

export interface RefundTimelineItem {
    from_date: string | null  // null means from event creation
    to_date: string | null    // null means until event date
    type: RefundValueType
    value: number // percentage (0-100) or fixed amount
    description?: string
}

export interface EventTimeline {
    refund?: RefundTimelineItem[]
}

export interface EventSettings {
    show_participants_public: boolean
    participant_display_fields: string[]
    // Future settings can be added here
    show_attendance_count?: boolean
    allow_participant_contact?: boolean
}

export interface Profile {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
    phone?: string
    role: UserRole
    membership_type?: MembershipType
    created_at: string
    updated_at: string
}

export interface PaymentEvent {
    id: string
    booking_id: string
    stripe_event_type: string
    stripe_event_id: string
    created_at: string
    // Related data for joins
    bookings?: Booking
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
    available_tickets: number
    created_at: string
    updated_at: string
}

export interface FormField {
    id?: string
    name: string
    label: string
    description?: string
    type: FormFieldType
    required: boolean
    options?: any[]
    validation?: any
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
    options?: any[]
    validation?: any
    placeholder?: string
    is_global: boolean
    usage_count: number
    created_at: string
    updated_at: string
}

export interface Participant {
    id?: string
    booking_id?: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    date_of_birth?: string
    custom_data?: Record<string, any>
    created_at?: string
    updated_at?: string
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
    entry_close_date?: string
    custom_form_fields?: FormField[]
    timeline?: EventTimeline
    is_promoted?: boolean
    settings?: EventSettings
    created_at: string
    updated_at: string
    organizer?: Profile
    alias?: string
}

export interface Booking {
    id: string
    booking_id?: string
    event_id: string
    user_id: string
    quantity: number
    total_amount: number
    status: BookingStatus
    refund_status: RefundStatus
    refund_amount?: number
    refund_percentage?: number
    refund_requested_at?: string
    refund_processed_at?: string
    refund_reason?: string
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