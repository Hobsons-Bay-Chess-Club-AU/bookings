import jsPDF from 'jspdf'
import { createClient } from '@/lib/supabase/server'

interface TermsContent {
    title: string
    body: string
    updated_at: string
}

export class TermsPDFGenerator {
    /**
     * Fetch terms & conditions content from CMS
     */
    public static async fetchTermsContent(): Promise<TermsContent | null> {
        try {
            const supabase = await createClient()
            
            // Try to get terms-of-use first, then terms-of-service as fallback
            const { data: termsOfUse, error: termsOfUseError } = await supabase
                .from('content')
                .select('title, body, updated_at')
                .eq('slug', 'terms-of-use')
                .eq('is_published', true)
                .single()

            if (termsOfUse && !termsOfUseError) {
                return termsOfUse
            }

            // Fallback to terms-of-service
            const { data: termsOfService, error: termsOfServiceError } = await supabase
                .from('content')
                .select('title, body, updated_at')
                .eq('slug', 'terms-of-service')
                .eq('is_published', true)
                .single()

            if (termsOfService && !termsOfServiceError) {
                return termsOfService
            }

            console.warn('No terms & conditions content found in CMS')
            return null
        } catch (error) {
            console.error('Error fetching terms content:', error)
            return null
        }
    }

    /**
     * Convert markdown to plain text (basic implementation)
     */
    private static markdownToText(markdown: string): string {
        return markdown
            // Remove markdown headers
            .replace(/^#{1,6}\s+/gm, '')
            // Remove bold/italic markers
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            // Remove links but keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Remove horizontal rules
            .replace(/^---$/gm, '')
            // Clean up extra whitespace
            .replace(/\n\s*\n/g, '\n\n')
            .trim()
    }

    /**
     * Generate terms & conditions PDF
     */
    public static async generateTermsPDF(eventTitle?: string): Promise<Buffer | null> {
        try {
            const termsContent = await this.fetchTermsContent()
            
            if (!termsContent) {
                console.warn('No terms content available for PDF generation')
                return null
            }

            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 20
            const contentWidth = pageWidth - (margin * 2)
            let yPosition = 30

            // Header
            pdf.setFillColor(31, 41, 55) // Dark gray background
            pdf.rect(0, 0, pageWidth, 40, 'F')
            
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(18)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Hobsons Bay Chess Club', pageWidth / 2, 15, { align: 'center' })
            
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Terms & Conditions', pageWidth / 2, 28, { align: 'center' })

            // Title
            yPosition = 50
            pdf.setTextColor(0, 0, 0)
            pdf.setFontSize(16)
            pdf.setFont('helvetica', 'bold')
            pdf.text(termsContent.title, margin, yPosition)
            yPosition += 10

            // Last updated
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(107, 114, 128) // Gray color
            const lastUpdated = new Date(termsContent.updated_at).toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            pdf.text(`Last updated: ${lastUpdated}`, margin, yPosition)
            yPosition += 15

            // Event-specific terms (if provided)
            if (eventTitle) {
                pdf.setFontSize(12)
                pdf.setFont('helvetica', 'bold')
                pdf.setTextColor(0, 0, 0)
                pdf.text(`Event: ${eventTitle}`, margin, yPosition)
                yPosition += 8
                
                pdf.setFontSize(10)
                pdf.setFont('helvetica', 'normal')
                pdf.text('By accepting this booking, you agree to the following terms and conditions:', margin, yPosition)
                yPosition += 10
            }

            // Convert markdown to text and split into lines
            const plainText = this.markdownToText(termsContent.body)
            const lines = pdf.splitTextToSize(plainText, contentWidth)

            // Add content
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(0, 0, 0)

            for (const line of lines) {
                // Check if we need a new page
                if (yPosition > pageHeight - 40) {
                    pdf.addPage()
                    yPosition = 20
                }

                // Handle different line types
                if (line.trim().length === 0) {
                    yPosition += 5 // Empty line
                } else if (line.startsWith('##')) {
                    // Subheading
                    pdf.setFontSize(12)
                    pdf.setFont('helvetica', 'bold')
                    pdf.text(line.replace(/^##\s+/, ''), margin, yPosition)
                    yPosition += 8
                    pdf.setFontSize(10)
                    pdf.setFont('helvetica', 'normal')
                } else if (line.startsWith('#')) {
                    // Main heading
                    pdf.setFontSize(14)
                    pdf.setFont('helvetica', 'bold')
                    pdf.text(line.replace(/^#\s+/, ''), margin, yPosition)
                    yPosition += 10
                    pdf.setFontSize(10)
                    pdf.setFont('helvetica', 'normal')
                } else if (line.startsWith('- ') || line.startsWith('* ')) {
                    // List item
                    pdf.text(`• ${line.substring(2)}`, margin + 5, yPosition)
                    yPosition += 6
                } else {
                    // Regular text
                    pdf.text(line, margin, yPosition)
                    yPosition += 6
                }
            }

            // Footer
            const footerY = pageHeight - 20
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(107, 114, 128)
            pdf.text('Generated by Hobsons Bay Chess Club Booking System', pageWidth / 2, footerY, { align: 'center' })
            pdf.text(`Generated on: ${new Date().toLocaleDateString('en-AU')}`, pageWidth / 2, footerY + 5, { align: 'center' })

            return Buffer.from(pdf.output('arraybuffer') as ArrayBuffer)
        } catch (error) {
            console.error('Error generating terms PDF:', error)
            return null
        }
    }

    /**
     * Generate terms PDF with event-specific content
     */
    public static async generateEventTermsPDF(eventTerms: string, eventTitle: string): Promise<Buffer | null> {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 20
            const contentWidth = pageWidth - (margin * 2)
            let yPosition = 30

            // Header
            pdf.setFillColor(31, 41, 55) // Dark gray background
            pdf.rect(0, 0, pageWidth, 40, 'F')
            
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(18)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Hobsons Bay Chess Club', pageWidth / 2, 15, { align: 'center' })
            
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'normal')
            pdf.text('Event Terms & Conditions', pageWidth / 2, 28, { align: 'center' })

            // Event title
            yPosition = 50
            pdf.setTextColor(0, 0, 0)
            pdf.setFontSize(16)
            pdf.setFont('helvetica', 'bold')
            pdf.text(eventTitle, margin, yPosition)
            yPosition += 15

            // Introduction
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            pdf.text('By accepting this booking, you agree to the following event-specific terms and conditions:', margin, yPosition)
            yPosition += 10

            // Convert markdown to text and split into lines
            const plainText = this.markdownToText(eventTerms)
            const lines = pdf.splitTextToSize(plainText, contentWidth)

            // Add content
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(0, 0, 0)

            for (const line of lines) {
                // Check if we need a new page
                if (yPosition > pageHeight - 40) {
                    pdf.addPage()
                    yPosition = 20
                }

                // Handle different line types
                if (line.trim().length === 0) {
                    yPosition += 5 // Empty line
                } else if (line.startsWith('##')) {
                    // Subheading
                    pdf.setFontSize(12)
                    pdf.setFont('helvetica', 'bold')
                    pdf.text(line.replace(/^##\s+/, ''), margin, yPosition)
                    yPosition += 8
                    pdf.setFontSize(10)
                    pdf.setFont('helvetica', 'normal')
                } else if (line.startsWith('#')) {
                    // Main heading
                    pdf.setFontSize(14)
                    pdf.setFont('helvetica', 'bold')
                    pdf.text(line.replace(/^#\s+/, ''), margin, yPosition)
                    yPosition += 10
                    pdf.setFontSize(10)
                    pdf.setFont('helvetica', 'normal')
                } else if (line.startsWith('- ') || line.startsWith('* ')) {
                    // List item
                    pdf.text(`• ${line.substring(2)}`, margin + 5, yPosition)
                    yPosition += 6
                } else {
                    // Regular text
                    pdf.text(line, margin, yPosition)
                    yPosition += 6
                }
            }

            // Footer
            const footerY = pageHeight - 20
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(107, 114, 128)
            pdf.text('Generated by Hobsons Bay Chess Club Booking System', pageWidth / 2, footerY, { align: 'center' })
            pdf.text(`Generated on: ${new Date().toLocaleDateString('en-AU')}`, pageWidth / 2, footerY + 5, { align: 'center' })

            return Buffer.from(pdf.output('arraybuffer') as ArrayBuffer)
        } catch (error) {
            console.error('Error generating event terms PDF:', error)
            return null
        }
    }
}
