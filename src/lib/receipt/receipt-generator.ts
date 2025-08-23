import jsPDF from 'jspdf'
import { Event, Booking, Participant } from '@/lib/types/database'
import { formatParticipantName } from '@/lib/utils/name-formatting'

export interface ReceiptData {
    event: Event
    booking: Booking
    participants: Participant[]
    receiptNumber: string
    paymentDate: Date
    paymentMethod: string
}

export interface ReceiptItem {
    description: string
    quantity: number
    unitPrice: number
    total: number
    sectionName?: string
}

export class ReceiptGenerator {
    private static generateReceiptNumber(bookingId: string): string {
        const timestamp = Date.now().toString(36)
        const bookingShort = bookingId.substring(0, 8)
        return `RCP-${bookingShort}-${timestamp}`
    }

    private static formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(amount)
    }

    private static formatDate(date: Date): string {
        return date.toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    private static formatDateTime(date: Date): string {
        return date.toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    private static buildReceiptItems(event: Event, booking: Booking, participants: Participant[]): ReceiptItem[] {
        const items: ReceiptItem[] = []

        // Check if we have section_bookings data (for multi-section events with actual pricing)
        if (booking.is_multi_section && 'section_bookings' in booking && Array.isArray(booking.section_bookings)) {
            // Use actual section booking data with real pricing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (booking.section_bookings as any[]).forEach((sectionBooking: any) => {
                const sectionName = sectionBooking.section?.title || 'Unknown Section'
                
                items.push({
                    description: `${event.title} - ${sectionName}`,
                    quantity: sectionBooking.quantity,
                    unitPrice: sectionBooking.unit_price,
                    total: sectionBooking.total_amount,
                    sectionName
                })
            })
        } else if (booking.is_multi_section && participants.length > 0) {
            // Fallback: Group participants by section if section_bookings not available
            const sectionGroups = new Map<string, Participant[]>()
            
            participants.forEach(participant => {
                const sectionName = participant.section?.title || 'General'
                if (!sectionGroups.has(sectionName)) {
                    sectionGroups.set(sectionName, [])
                }
                sectionGroups.get(sectionName)!.push(participant)
            })

            // For multi-section events, we need to calculate the total correctly
            // Since we don't have individual pricing, we'll distribute the total amount proportionally
            const totalParticipants = participants.length
            const basePricePerParticipant = booking.total_amount / totalParticipants

            sectionGroups.forEach((sectionParticipants, sectionName) => {
                const quantity = sectionParticipants.length
                const total = quantity * basePricePerParticipant
                
                items.push({
                    description: `${event.title} - ${sectionName}`,
                    quantity,
                    unitPrice: basePricePerParticipant,
                    total,
                    sectionName
                })
            })

            // Ensure the total matches exactly by adjusting the last item if needed
            if (items.length > 0) {
                const calculatedTotal = items.reduce((sum, item) => sum + item.total, 0)
                const difference = booking.total_amount - calculatedTotal
                
                if (Math.abs(difference) > 0.01) { // If there's a rounding difference
                    const lastItem = items[items.length - 1]
                    lastItem.total += difference
                    lastItem.unitPrice = lastItem.total / lastItem.quantity
                }
            }
        } else {
            // Single section or simple event
            const pricePerParticipant = booking.total_amount / booking.quantity
            items.push({
                description: event.title,
                quantity: booking.quantity,
                unitPrice: pricePerParticipant,
                total: booking.total_amount
            })
        }

        return items
    }

    public static async generateReceiptPDF(
        event: Event,
        booking: Booking,
        participants: Participant[],
        paymentMethod: string = 'Credit Card'
    ): Promise<Buffer | Uint8Array> {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 20
            const contentWidth = pageWidth - margin * 2
            const lineHeight = 8
            const receiptNumber = this.generateReceiptNumber(booking.booking_id || booking.id)
            const paymentDate = new Date(booking.created_at)
            const receiptItems = this.buildReceiptItems(event, booking, participants)

            // Header with company branding
            pdf.setFillColor(31, 41, 55) // Dark gray background
            pdf.rect(0, 0, pageWidth, 50, 'F')
            
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(24)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Hobsons Bay Chess Club', pageWidth / 2, 20, { align: 'center' })
            
            pdf.setFontSize(16)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Payment Receipt', pageWidth / 2, 35, { align: 'center' })

            // Reset text color
            pdf.setTextColor(0, 0, 0)

            // Receipt details section
            let yPosition = 65

            // Receipt number and date
            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Receipt Number:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(receiptNumber, margin + 50, yPosition)
            
            pdf.setFont('helvetica', 'bold')
            pdf.text('Date:', pageWidth - margin - 40, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(this.formatDate(paymentDate), pageWidth - margin - 25, yPosition)
            yPosition +=lineHeight

            // Customer information
            pdf.setFont('helvetica', 'bold')
            pdf.text('Customer:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            const customerName = participants.length > 0 
                ? formatParticipantName(participants[0])
                : 'Event Participant'
            pdf.text(customerName, margin + 50, yPosition)
            yPosition +=lineHeight

            // Event information
            pdf.setFont('helvetica', 'bold')
            pdf.text('Event:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(event.title, margin + 50, yPosition)
            yPosition +=lineHeight

            pdf.setFont('helvetica', 'bold')
            pdf.text('Event Date:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            const eventDate = new Date(event.start_date)
            pdf.text(this.formatDateTime(eventDate), margin + 50, yPosition)
            yPosition +=lineHeight

            pdf.setFont('helvetica', 'bold')
            pdf.text('Location:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(event.location, margin + 50, yPosition)
            yPosition +=lineHeight

            pdf.setFont('helvetica', 'bold')
            pdf.text('Booking ID:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(booking.booking_id || booking.id, margin + 50, yPosition)
            yPosition +=lineHeight

            pdf.setFont('helvetica', 'bold')
            pdf.text('Payment Method:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(paymentMethod, margin + 50, yPosition)
            yPosition += 20

            // Items table header
            pdf.setFillColor(243, 244, 246) // Light gray background
            pdf.rect(margin, yPosition - 5, contentWidth+5, 15, 'F')
            
            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Description', margin + 5, yPosition + 5)
            pdf.text('Qty', margin + 120, yPosition + 5)
            pdf.text('Unit Price', margin + 150, yPosition + 5)
            pdf.text('Total', margin + 200, yPosition + 5)
            yPosition += 20

            // Items
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(10)
            
            for (const item of receiptItems) {
                // Check if we need a new page
                if (yPosition > pageHeight - 80) {
                    pdf.addPage()
                    yPosition = 20
                }

                pdf.text(item.description, margin + 5, yPosition)
                pdf.text(item.quantity.toString(), margin + 120, yPosition)
                pdf.text(this.formatCurrency(item.unitPrice), margin + 150, yPosition)
                pdf.text(this.formatCurrency(item.total), margin + 200, yPosition)
                
                yPosition +=lineHeight
            }

            // Total section
            yPosition += 10
            pdf.line(margin, yPosition, pageWidth - margin +5, yPosition)
            yPosition += 15

            // Check if we need a new page for the total
            if (yPosition > pageHeight - 60) {
                pdf.addPage()
                yPosition = 20
            }

            // Debug: Log the total amount being displayed
            console.log('📄 [RECEIPT] Total amount to display:', {
                totalAmount: booking.total_amount,
                formattedAmount: this.formatCurrency(booking.total_amount),
                yPosition,
                pageHeight
            })

            // Add background highlight and border for total amount
            pdf.setFillColor(248, 250, 252) // Light gray background
            pdf.rect(margin, yPosition - 10, pageWidth - margin * 2 + 5, 18, 'F')
            
            // Add border around total amount
            pdf.setDrawColor(0, 0, 0) // Black border
            pdf.setLineWidth(0.5)
            pdf.rect(margin, yPosition - 10, pageWidth - margin * 2 + 5, 18, 'S')
            
            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(0, 0, 0) // Ensure black color
            pdf.text('Total Amount:', margin + 70, yPosition)
            pdf.text(this.formatCurrency(booking.total_amount), margin + 150, yPosition)
            yPosition += 20

            // Add PAID watermark to the page
            // Save current graphics state
            const currentTextColor = pdf.getTextColor()
            const currentFontSize = pdf.getFontSize()
            
            // Set watermark properties - make it more subtle
            pdf.setTextColor(34, 197, 94) // Green color
            pdf.setFontSize(76)
            pdf.setFont('helvetica', 'bold')
            
            // Calculate center position for watermark
            const watermarkX = pageWidth / 2 + 10 
            const watermarkY = pageHeight / 2 + 20
            
            // Draw the watermark as a subtle background element
            pdf.text('PAID', watermarkX, watermarkY, { align: 'center', angle:45 })
            
            // Restore graphics state
            pdf.setTextColor(currentTextColor)
            pdf.setFontSize(currentFontSize)
            pdf.setFont('helvetica', 'normal')
            
            yPosition += 15

            // Terms and conditions
            if (event.settings?.terms_conditions) {
                pdf.setFontSize(10)
                pdf.setFont('helvetica', 'bold')
                pdf.text('Terms & Conditions:', margin, yPosition)
                yPosition += 8
                
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(8)
                const termsText = event.settings.terms_conditions
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
                    .replace(/\*(.*?)\*/g, '$1') // Remove markdown italic
                    .substring(0, 200) + '...' // Limit length
                
                const termsLines = pdf.splitTextToSize(termsText, contentWidth - 10)
                for (const line of termsLines) {
                    if (yPosition > pageHeight - 40) break
                    pdf.text(line, margin + 5, yPosition)
                    yPosition += 5
                }
            }

            // Footer
            const footerY = pageHeight - 20
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(107, 114, 128)
            pdf.text('Thank you for your booking!', pageWidth / 2, footerY, { align: 'center' })
            pdf.text('For questions, contact: info@hbcc.com.au', pageWidth / 2, footerY + 5, { align: 'center' })
            pdf.text('Generated by Hobsons Bay Chess Club Booking System', pageWidth / 2, footerY + 10, { align: 'center' })

            return Buffer.from(pdf.output('arraybuffer') as ArrayBuffer)
        } catch (error) {
            console.error('Error generating receipt PDF:', error)
            throw new Error('Failed to generate receipt PDF')
        }
    }

    public static async generateErrorReceiptPDF(
        title: string,
        message: string,
        bookingId?: string
    ): Promise<Buffer | Uint8Array> {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 20

            // Header
            pdf.setFillColor(220, 38, 38) // Red background
            pdf.rect(0, 0, pageWidth, 40, 'F')
            
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(24)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Receipt Error', pageWidth / 2, 20, { align: 'center' })
            
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Unable to generate receipt', pageWidth / 2, 30, { align: 'center' })

            // Reset text color
            pdf.setTextColor(0, 0, 0)

            // Error content
            let yPosition = 80
            const lineHeight = 10

            pdf.setFontSize(16)
            pdf.setFont('helvetica', 'bold')
            pdf.text(title, margin, yPosition)
            yPosition += lineHeight + 5

            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'normal')
            
            // Split message into lines that fit the page width
            const maxWidth = pageWidth - (margin * 2)
            const words = message.split(' ')
            let currentLine = ''
            const lines: string[] = []

            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word
                const testWidth = pdf.getTextWidth(testLine)
                
                if (testWidth > maxWidth && currentLine) {
                    lines.push(currentLine)
                    currentLine = word
                } else {
                    currentLine = testLine
                }
            }
            if (currentLine) {
                lines.push(currentLine)
            }

            // Add lines to PDF
            for (const line of lines) {
                if (yPosition > pageHeight - 60) {
                    pdf.addPage()
                    yPosition = 20
                }
                pdf.text(line, margin, yPosition)
                yPosition += lineHeight
            }

            // Add booking ID if provided
            if (bookingId) {
                yPosition += lineHeight
                pdf.setFont('helvetica', 'bold')
                pdf.text('Booking ID:', margin, yPosition)
                pdf.setFont('helvetica', 'normal')
                pdf.text(bookingId, margin + 50, yPosition)
            }

            // Footer
            yPosition = pageHeight - 20
            pdf.setFontSize(10)
            pdf.setTextColor(128, 128, 128)
            pdf.text('Generated on: ' + new Date().toLocaleDateString('en-AU'), margin, yPosition)

            return Buffer.from(pdf.output('arraybuffer') as ArrayBuffer)
        } catch (error) {
            console.error('Error generating error receipt PDF:', error)
            throw new Error('Failed to generate error receipt PDF')
        }
    }
}
