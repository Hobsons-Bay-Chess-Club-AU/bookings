import { Booking, CustomDataValue, Profile, EventSection } from "./database"

export interface BookingWithProfile extends Booking {
    profile: Profile
    participants?: Array<{
        id: string
        first_name: string
        last_name: string
        date_of_birth?: string
        email?: string
        phone?: string
        custom_data?: Record<string, CustomDataValue>
        section_id?: string
        section?: EventSection
    }>
}