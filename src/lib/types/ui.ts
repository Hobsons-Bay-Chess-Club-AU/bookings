import { Booking, CustomDataValue, Profile } from "./database"

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
    }>
}