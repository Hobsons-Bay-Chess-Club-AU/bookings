# Security Implementation Guide

This document outlines the comprehensive security measures implemented in the booking application to protect against various threats and vulnerabilities.

## 🛡️ Security Overview

The application implements multiple layers of security to protect against:
- Cross-Site Scripting (XSS) attacks
- Cross-Site Request Forgery (CSRF) attacks
- Clickjacking attacks
- MIME type sniffing attacks
- SQL injection attacks
- Rate limiting abuse
- Unauthorized access
- Data breaches

## 🔒 Security Headers

### Implemented Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking attacks |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information |
| `Permissions-Policy` | Multiple restrictions | Controls browser features |
| `Content-Security-Policy` | Comprehensive policy | Prevents XSS and other attacks |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Enforces HTTPS |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Prevents cross-origin attacks |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents cross-origin resource access |
| `Origin-Agent-Cluster` | `?1` | Additional isolation |

### Content Security Policy (CSP)

The CSP is configured to allow only necessary resources:

```typescript
"Content-Security-Policy": [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com",
  "img-src 'self' data: https: blob: https://maps.googleapis.com https://maps.gstatic.com https://streetviewpixels-pa.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://va.vercel-scripts.com https://maps.googleapis.com",
  "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "upgrade-insecure-requests"
].join('; ')
```

## 🚦 Rate Limiting

### Rate Limit Configuration

| Endpoint Category | Rate Limit | Description |
|------------------|------------|-------------|
| Authentication | 5 requests/minute | Login, logout, password reset |
| Booking | 20 requests/minute | Booking creation, checkout sessions |
| Events | 10 requests/minute | Event creation, editing, management |
| Admin | 50 requests/minute | Admin dashboard, content management |
| Webhooks | 100 requests/minute | Stripe webhooks, external integrations |
| Content | 30 requests/minute | CMS operations, content editing |
| Search | 60 requests/minute | Player search, event search |
| General API | 100 requests/minute | Other API endpoints |
| Public Pages | 200 requests/minute | Public website pages |

### Rate Limiting Features

- **Distributed**: Works across multiple server instances
- **User-specific**: Authenticated users rate limited by user ID
- **IP-based**: Unauthenticated requests rate limited by IP address
- **Graceful fallback**: Application works normally if Redis is unavailable
- **Analytics**: Rate limiting data tracked for monitoring

## 🔐 Authentication & Authorization

### Authentication Security

- **Supabase Auth**: Secure authentication with JWT tokens
- **Session Management**: Automatic session refresh and validation
- **Password Security**: Strong password requirements enforced
- **Multi-factor Authentication**: Ready for future implementation

### Authorization Security

- **Role-based Access Control (RBAC)**: User, organizer, admin roles
- **Row Level Security (RLS)**: Database-level access control
- **Route Protection**: Middleware-based route protection
- **API Authorization**: Endpoint-level authorization checks

## 🛠️ Input Validation & Sanitization

### Input Validation

```typescript
// Required field validation
const validation = validateRequiredFields(data, ['email', 'password'])

// Email validation
const isValidEmail = validateEmail(email)

// URL validation
const isValidUrl = validateUrl(url)

// File upload validation
const fileValidation = validateFileUpload(file, maxSize, allowedTypes)
```

### Input Sanitization

```typescript
// XSS prevention
const sanitizedInput = sanitizeInput(userInput)

// Suspicious pattern detection
const suspiciousPatterns = detectSuspiciousPatterns(input)
```

### Suspicious Pattern Detection

The system detects and blocks:
- Script tags (`<script>`)
- JavaScript protocol (`javascript:`)
- Event handlers (`onclick`, `onload`, etc.)
- Eval functions (`eval()`)
- Document/window object access
- Alert/confirm/prompt functions
- Iframe/object/embed tags

## 📊 Security Monitoring & Auditing

### Security Event Logging

All security events are logged with:
- Timestamp and request ID
- IP address and user agent
- Event type and severity
- User ID (if authenticated)
- Detailed event information

### Security Metrics

The system tracks:
- Total requests
- Rate limit violations
- Suspicious activities
- Authentication failures
- Authorization failures
- Input validation failures
- File upload failures
- API errors

### Security Status Endpoint

Check security status at `/api/security/status`:

