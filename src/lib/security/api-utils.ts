import { NextResponse } from 'next/server'
import { createSecureResponse, createSecureRedirect } from './headers'

// Utility functions for secure API responses

// Success response with data
export function successResponse<T = unknown>(
  data: T,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  return createSecureResponse(
    { success: true, data },
    status,
    additionalHeaders
  )
}

// Error response
export function errorResponse(
  message: string,
  status: number = 400,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  return createSecureResponse(
    { success: false, error: message },
    status,
    additionalHeaders
  )
}

// Validation error response
export function validationErrorResponse(
  errors: Record<string, string[]>,
  status: number = 400
): NextResponse {
  return createSecureResponse(
    { 
      success: false, 
      error: 'Validation failed',
      errors 
    },
    status
  )
}

// Unauthorized response
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return errorResponse(message, 401, {
    'WWW-Authenticate': 'Bearer'
  })
}

// Forbidden response
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return errorResponse(message, 403)
}

// Not found response
export function notFoundResponse(message: string = 'Resource not found'): NextResponse {
  return errorResponse(message, 404)
}

// Method not allowed response
export function methodNotAllowedResponse(allowedMethods: string[]): NextResponse {
  return createSecureResponse(
    { success: false, error: 'Method not allowed' },
    405,
    { 'Allow': allowedMethods.join(', ') }
  )
}

// Rate limit exceeded response
export function rateLimitResponse(
  limit: number,
  reset: number,
  retryAfter: number
): NextResponse {
  return createSecureResponse(
    {
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${limit} requests per minute.`,
      retryAfter
    },
    429,
    {
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': reset.toString()
    }
  )
}

// Server error response
export function serverErrorResponse(
  message: string = 'Internal server error',
  errorId?: string
): NextResponse {
  const response: Record<string, unknown> = { 
    success: false, 
    error: message 
  }
  
  if (errorId) {
    response.errorId = errorId
  }
  
  return createSecureResponse(response, 500)
}

// Redirect response
export function redirectResponse(url: string, status: number = 302): NextResponse {
  return createSecureRedirect(url, status)
}

// JSON response with custom headers
export function jsonResponse<T = unknown>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return createSecureResponse(data as object, status, headers)
}

// File download response
export function fileResponse(
  content: string | Buffer,
  filename: string,
  contentType: string = 'application/octet-stream'
): NextResponse {
  const response = new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
  
  // Apply security headers
  Object.entries({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

// Helper to validate required fields
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {}
  
  requiredFields.forEach(field => {
    const value = data[field]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors[field] = [`${field} is required`]
    }
  })
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Helper to validate email format
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Helper to sanitize input
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

// Helper to generate error ID for tracking
export function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
