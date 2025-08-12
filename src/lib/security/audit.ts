import { NextRequest } from 'next/server'

// Security audit logging

export interface SecurityEvent {
  timestamp: string
  eventType: 'rate_limit' | 'suspicious_activity' | 'authentication_failure' | 'authorization_failure' | 'input_validation' | 'file_upload' | 'api_access'
  severity: 'low' | 'medium' | 'high' | 'critical'
  ip: string
  userAgent: string
  path: string
  method: string
  userId?: string
  details: Record<string, unknown>
  requestId?: string
}

// Security event logger
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString()
  }

  // Log to console with appropriate formatting
  const logLevel = securityEvent.severity === 'critical' ? 'error' : 
                   securityEvent.severity === 'high' ? 'warn' : 'info'

  console[logLevel]('🔒 SECURITY EVENT:', {
    ...securityEvent,
    // Add emoji for visual distinction
    emoji: securityEvent.severity === 'critical' ? '🚨' :
           securityEvent.severity === 'high' ? '⚠️' :
           securityEvent.severity === 'medium' ? '🔶' : 'ℹ️'
  })

  // In production, you might want to send this to a security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external security monitoring service
    // await sendToSecurityService(securityEvent)
  }
}

// Extract request information for security logging
export function extractRequestInfo(request: NextRequest): {
  ip: string
  userAgent: string
  path: string
  method: string
  requestId: string
} {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const path = request.nextUrl.pathname
  const method = request.method
  const requestId = generateRequestId()

  return { ip, userAgent, path, method, requestId }
}

// Generate unique request ID for tracking
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Rate limiting audit
export function auditRateLimit(
  request: NextRequest,
  limit: number,
  remaining: number,
  reset: number,
  userId?: string
): void {
  const requestInfo = extractRequestInfo(request)
  
  logSecurityEvent({
    eventType: 'rate_limit',
    severity: remaining === 0 ? 'high' : 'low',
    ...requestInfo,
    userId,
    details: {
      limit,
      remaining,
      reset,
      exceeded: remaining === 0
    }
  })
}

// Suspicious activity audit
export function auditSuspiciousActivity(
  request: NextRequest,
  activity: string,
  details: Record<string, unknown>,
  userId?: string
): void {
  const requestInfo = extractRequestInfo(request)
  
  logSecurityEvent({
    eventType: 'suspicious_activity',
    severity: 'high',
    ...requestInfo,
    userId,
    details: {
      activity,
      ...details
    }
  })
}

// Authentication failure audit
export function auditAuthFailure(
  request: NextRequest,
  reason: string,
  email?: string
): void {
  const requestInfo = extractRequestInfo(request)
  
  logSecurityEvent({
    eventType: 'authentication_failure',
    severity: 'medium',
    ...requestInfo,
    details: {
      reason,
      email,
      timestamp: new Date().toISOString()
    }
  })
}

// Authorization failure audit
export function auditAuthzFailure(
  request: NextRequest,
  userId: string,
  requiredRole: string,
  actualRole: string
): void {
  const requestInfo = extractRequestInfo(request)
  
  logSecurityEvent({
    eventType: 'authorization_failure',
    severity: 'high',
    ...requestInfo,
    userId,
    details: {
      requiredRole,
      actualRole,
      attemptedAccess: requestInfo.path
    }
  })
}

// Input validation audit
export function auditInputValidation(
  request: NextRequest,
  field: string,
  value: string,
  validationType: string,
  userId?: string
): void {
  const requestInfo = extractRequestInfo(request)
  
  logSecurityEvent({
    eventType: 'input_validation',
    severity: 'medium',
    ...requestInfo,
    userId,
    details: {
      field,
      value: value.substring(0, 100), // Truncate for security
      validationType,
      suspiciousPatterns: detectSuspiciousPatterns(value)
    }
  })
}

// File upload audit
export function auditFileUpload(
  request: NextRequest,
  filename: string,
  fileSize: number,
  fileType: string,
  validationResult: { isValid: boolean; error?: string },
  userId?: string
): void {
  const requestInfo = extractRequestInfo(request)
  
  logSecurityEvent({
    eventType: 'file_upload',
    severity: validationResult.isValid ? 'low' : 'high',
    ...requestInfo,
    userId,
    details: {
      filename,
      fileSize,
      fileType,
      isValid: validationResult.isValid,
      error: validationResult.error
    }
  })
}

// API access audit
export function auditApiAccess(
  request: NextRequest,
  endpoint: string,
  responseStatus: number,
  responseTime: number,
  userId?: string
): void {
  const requestInfo = extractRequestInfo(request)
  
  logSecurityEvent({
    eventType: 'api_access',
    severity: responseStatus >= 400 ? 'medium' : 'low',
    ...requestInfo,
    userId,
    details: {
      endpoint,
      responseStatus,
      responseTime,
      success: responseStatus < 400
    }
  })
}

// Security metrics collection
export interface SecurityMetrics {
  totalRequests: number
  rateLimitExceeded: number
  suspiciousActivities: number
  authFailures: number
  authzFailures: number
  inputValidationFailures: number
  fileUploadFailures: number
  apiErrors: number
}

// In-memory metrics (in production, use a proper metrics service)
let securityMetrics: SecurityMetrics = {
  totalRequests: 0,
  rateLimitExceeded: 0,
  suspiciousActivities: 0,
  authFailures: 0,
  authzFailures: 0,
  inputValidationFailures: 0,
  fileUploadFailures: 0,
  apiErrors: 0
}

// Update security metrics
export function updateSecurityMetrics(eventType: SecurityEvent['eventType'], success: boolean = true): void {
  securityMetrics.totalRequests++
  
  if (!success) {
    switch (eventType) {
      case 'rate_limit':
        securityMetrics.rateLimitExceeded++
        break
      case 'suspicious_activity':
        securityMetrics.suspiciousActivities++
        break
      case 'authentication_failure':
        securityMetrics.authFailures++
        break
      case 'authorization_failure':
        securityMetrics.authzFailures++
        break
      case 'input_validation':
        securityMetrics.inputValidationFailures++
        break
      case 'file_upload':
        securityMetrics.fileUploadFailures++
        break
      case 'api_access':
        securityMetrics.apiErrors++
        break
    }
  }
}

// Get security metrics
export function getSecurityMetrics(): SecurityMetrics {
  return { ...securityMetrics }
}

// Reset security metrics (useful for testing)
export function resetSecurityMetrics(): void {
  securityMetrics = {
    totalRequests: 0,
    rateLimitExceeded: 0,
    suspiciousActivities: 0,
    authFailures: 0,
    authzFailures: 0,
    inputValidationFailures: 0,
    fileUploadFailures: 0,
    apiErrors: 0
  }
}

// Import the detectSuspiciousPatterns function
import { detectSuspiciousPatterns } from './middleware'
