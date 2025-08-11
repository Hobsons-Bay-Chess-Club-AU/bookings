import { NextResponse } from 'next/server'

// Security headers configuration
export const securityHeaders = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy - control browser features
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'encrypted-media=()',
    'fullscreen=()',
    'picture-in-picture=()',
    'publickey-credentials-get=()',
    'screen-wake-lock=()',
    'sync-xhr=()',
    'web-share=()',
    'xr-spatial-tracking=()'
  ].join(', '),
  
  // Content Security Policy
  'Content-Security-Policy': [
    // Default source restrictions
    "default-src 'self'",
    
    // Script sources - allow self, Stripe, Google Maps, and inline scripts for Next.js
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://maps.googleapis.com https://maps.gstatic.com",
    
    // Style sources - allow self, inline styles for Tailwind, and Google Maps
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com",
    
    // Image sources - allow self, data URIs, external image services, and Google Maps
    "img-src 'self' data: https: blob: https://maps.googleapis.com https://maps.gstatic.com https://streetviewpixels-pa.googleapis.com",
    
    // Font sources - allow self and Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    
    // Connect sources - allow self, Supabase, Stripe, analytics, and Google Maps
    "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://va.vercel-scripts.com https://maps.googleapis.com",
    
    // Frame sources - allow Stripe checkout and Google Maps
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.google.com https://maps.google.com",
    
    // Object sources - deny all
    "object-src 'none'",
    
    // Base URI - restrict to self
    "base-uri 'self'",
    
    // Form action - allow self and Stripe
    "form-action 'self' https://checkout.stripe.com",
    
    // Upgrade insecure requests
    "upgrade-insecure-requests"
  ].join('; '),
  
  // XSS Protection (legacy but still useful)
  'X-XSS-Protection': '1; mode=block',
  
  // Strict Transport Security (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Cross-Origin Embedder Policy
  'Cross-Origin-Embedder-Policy': 'require-corp',
  
  // Cross-Origin Opener Policy
  'Cross-Origin-Opener-Policy': 'same-origin',
  
  // Cross-Origin Resource Policy
  'Cross-Origin-Resource-Policy': 'same-origin',
  
  // Origin Agent Cluster
  'Origin-Agent-Cluster': '?1',
}

// Function to apply security headers to a response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

// Function to create a response with security headers
export function createSecureResponse(
  body: string | object,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(
    typeof body === 'string' ? { message: body } : body,
    { status }
  )
  
  // Apply security headers
  applySecurityHeaders(response)
  
  // Apply additional headers
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

// Function to create a secure redirect response
export function createSecureRedirect(url: string, status: number = 302): NextResponse {
  const response = NextResponse.redirect(url, status)
  applySecurityHeaders(response)
  return response
}

// Function to create a secure rewrite response
export function createSecureRewrite(url: string): NextResponse {
  const response = NextResponse.rewrite(url)
  applySecurityHeaders(response)
  return response
}

// CSP nonce generator for inline scripts (if needed)
export function generateCSPNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Function to get CSP with nonce for inline scripts
export function getCSPWithNonce(nonce: string): string {
  const csp = securityHeaders['Content-Security-Policy']
  return csp.replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`)
}

// Environment-specific security headers
export function getEnvironmentSecurityHeaders(): Record<string, string> {
  const headers = { ...securityHeaders }
  
  // In development, relax some restrictions
  if (process.env.NODE_ENV === 'development') {
    headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace(
      "default-src 'self'",
      "default-src 'self' 'unsafe-eval' 'unsafe-inline'"
    )
    
    // Relax HSTS in development
    headers['Strict-Transport-Security'] = 'max-age=0'
  }
  
  return headers
}
