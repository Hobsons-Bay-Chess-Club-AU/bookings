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

    // Generate a vertical barcode PNG data URL using jsbarcode + node-canvas at runtime
    private static async generateBarcodeDataUrl(
        ticketNumber: string,
        targetLongSidePx: number,
        orientation: 'horizontal' | 'vertical' = 'horizontal'
    ): Promise<string | null> {
        try {
            // Dynamic imports to avoid build-time dependency issues
            const canvasMod: unknown = await import('canvas').catch(() => null as unknown)
            const jsbarcodeMod: unknown = await import('jsbarcode').catch(() => null as unknown)

            // Minimal runtime validation and extraction
            type NodeCanvas = { width: number; height: number; getContext: (t: '2d') => CanvasRenderingContext2D; toBuffer: (mime?: string) => Buffer }
            const createCanvas = (canvasMod as { createCanvas?: (w: number, h: number) => NodeCanvas } | null)?.createCanvas
            const JsBarcode = (jsbarcodeMod as { default?: (el: unknown, text: string, opts?: Record<string, unknown>) => unknown } | null)?.default

            if (!createCanvas) {
                console.warn('[Ticket Barcode] canvas.createCanvas not available')
                return null
            }
            if (!JsBarcode) {
                console.warn('[Ticket Barcode] JsBarcode not available')
                return null
            }

            // Create a high-resolution horizontal barcode first
            const horizontalWidth = Math.max(600, Math.floor(targetLongSidePx * 1.5))
            const horizontalHeight = 120
            const tempCanvas = createCanvas(horizontalWidth, horizontalHeight)
            JsBarcode(tempCanvas as unknown as HTMLCanvasElement, ticketNumber, {
                format: 'CODE128',
                displayValue: false,
                margin: 0,
                background: '#FFFFFF',
                lineColor: '#000000',
                width: 2,
                height: horizontalHeight
            })
            
            let buffer: Buffer
            if (orientation === 'vertical') {
                // Rotate to vertical: long side becomes height
                const rotatedCanvas = createCanvas(horizontalHeight, horizontalWidth)
                const ctx = rotatedCanvas.getContext('2d')
                // Fill white background
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height)
                // Rotate -90deg and draw
                ctx.translate(0, rotatedCanvas.height)
                ctx.rotate(-Math.PI / 2)
                // Draw with some padding
                ctx.drawImage(tempCanvas as unknown as CanvasImageSource, 0, 0)
                buffer = rotatedCanvas.toBuffer('image/png')
            } else {
                buffer = (tempCanvas as unknown as { toBuffer: (mime?: string) => Buffer }).toBuffer('image/png')
            }
            const base64 = buffer.toString('base64')
            console.log('[Ticket Barcode] Generated barcode image base64 length:', base64.length, 'orientation:', orientation)
            return `data:image/png;base64,${base64}`
        } catch (error) {
            console.error('[Ticket Barcode] Error generating barcode with jsbarcode:', error)
            return null
        }
    }

    private static async addBarcodeToPDF(
        pdf: jsPDF,
        ticketNumber: string,
        x: number,
        y: number,
        width: number,
        height: number,
        orientation: 'horizontal' | 'vertical' = 'horizontal'
    ): Promise<void> {
        try {
            console.log("addBarcodeToPDF")
            // Aim for a high-resolution asset to preserve quality when scaled into PDF
            const targetLongSidePx = Math.max(600, Math.floor((orientation === 'horizontal' ? width : height) * 12)) // heuristic
            const dataUrl = await this.generateBarcodeDataUrl(ticketNumber, targetLongSidePx, orientation)
            if (!dataUrl) {
                console.log('[Ticket Barcode] Barcode generation not possible')
                // Fallback: simple label if barcode generation not possible
                pdf.setFontSize(10)
                pdf.text('TICKET', x, y + 10, { angle: 90 })
                pdf.setFontSize(8)
                pdf.text(ticketNumber, x + 5, y + height - 5, { angle: 90 })
                return
            }
            const base64DataUrl = dataUrl
            console.log('[Ticket Barcode] Adding barcode to PDF at', { x, y, width, height, orientation })
            pdf.addImage(base64DataUrl, 'PNG', x, y, width, height)
        } catch (error) {
            console.error('[Ticket Barcode] Error adding barcode to PDF:', error)
        }
    }

    // Shared renderer for a single ticket page
    private static async drawTicketPage(
        pdf: jsPDF,
        event: Event,
        booking: Booking,
        participant: Participant,
        participantIndex: number,
        options: TicketGenerationOptions = {}
    ): Promise<void> {
        const { includeTermsConditions = true, signatureLine = true } = options

        const ticketNumber = this.generateTicketNumber(booking.booking_id || '', participantIndex)
        const qrCodeDataURL = await this.generateQRCode(ticketNumber)

        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        const margin = 20
        const contentWidth = pageWidth - margin * 2

        // Barcode (working placement at top-left gutter)
        try {
            const barcodeWidth = 18 // mm
            const barcodeHeight = 110 // mm
            const barcodeX = 1
            const barcodeY = 0
            await this.addBarcodeToPDF(pdf, ticketNumber, barcodeX, barcodeY, barcodeWidth, barcodeHeight, 'vertical')
        } catch (e) {
            console.error('[Ticket Barcode] failed placement (drawTicketPage):', e)
        }

        // Header
        pdf.setFillColor(31, 41, 55)
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

        // Left column
        pdf.setFontSize(20)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${participant.first_name} ${participant.last_name}`, margin, 60)

        let yPosition = 80
        const lineHeight = 8
        const eventDate = new Date(event.start_date)
        const bookingDate = new Date(booking.created_at)

        pdf.setFontSize(12)
        // Section (if available)
        if ((participant as unknown as { section?: { title?: string; start_date?: string; end_date?: string } }).section) {
            const sec = (participant as unknown as { section: { title?: string; start_date?: string; end_date?: string } }).section
            if (sec.title) {
                pdf.setFont('helvetica', 'bold')
                pdf.text('Section:', margin, yPosition)
                pdf.setFont('helvetica', 'normal')
                pdf.text(sec.title, margin + 50, yPosition)
                yPosition += lineHeight
            }
            if (sec.start_date) {
                pdf.setFont('helvetica', 'bold')
                pdf.text('Section Time:', margin, yPosition)
                pdf.setFont('helvetica', 'normal')
                const secStart = new Date(sec.start_date)
                const secEnd = sec.end_date ? new Date(sec.end_date) : null
                const timeText = `${this.formatDate(secStart)} at ${this.formatTime(secStart)}${secEnd ? ` - ${this.formatTime(secEnd)}` : ''}`
                pdf.text(timeText, margin + 50, yPosition)
                yPosition += lineHeight
            }
        }

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

        // Terms & Conditions (short)
        if (includeTermsConditions && event.settings?.terms_conditions) {
            yPosition += 10
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(14)
            pdf.text('Terms & Conditions:', margin, yPosition)
            yPosition += lineHeight
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(10)
            const plainTextTerms = this.convertMarkdownToText(event.settings.terms_conditions)
            const termsLines = pdf.splitTextToSize(plainTextTerms, contentWidth - 50)
            for (const line of termsLines) {
                if (yPosition > pageHeight - 80) {
                    break
                }
                pdf.text(line, margin + 10, yPosition)
                yPosition += 5
            }
        }

        // Signature Lines
        if (signatureLine) {
            const signatureY = Math.max(yPosition + 10, 140)
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(10)
            pdf.line(margin, signatureY, margin + 80, signatureY)
            pdf.text('Signature', margin, signatureY + 5)
            pdf.line(margin + 100, signatureY, margin + 180, signatureY)
            pdf.text('Date', margin + 100, signatureY + 5)
        }

        // Right column: QR & ticket number
        const rightSectionX = pageWidth - margin - 40
        const rightSectionY = 70
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${participant.first_name} ${participant.last_name}`, rightSectionX, rightSectionY -2)
        await this.addQRCodeToPDF(pdf, qrCodeDataURL, rightSectionX, rightSectionY, 50)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Ticket Number:', rightSectionX + 10, rightSectionY + 55)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text(ticketNumber, rightSectionX + 10, rightSectionY +58)

        // Footer
        const footerY = pageHeight - 10
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(107, 114, 128)
        pdf.text('This ticket is valid for one person only. Please present this ticket at the event entrance.', pageWidth / 2, footerY, { align: 'center' })
        pdf.text('Generated by Hobsons Bay Chess Club Booking System', pageWidth / 2, footerY + 5, { align: 'center' })
        pdf.setTextColor(0, 0, 0)
    }

    public static async generateTicketPDF(
        event: Event,
        booking: Booking,
        participant: Participant,
        participantIndex: number,
        options: TicketGenerationOptions = {}
    ): Promise<Buffer> {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4')
            await this.drawTicketPage(pdf, event, booking, participant, participantIndex, options)
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
            const pdf = new jsPDF('p', 'mm', 'a4')
            for (let i = 0; i < participants.length; i++) {
                const participant = participants[i]
                if (i > 0) pdf.addPage()
                await this.drawTicketPage(pdf, event, booking, participant, i, options)
            }
            return Buffer.from(pdf.output('arraybuffer'))
        } catch (error) {
            console.error('Error generating all tickets PDF:', error)
            throw new Error('Failed to generate all tickets PDF')
        }
    }

} 