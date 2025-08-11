import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from './api-utils'

// Security middleware functions

// Validate and sanitize request body
export async function validateRequestBody<T extends Record<string, unknown>>(
  request: NextRequest,
  requiredFields: string[] = []
): Promise<{ isValid: boolean; data: T; errors: Record<string, string[]> }> {
  const errors: Record<string, string[]> = {}
  let data: T = {} as T

  try {
    // Check if request has a body
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        // For JSON requests, we'll need to clone the request to read the body
        const clonedRequest = request.clone()
        const bodyText = await clonedRequest.text()
        if (bodyText) {
          data = JSON.parse(bodyText) as T
        }
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData()
        data = Object.fromEntries(formData) as T
      }
    }

    // Validate required fields
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors[field] = [`${field} is required`]
      }
    })

    // Sanitize all fields
    const sanitizedData: T = {} as T
    
    Object.keys(data).forEach(key => {
      const value = data[key]
      if (typeof value === 'string') {
        (sanitizedData as Record<string, unknown>)[key] = sanitizeInput(value)
      } else {
        (sanitizedData as Record<string, unknown>)[key] = value
      }
    })

    return {
      isValid: Object.keys(errors).length === 0,
      data: sanitizedData,
      errors
    }
  } catch {
    return {
      isValid: false,
      data: {} as T,
      errors: { body: ['Invalid request body'] }
    }
  }
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
}

// Validate email format
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate URL format
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Check for suspicious patterns in input
export function detectSuspiciousPatterns(input: string): string[] {
  const patterns: Array<{ pattern: RegExp; description: string }> = [
    { pattern: /<script/i, description: 'Script tag detected' },
    { pattern: /javascript:/i, description: 'JavaScript protocol detected' },
    { pattern: /on\w+\s*=/i, description: 'Event handler detected' },
    { pattern: /eval\s*\(/i, description: 'Eval function detected' },
    { pattern: /document\./i, description: 'Document object access detected' },
    { pattern: /window\./i, description: 'Window object access detected' },
    { pattern: /alert\s*\(/i, description: 'Alert function detected' },
    { pattern: /confirm\s*\(/i, description: 'Confirm function detected' },
    { pattern: /prompt\s*\(/i, description: 'Prompt function detected' },
    { pattern: /<iframe/i, description: 'Iframe tag detected' },
    { pattern: /<object/i, description: 'Object tag detected' },
    { pattern: /<embed/i, description: 'Embed tag detected' },
  ]

  const detected: string[] = []
  
  patterns.forEach(({ pattern, description }) => {
    if (pattern.test(input)) {
      detected.push(description)
    }
  })

  return detected
}

// Rate limiting helper for custom endpoints
export function createRateLimitKey(request: NextRequest, prefix: string = ''): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const path = request.nextUrl.pathname
  
  return `${prefix}:${ip}:${path}:${userAgent}`
}

// Validate file upload
export function validateFileUpload(
  file: File,
  maxSize: number = 5 * 1024 * 1024, // 5MB default
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    return { isValid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type ${file.type} is not allowed` }
  }

  // Check file name for suspicious patterns
  const suspiciousPatterns = detectSuspiciousPatterns(file.name)
  if (suspiciousPatterns.length > 0) {
    return { isValid: false, error: `Suspicious patterns detected in filename: ${suspiciousPatterns.join(', ')}` }
  }

  return { isValid: true }
}

// Validate API key (if using API key authentication)
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!apiKey) return false
  
  // Add your API key validation logic here
  // For example, check against environment variables or database
  const validApiKeys = process.env.API_KEYS?.split(',') || []
  
  return validApiKeys.includes(apiKey)
}

// Check for suspicious headers
export function checkSuspiciousHeaders(request: NextRequest): string[] {
  const suspiciousHeaders = [
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-for',
    'x-real-ip',
    'x-original-url',
    'x-rewrite-url'
  ]

  const detected: string[] = []
  
  suspiciousHeaders.forEach(header => {
    if (request.headers.get(header)) {
      detected.push(`Suspicious header: ${header}`)
    }
  })

  return detected
}

// Validate request origin
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  if (!origin && !referer) {
    return true // Allow requests without origin/referer (e.g., direct API calls)
  }

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:1234',
    'https://localhost:3000',
    'https://localhost:1234'
  ].filter(Boolean)

  if (origin && allowedOrigins.includes(origin)) {
    return true
  }

  if (referer) {
    const refererUrl = new URL(referer)
    return allowedOrigins.some(allowed => {
      if (!allowed) return false
      const allowedUrl = new URL(allowed)
      return refererUrl.origin === allowedUrl.origin
    })
  }

  return false
}

// Security middleware wrapper
export function withSecurityChecks<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest
    
    // Check for suspicious headers
    const suspiciousHeaders = checkSuspiciousHeaders(request)
    if (suspiciousHeaders.length > 0) {
      console.warn('Suspicious headers detected:', suspiciousHeaders)
      return errorResponse('Suspicious request detected', 400)
    }

    // Validate origin (optional - can be disabled for public APIs)
    if (process.env.VALIDATE_ORIGIN === 'true' && !validateOrigin(request)) {
      console.warn('Invalid origin detected:', request.headers.get('origin'))
      return errorResponse('Invalid origin', 403)
    }

    // Continue with the original handler
    return handler(...args)
  }
}
