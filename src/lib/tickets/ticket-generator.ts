import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { Event, Booking, Participant } from '@/lib/types/database'

export interface TicketData {
    event: Event
    booking: Booking
    participant: Participant
    ticketNumber: string
    qrCodeData: string
}

export interface TicketGenerationOptions {
    includeTermsConditions?: boolean
    signatureLine?: boolean
}

export class TicketGenerator {
    private static generateTicketNumber(bookingId: string, participantIndex: number): string {
        const timestamp = Date.now().toString(36)
        const bookingShort = bookingId.substring(0, 8)
        return `TKT-${bookingShort}-${participantIndex + 1}-${timestamp}`
    }

    private static async generateQRCode(data: string): Promise<string> {
        try {
            const qrCodeDataURL = await QRCode.toDataURL(data, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
            return qrCodeDataURL
        } catch (error) {
            console.error('Error generating QR code:', error)
            throw new Error('Failed to generate QR code')
        }
    }

    private static formatDate(date: Date): string {
        return date.toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    private static formatTime(date: Date): string {
        return date.toLocaleTimeString('en-AU', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    private static convertMarkdownToText(markdown: string): string {
        try {
            // Simple markdown to text conversion for common elements
            return markdown
                // Remove HTML tags if any
                .replace(/<[^>]*>/g, '')
                // Convert headers to plain text
                .replace(/^#{1,6}\s+/gm, '')
                // Convert bold to plain text
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/__(.*?)__/g, '$1')
                // Convert italic to plain text
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/_(.*?)_/g, '$1')
                // Convert code blocks to plain text
                .replace(/```[\s\S]*?```/g, '')
                .replace(/`([^`]*)`/g, '$1')
                // Convert links to plain text
                .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
                // Convert lists to plain text
                .replace(/^[\s]*[-*+]\s+/gm, '• ')
                .replace(/^[\s]*\d+\.\s+/gm, '')
                // Remove extra whitespace
                .replace(/\n\s*\n/g, '\n\n')
                .trim()
        } catch (error) {
            console.error('Error converting markdown to text:', error)
            return markdown // Fallback to original text
        }
    }

    private static async addQRCodeToPDF(pdf: jsPDF, qrCodeDataURL: string, x: number, y: number, size: number = 50): Promise<void> {
        try {
            // Convert data URL to base64
            const base64Data = qrCodeDataURL.split(',')[1]
            pdf.addImage(base64Data, 'PNG', x, y, size, size)
        } catch (error) {
            console.error('Error adding QR code to PDF:', error)
            // Fallback: add text instead of QR code
            pdf.setFontSize(8)
            pdf.text('QR Code', x, y + size / 2)
        }
    }

    private static async generateSingleTicketPDF(
        event: Event,
        booking: Booking,
        participant: Participant,
        participantIndex: number,
        options: TicketGenerationOptions = {}
    ): Promise<jsPDF> {
        const { includeTermsConditions = true, signatureLine = true } = options
        
        const ticketNumber = this.generateTicketNumber(booking.booking_id || "", participantIndex)
        const qrCodeDataURL = await this.generateQRCode(ticketNumber)
        
        const eventDate = new Date(event.start_date)
        const bookingDate = new Date(booking.created_at)

        // Create PDF
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 20
        const contentWidth = pageWidth - (margin * 2)

        // Header
        pdf.setFillColor(31, 41, 55) // Dark gray
        pdf.rect(0, 0, pageWidth, 40, 'F')
        
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(24)
        pdf.setFont('helvetica', 'bold')
        pdf.text(event.title, pageWidth / 2, 20, { align: 'center' })
        
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'normal')
        pdf.text('Event Ticket', pageWidth / 2, 30, { align: 'center' })

        // Reset text color
        pdf.setTextColor(0, 0, 0)

        // Participant Name
        pdf.setFontSize(20)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${participant.first_name} ${participant.last_name}`, margin, 60)

        // Event Information
        let yPosition = 80
        const lineHeight = 8

        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Event Date & Time:', margin, yPosition)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`${this.formatDate(eventDate)} at ${this.formatTime(eventDate)}`, margin + 50, yPosition)
        yPosition += lineHeight

        pdf.setFont('helvetica', 'bold')
        pdf.text('Location:', margin, yPosition)
        pdf.setFont('helvetica', 'normal')
        pdf.text(event.location, margin + 50, yPosition)
        yPosition += lineHeight

        pdf.setFont('helvetica', 'bold')
        pdf.text('Booking ID:', margin, yPosition)
        pdf.setFont('helvetica', 'normal')
        pdf.text(booking.booking_id || booking.id, margin + 50, yPosition)
        yPosition += lineHeight

        pdf.setFont('helvetica', 'bold')
        pdf.text('Booking Date:', margin, yPosition)
        pdf.setFont('helvetica', 'normal')
        pdf.text(this.formatDate(bookingDate), margin + 50, yPosition)
        yPosition += lineHeight

        pdf.setFont('helvetica', 'bold')
        pdf.text('Organizer:', margin, yPosition)
        pdf.setFont('helvetica', 'normal')
        pdf.text(event.organizer?.full_name || 'Hobsons Bay Chess Club', margin + 50, yPosition)
        yPosition += lineHeight

        // Terms & Conditions
        if (includeTermsConditions && event.settings?.terms_conditions) {
            yPosition += 70
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(14)
            pdf.text('Terms & Conditions:', margin, yPosition)
            yPosition += lineHeight

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(10)
            
            // Convert markdown to plain text for PDF
            const plainTextTerms = this.convertMarkdownToText(event.settings.terms_conditions)
            
            // Split terms into lines that fit the page width
            const termsLines = pdf.splitTextToSize(plainTextTerms, contentWidth - 50)
            for (const line of termsLines) {
                if (yPosition > pageHeight - 80) {
                    pdf.addPage()
                    yPosition = 20
                }
                pdf.text(line, margin + 10, yPosition)
                yPosition += 5
            }
        }

        // Signature Lines
        if (signatureLine) {
            // Ensure signature lines are positioned below the QR code
            const signatureY = Math.max(yPosition + 10, 140) // QR code ends around 130, so start at 140
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(10)
            
            // Booker signature line
            pdf.line(margin, signatureY, margin + 80, signatureY)
            pdf.text('Signature', margin, signatureY + 5)
            
            // Date line
            pdf.line(margin + 100, signatureY, margin + 180, signatureY)
            pdf.text('Date', margin + 100, signatureY + 5)
        }

        // Right section - Participant Name, QR Code and Ticket Number
        const rightSectionX = pageWidth - margin - 70 // Move further right
        const rightSectionY = 80

        // Participant Name
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${participant.first_name} ${participant.last_name}`, rightSectionX, rightSectionY - 10)

        // QR Code
        await this.addQRCodeToPDF(pdf, qrCodeDataURL, rightSectionX, rightSectionY, 50)

        // Ticket Number
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Ticket Number:', rightSectionX, rightSectionY + 70)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text(ticketNumber, rightSectionX, rightSectionY + 75)

        // Footer
        const footerY = pageHeight - 20
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(107, 114, 128) // Gray color
        pdf.text('This ticket is valid for one person only. Please present this ticket at the event entrance.', pageWidth / 2, footerY, { align: 'center' })
        pdf.text('Generated by Hobsons Bay Chess Club Booking System', pageWidth / 2, footerY + 5, { align: 'center' })

        return pdf
    }

    public static async generateTicketPDF(
        event: Event,
        booking: Booking,
        participant: Participant,
        participantIndex: number,
        options: TicketGenerationOptions = {}
    ): Promise<Buffer> {
        try {
            const pdf = await this.generateSingleTicketPDF(event, booking, participant, participantIndex, options)
            return Buffer.from(pdf.output('arraybuffer'))
        } catch (error) {
            console.error('Error generating ticket PDF:', error)
            throw new Error('Failed to generate ticket PDF')
        }
    }

    public static async generateErrorPDF(
        title: string,
        message: string,
        bookingId?: string
    ): Promise<Buffer> {
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
            pdf.text('Ticket Error', pageWidth / 2, 20, { align: 'center' })
            
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Unable to generate tickets', pageWidth / 2, 30, { align: 'center' })

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

            return Buffer.from(pdf.output('arraybuffer'))
        } catch (error) {
            console.error('Error generating error PDF:', error)
            throw new Error('Failed to generate error PDF')
        }
    }

    public static async generateAllTicketsPDF(
        event: Event,
        booking: Booking,
        participants: Participant[],
        options: TicketGenerationOptions = {}
    ): Promise<Buffer> {
        try {
            if (participants.length === 0) {
                throw new Error('No participants provided')
            }

            // Create a new PDF document
            const pdf = new jsPDF('p', 'mm', 'a4')

            // Generate each ticket and add it as a page
            for (let i = 0; i < participants.length; i++) {
                const participant = participants[i]
                
                // Add new page for each ticket (except the first one)
                if (i > 0) {
                    pdf.addPage()
                }

                // Generate ticket content for this page
                const ticketNumber = this.generateTicketNumber(booking.id, i)
                const qrCodeDataURL = await this.generateQRCode(ticketNumber)
                
                const eventDate = new Date(event.start_date)
                const bookingDate = new Date(booking.created_at)
                const { includeTermsConditions = true, signatureLine = true } = options

                const pageWidth = pdf.internal.pageSize.getWidth()
                const pageHeight = pdf.internal.pageSize.getHeight()
                const margin = 20
                const contentWidth = pageWidth - (margin * 2)

                // Header
                pdf.setFillColor(31, 41, 55) // Dark gray
                pdf.rect(0, 0, pageWidth, 40, 'F')
                
                pdf.setTextColor(255, 255, 255)
                pdf.setFontSize(24)
                pdf.setFont('helvetica', 'bold')
                pdf.text(event.title, pageWidth / 2, 20, { align: 'center' })
                
                pdf.setFontSize(14)
                pdf.setFont('helvetica', 'normal')
                pdf.text('Event Ticket', pageWidth / 2, 30, { align: 'center' })

                // Reset text color
                pdf.setTextColor(0, 0, 0)

                // Participant Name
                pdf.setFontSize(20)
                pdf.setFont('helvetica', 'bold')
                pdf.text(`${participant.first_name} ${participant.last_name}`, margin, 60)

                // Event Information
                let yPosition = 80
                const lineHeight = 8

                pdf.setFontSize(12)
                pdf.setFont('helvetica', 'bold')
                pdf.text('Event Date & Time:', margin, yPosition)
                pdf.setFont('helvetica', 'normal')
                pdf.text(`${this.formatDate(eventDate)} at ${this.formatTime(eventDate)}`, margin + 50, yPosition)
                yPosition += lineHeight

                pdf.setFont('helvetica', 'bold')
                pdf.text('Location:', margin, yPosition)
                pdf.setFont('helvetica', 'normal')
                pdf.text(event.location, margin + 50, yPosition)
                yPosition += lineHeight

                pdf.setFont('helvetica', 'bold')
                pdf.text('Booking ID:', margin, yPosition)
                pdf.setFont('helvetica', 'normal')
                pdf.text(booking.booking_id || booking.id, margin + 50, yPosition)
                yPosition += lineHeight

                pdf.setFont('helvetica', 'bold')
                pdf.text('Booking Date:', margin, yPosition)
                pdf.setFont('helvetica', 'normal')
                pdf.text(this.formatDate(bookingDate), margin + 50, yPosition)
                yPosition += lineHeight

                pdf.setFont('helvetica', 'bold')
                pdf.text('Organizer:', margin, yPosition)
                pdf.setFont('helvetica', 'normal')
                pdf.text(event.organizer?.full_name || 'Hobsons Bay Chess Club', margin + 50, yPosition)
                yPosition += lineHeight

                // Terms & Conditions
                if (includeTermsConditions && event.settings?.terms_conditions) {
                    yPosition += 10
                    pdf.setFont('helvetica', 'bold')
                    pdf.setFontSize(14)
                    pdf.text('Terms & Conditions:', margin, yPosition)
                    yPosition += lineHeight

                    pdf.setFont('helvetica', 'normal')
                    pdf.setFontSize(10)
                    
                    // Convert markdown to plain text for PDF
                    const plainTextTerms = this.convertMarkdownToText(event.settings.terms_conditions)
                    
                    // Split terms into lines that fit the page width
                    const termsLines = pdf.splitTextToSize(plainTextTerms, contentWidth - 50)
                    for (const line of termsLines) {
                        if (yPosition > pageHeight - 80) {
                            break // Don't add new pages for terms in multi-ticket PDF
                        }
                        pdf.text(line, margin + 10, yPosition)
                        yPosition += 5
                    }
                }

                // Signature Lines
                if (signatureLine) {
                    // Ensure signature lines are positioned below the QR code
                    const signatureY = Math.max(yPosition + 10, 140) // QR code ends around 130, so start at 140
                    pdf.setFont('helvetica', 'normal')
                    pdf.setFontSize(10)
                    
                    // Booker signature line
                    pdf.line(margin, signatureY, margin + 80, signatureY)
                    pdf.text('Booker Signature', margin, signatureY + 5)
                    
                    // Date line
                    pdf.line(margin + 100, signatureY, margin + 180, signatureY)
                    pdf.text('Date', margin + 100, signatureY + 5)
                }

                // Right section - Participant Name, QR Code and Ticket Number
                const rightSectionX = pageWidth - margin - 40 // Move further right
                const rightSectionY = 80

                // Participant Name
                pdf.setFontSize(14)
                pdf.setFont('helvetica', 'bold')
                pdf.text(`${participant.first_name} ${participant.last_name}`, rightSectionX, rightSectionY - 10)

                // QR Code
                await this.addQRCodeToPDF(pdf, qrCodeDataURL, rightSectionX, rightSectionY, 50)

                // Ticket Number
                pdf.setFontSize(10)
                pdf.setFont('helvetica', 'bold')
                pdf.text('Ticket Number:', rightSectionX + 13, rightSectionY + 53)
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(8)
                pdf.text(ticketNumber, rightSectionX +8, rightSectionY + 58)

                // Footer
                const footerY = pageHeight - 20
                pdf.setFontSize(10)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(107, 114, 128) // Gray color
                pdf.text('This ticket is valid for one person only. Please present this ticket at the event entrance.', pageWidth / 2, footerY, { align: 'center' })
                pdf.text('Generated by Hobsons Bay Chess Club Booking System', pageWidth / 2, footerY + 5, { align: 'center' })
            }

            return Buffer.from(pdf.output('arraybuffer'))
        } catch (error) {
            console.error('Error generating all tickets PDF:', error)
            throw new Error('Failed to generate all tickets PDF')
        }
    }

} 