```json
{
  "security": {
    "headers": {
      "configured": true,
      "count": 11,
      "enabled": ["X-Frame-Options", "X-Content-Type-Options", ...]
    },
    "rateLimiting": {
      "enabled": true,
      "configured": true
    }
  },
  "metrics": {
    "totalRequests": 1000,
    "successRate": "98.5%"
  },
  "recommendations": ["Security configuration looks good!"]
}
```

## 🔧 Security Utilities

### Secure Response Functions

```typescript
// Success response
return successResponse(data)

// Error response
return errorResponse('Error message', 400)

// Validation error
return validationErrorResponse(errors)

// Unauthorized response
return unauthorizedResponse()

// Forbidden response
return forbiddenResponse()

// Not found response
return notFoundResponse()

// Server error response
return serverErrorResponse('Error message', errorId)
```

### Security Middleware

```typescript
// Apply security checks to API routes
export const POST = withSecurityChecks(async (request) => {
  // Your API logic here
})

// Validate request body
const { isValid, data, errors } = await validateRequestBody(request, requiredFields)

// Check for suspicious activity
const suspiciousHeaders = checkSuspiciousHeaders(request)
```

## 🚨 Security Best Practices

### Development Security

1. **Environment Variables**: Never commit sensitive data to version control
2. **Input Validation**: Always validate and sanitize user input
3. **Error Handling**: Don't expose sensitive information in error messages
4. **Dependencies**: Regularly update dependencies for security patches
5. **Code Review**: Review all code changes for security issues

### Production Security

1. **HTTPS Only**: Enforce HTTPS in production
2. **Security Headers**: Ensure all security headers are enabled
3. **Rate Limiting**: Enable rate limiting for all endpoints
4. **Monitoring**: Monitor security events and metrics
5. **Backups**: Regular secure backups of data
6. **Updates**: Keep all systems and dependencies updated

### API Security

1. **Authentication**: Require authentication for sensitive endpoints
2. **Authorization**: Check user permissions for all operations
3. **Input Validation**: Validate all input parameters
4. **Rate Limiting**: Apply appropriate rate limits
5. **Logging**: Log all API access and security events
6. **Error Handling**: Return appropriate error responses

## 🔍 Security Testing

### Manual Testing

1. **Security Headers**: Check headers using browser dev tools
2. **Rate Limiting**: Test rate limits by making multiple requests
3. **Input Validation**: Test with malicious input
4. **Authentication**: Test unauthorized access attempts
5. **Authorization**: Test role-based access control

### Automated Testing

```typescript
// Test security headers
test('should have security headers', async () => {
  const response = await fetch('/api/test')
  expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
})

// Test rate limiting
test('should rate limit requests', async () => {
  const requests = Array(10).fill(null).map(() => fetch('/api/auth/login'))
  const responses = await Promise.all(requests)
  const rateLimited = responses.filter(r => r.status === 429)
  expect(rateLimited.length).toBeGreaterThan(0)
})
```

## 🚀 Security Deployment Checklist

### Pre-deployment

- [ ] All security headers configured
- [ ] Rate limiting enabled
- [ ] Environment variables set
- [ ] HTTPS configured
- [ ] Database security policies applied
- [ ] Input validation implemented
- [ ] Error handling configured
- [ ] Logging enabled

### Post-deployment

- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Monitoring configured
- [ ] Backup system tested
- [ ] Security status endpoint working

## 📚 Security Resources

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

### Tools

- [Security Headers Checker](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

## 🆘 Security Incident Response

### Immediate Actions

1. **Isolate**: Identify and isolate affected systems
2. **Assess**: Determine the scope and impact
3. **Contain**: Stop the attack and prevent further damage
4. **Document**: Record all details of the incident
5. **Notify**: Inform relevant stakeholders

### Investigation

1. **Logs**: Review security logs and metrics
2. **Timeline**: Create timeline of events
3. **Root Cause**: Identify the root cause
4. **Impact**: Assess data and system impact
5. **Evidence**: Preserve evidence for analysis

### Recovery

1. **Patches**: Apply security patches
2. **Configuration**: Update security configuration
3. **Monitoring**: Enhance monitoring and alerting
4. **Testing**: Test security measures
5. **Documentation**: Update security documentation

## 📞 Security Support

For security issues or questions:

1. **Check Logs**: Review security event logs
2. **Status Endpoint**: Check `/api/security/status`
3. **Documentation**: Review this security guide
4. **Monitoring**: Check security metrics
5. **Contact**: Reach out to the development team

---

**Remember**: Security is an ongoing process. Regularly review and update security measures to protect against new threats and vulnerabilities.
