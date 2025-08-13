import jsPDF from 'jspdf'
import { Event, Booking, Participant } from '@/lib/types/database'

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

        // Group participants by section if it's a multi-section event
        if (booking.is_multi_section && participants.length > 0) {
            const sectionGroups = new Map<string, Participant[]>()
            
            participants.forEach(participant => {
                const sectionName = participant.section?.title || 'General'
                if (!sectionGroups.has(sectionName)) {
                    sectionGroups.set(sectionName, [])
                }
                sectionGroups.get(sectionName)!.push(participant)
            })

            // Calculate price per participant
            const pricePerParticipant = booking.total_amount / booking.quantity

            sectionGroups.forEach((sectionParticipants, sectionName) => {
                const quantity = sectionParticipants.length
                const total = quantity * pricePerParticipant
                
                items.push({
                    description: `${event.title} - ${sectionName}`,
                    quantity,
                    unitPrice: pricePerParticipant,
                    total,
                    sectionName
                })
            })
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
            let yPosition = 70

            // Receipt number and date
            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Receipt Number:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(receiptNumber, margin + 50, yPosition)
            
            pdf.setFont('helvetica', 'bold')
            pdf.text('Date:', pageWidth - margin - 80, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(this.formatDate(paymentDate), pageWidth - margin - 30, yPosition)
            yPosition += 15

            // Customer information
            pdf.setFont('helvetica', 'bold')
            pdf.text('Customer:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            const customerName = participants.length > 0 
                ? `${participants[0].first_name} ${participants[0].last_name}`
                : 'Event Participant'
            pdf.text(customerName, margin + 50, yPosition)
            yPosition += 15

            // Event information
            pdf.setFont('helvetica', 'bold')
            pdf.text('Event:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(event.title, margin + 50, yPosition)
            yPosition += 15

            pdf.setFont('helvetica', 'bold')
            pdf.text('Event Date:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            const eventDate = new Date(event.start_date)
            pdf.text(this.formatDateTime(eventDate), margin + 50, yPosition)
            yPosition += 15

            pdf.setFont('helvetica', 'bold')
            pdf.text('Location:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(event.location, margin + 50, yPosition)
            yPosition += 15

            pdf.setFont('helvetica', 'bold')
            pdf.text('Booking ID:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(booking.booking_id || booking.id, margin + 50, yPosition)
            yPosition += 15

            pdf.setFont('helvetica', 'bold')
            pdf.text('Payment Method:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.text(paymentMethod, margin + 50, yPosition)
            yPosition += 25

            // Items table header
            pdf.setFillColor(243, 244, 246) // Light gray background
            pdf.rect(margin, yPosition - 5, contentWidth, 15, 'F')
            
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
                
                yPosition += 12
            }

            // Total section
            yPosition += 10
            pdf.line(margin, yPosition, pageWidth - margin, yPosition)
            yPosition += 15

            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Total Amount:', margin + 120, yPosition)
            pdf.text(this.formatCurrency(booking.total_amount), margin + 200, yPosition)
            yPosition += 20

            // Payment status
            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Payment Status:', margin, yPosition)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(34, 197, 94) // Green color for confirmed
            pdf.text('PAID', margin + 50, yPosition)
            pdf.setTextColor(0, 0, 0) // Reset color
            yPosition += 25

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
