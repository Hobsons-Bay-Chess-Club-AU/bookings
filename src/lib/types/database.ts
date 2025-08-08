import { FieldOption } from "@stripe/stripe-js"

export type UserRole = 'user' | 'admin' | 'organizer' | 'customer_support'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'verified'
export type RefundStatus = 'none' | 'requested' | 'processing' | 'completed' | 'failed'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed' | 'entry_closed'
export type MembershipType = 'member' | 'non_member' | 'all'
export type PricingType = 'early_bird' | 'regular' | 'late_bird' | 'special'
export type FormFieldType = 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'file' | 'fide_id' | 'acf_id'
export type TimelineType = 'refund'
export type RefundValueType = 'percentage' | 'fixed'
export type MailingListStatus = 'subscribed' | 'unsubscribed'
export type BookingAuditAction = 'transfer' | 'refund' | 'status_change' | 'modification'
export type DiscountType = 'code' | 'participant_based' | 'seat_based'
export type DiscountValueType = 'percentage' | 'fixed'

// Mailing List types
export interface MailingList {
    id: string
    email: string
    unsubscribe_reason?: string
    status: MailingListStatus
    datetime: string
    filter_event: string[]
    unsubscribe_code: string
    created_at: string
    updated_at: string
}

// CMS Content types
export interface Content {
    id: string
    title: string
    slug: string
    body: string // Markdown content
    version: number
    is_published: boolean
    is_system?: boolean
    meta_description?: string
    meta_keywords?: string[]
    created_by?: string
    updated_by?: string
    created_at: string
    updated_at: string
}

export interface ContentHistory {
    id: string
    content_id: string
    title: string
    body: string
    version: number
    created_by?: string
    created_at: string
}

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
    notify_organizer_on_booking?: boolean
    terms_conditions?: string
}

export interface LocationSettings {
    map_url?: string
    direction_url?: string
    details?: string
    url?: string
}

export interface Profile {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
    phone?: string
    role: UserRole // 'user' | 'admin' | 'organizer' | 'customer_support'
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

export interface FormFieldValidation {
    regex?: string
    minLength?: number
    maxLength?: number
    customMessage?: string
    min: number
    max: number
    accept?: string
}
export interface FormField {
    id?: string
    name: string
    label: string
    description?: string
    type: FormFieldType
    required: boolean
    options?: string[] | number[] | FieldOption[] | undefined
    validation?: FormFieldValidation | undefined
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
    options?: string[] | number[] | undefined
    validation?: Record<string, FormFieldValidation> | undefined
    placeholder?: string
    is_global: boolean
    usage_count: number
    created_at: string
    updated_at: string
}

export type CustomDataValue = string | number | boolean | PlayerData | Record<string, unknown> | null
export interface Participant {
    id?: string
    booking_id?: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    date_of_birth?: string
    custom_data?: Record<string, CustomDataValue>
    created_at?: string
    updated_at?: string
}

export interface Event {
    id: string
    title: string
    description?: string
    event_summary?: string
    image_url?: string
    start_date: string
    end_date: string
    location: string
    price: number
    max_attendees?: number
    current_attendees: number
    status: EventStatus
    organizer_id: string
    organizer_name?: string
    organizer_email?: string
    organizer_phone?: string
    entry_close_date?: string
    custom_form_fields?: FormField[]
    timeline?: EventTimeline
    is_promoted?: boolean
    settings?: EventSettings
    location_settings?: LocationSettings
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
    transferred_from_event_id?: string
    transferred_at?: string
    transferred_by?: string
    created_at: string
    updated_at: string
    event?: Event
    user?: Profile
}

export interface BookingAudit {
    id: string
    booking_id: string
    event_id: string
    action: BookingAuditAction
    from_event_id?: string
    to_event_id?: string
    from_status?: string
    to_status?: string
    reason?: string
    notes?: string
    performed_by: string
    performed_at: string
    created_at: string
    booking?: Booking
    event?: Event
    from_event?: Event
    to_event?: Event
    performer?: Profile
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    recipient_id: string
    subject?: string
    content: string
    is_read: boolean
    is_organizer_reply: boolean
    booking_id?: string
    event_id?: string
    created_at: string
    updated_at: string
    sender?: Profile
    recipient?: Profile
    booking?: Booking
    event?: Event
}

export interface Conversation {
    id: string
    user_id: string
    organizer_id: string
    event_id?: string
    booking_id?: string
    subject?: string
    last_message_at: string
    created_at: string
    updated_at: string
    user?: Profile
    organizer?: Profile
    event?: Event
    booking?: Booking
    messages?: Message[]
    unread_count?: number
}

// Discount-related interfaces
export interface ParticipantDiscountRule {
    id: string
    discount_id: string
    rule_type: string // 'name_match', 'dob_match', 'previous_event', 'custom'
    field_name?: string
    field_value?: string
    operator?: string // 'equals', 'contains', 'starts_with', 'ends_with'
    related_event_id?: string
    created_at: string
}

export interface SeatDiscountRule {
    id: string
    discount_id: string
    min_seats: number
    max_seats?: number
    discount_amount: number
    discount_percentage?: number
    created_at: string
}

export interface EventDiscount {
    id: string
    event_id: string
    name: string
    description?: string
    discount_type: DiscountType
    value_type: DiscountValueType
    value: number
    code?: string
    start_date?: string
    end_date?: string
    is_active: boolean
    max_uses?: number
    current_uses: number
    min_quantity: number
    max_quantity?: number
    created_at: string
    updated_at: string
    rules?: ParticipantDiscountRule[]
    seat_rules?: SeatDiscountRule[]
}

export interface DiscountApplication {
    id: string
    booking_id: string
    discount_id: string
    applied_value: number
    original_amount: number
    final_amount: number
    applied_at: string
    created_at: string
    discount?: EventDiscount
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
            messages: {
                Row: Message
                Insert: Omit<Message, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>
            }
            conversations: {
                Row: Conversation
                Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at' | 'last_message_at'>
                Update: Partial<Omit<Conversation, 'id' | 'created_at' | 'updated_at' | 'last_message_at'>>
            }
            event_discounts: {
                Row: EventDiscount
                Insert: Omit<EventDiscount, 'id' | 'created_at' | 'updated_at' | 'current_uses'>
                Update: Partial<Omit<EventDiscount, 'id' | 'created_at' | 'updated_at' | 'current_uses'>>
            }
            participant_discount_rules: {
                Row: ParticipantDiscountRule
                Insert: Omit<ParticipantDiscountRule, 'id' | 'created_at'>
                Update: Partial<Omit<ParticipantDiscountRule, 'id' | 'created_at'>>
            }
            seat_discount_rules: {
                Row: SeatDiscountRule
                Insert: Omit<SeatDiscountRule, 'id' | 'created_at'>
                Update: Partial<Omit<SeatDiscountRule, 'id' | 'created_at'>>
            }
            discount_applications: {
                Row: DiscountApplication
                Insert: Omit<DiscountApplication, 'id' | 'created_at' | 'applied_at'>
                Update: Partial<Omit<DiscountApplication, 'id' | 'created_at' | 'applied_at'>>
            }
        }
    }
}