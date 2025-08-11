# Stripe Content Security Policy (CSP) Update

This document describes the updates made to the Content Security Policy to allow Stripe.js to load properly.

## Problem

The content security policy was blocking:
1. **Stripe.js** from loading, causing the error "Failed to load Stripe.js" when users tried to make payments
2. **Stripe checkout redirects** in step 4 of the booking process
3. **Google Maps embed URLs** (https://www.google.com/maps/embed) from loading properly
4. **COEP (Cross-Origin Embedder Policy)** blocking Stripe.js with `net::ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep`
5. **Vercel Speed Insights** script being blocked by CSP

## Solution

Updated the Content Security Policy in `src/lib/security/headers.ts` to include comprehensive Stripe domain coverage and Google Maps embed support.

## Updated CSP Directives

### Script Sources (`script-src`)
Added additional Stripe domains:
- `https://js.stripe.com` (already present)
- `https://checkout.stripe.com` (already present)
- `https://m.stripe.com` (added)
- `https://b.stripecdn.com` (added)
- `https://va.vercel-scripts.com` (added for Vercel Speed Insights)

### Style Sources (`style-src`)
Added Stripe domains for styling:
- `https://js.stripe.com` (added)

### Image Sources (`img-src`)
Added Stripe domains for images:
- `https://js.stripe.com` (added)
- `https://m.stripe.com` (added)
- `https://b.stripecdn.com` (added)

### Font Sources (`font-src`)
Added Stripe domains for fonts:
- `https://js.stripe.com` (added)
- `https://b.stripecdn.com` (added)

### Connect Sources (`connect-src`)
Added additional Stripe domains for API connections:
- `https://m.stripe.com` (added)
- `wss://*.stripe.com` (added for WebSocket connections)
- `https://hooks.stripe.com` (added for webhooks)
- `https://b.stripecdn.com` (added)
- `https://pay.stripe.com` (added for payment pages)
- `https://www.google.com/maps/embed` (added for Google Maps embeds)

### Frame Sources (`frame-src`)
Added additional Stripe domains for iframes:
- `https://m.stripe.com` (added)
- `https://pay.stripe.com` (added for payment pages)
- `https://www.google.com/maps/embed` (added for Google Maps embeds)

## Complete Updated CSP

```javascript
'Content-Security-Policy': [
  // Default source restrictions
  "default-src 'self'",
  
  // Script sources - allow self, Stripe, Google Maps, Vercel Speed Insights, and inline scripts for Next.js
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://m.stripe.com https://maps.googleapis.com https://maps.gstatic.com https://b.stripecdn.com https://va.vercel-scripts.com",
  
  // Style sources - allow self, inline styles for Tailwind, and Google Maps
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com https://js.stripe.com",
  
  // Image sources - allow self, data URIs, external image services, and Google Maps
  "img-src 'self' data: https: blob: https://maps.googleapis.com https://maps.gstatic.com https://streetviewpixels-pa.googleapis.com https://js.stripe.com https://m.stripe.com https://b.stripecdn.com https://checkout.stripe.com https://pay.stripe.com",
  
  // Font sources - allow self and Google Fonts
  "font-src 'self' https://fonts.gstatic.com https://js.stripe.com https://b.stripecdn.com",
  
  // Connect sources - allow self, Supabase, Stripe, analytics, and Google Maps
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://m.stripe.com https://va.vercel-scripts.com https://maps.googleapis.com wss://*.stripe.com https://hooks.stripe.com https://b.stripecdn.com https://pay.stripe.com https://www.google.com/maps/embed",
  
  // Frame sources - allow Stripe checkout and Google Maps
  "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://m.stripe.com https://www.google.com https://maps.google.com https://checkout.stripe.com https://pay.stripe.com https://www.google.com/maps/embed",
  
  // Object sources - deny all
  "object-src 'none'",
  
  // Base URI - restrict to self
  "base-uri 'self'",
  
  // Form action - allow self and Stripe
  "form-action 'self' https://checkout.stripe.com",
  
  // Navigate to - allow navigation to Stripe checkout and Google Maps (CSP Level 3)
  "navigate-to 'self' https://checkout.stripe.com https://pay.stripe.com https://www.google.com/maps/embed",
  
  // Upgrade insecure requests
  "upgrade-insecure-requests"
].join('; ')
```

## Security Headers Updated

### Cross-Origin Embedder Policy (COEP)
- **Changed from**: `require-corp` 
- **Changed to**: `unsafe-none`
- **Reason**: To prevent `NotSameOriginAfterDefaultedToSameOriginByCoep` errors when loading Stripe.js

## Stripe Domains Added

### Core Stripe Domains
- `https://js.stripe.com` - Main Stripe JavaScript library
- `https://checkout.stripe.com` - Stripe Checkout
- `https://api.stripe.com` - Stripe API endpoints
- `https://hooks.stripe.com` - Stripe webhooks

### Additional Stripe Domains
- `https://m.stripe.com` - Mobile Stripe components
- `https://b.stripecdn.com` - Stripe CDN for assets
- `wss://*.stripe.com` - WebSocket connections for real-time features
- `https://pay.stripe.com` - Stripe payment pages

### Google Maps Domains
- `https://www.google.com/maps/embed` - Google Maps embed functionality

### Vercel Domains
- `https://va.vercel-scripts.com` - Vercel Speed Insights analytics

## Benefits

1. **Stripe.js Loading**: Stripe.js will now load properly without CSP violations
2. **Payment Processing**: Users can complete payments without security policy blocks
3. **Stripe Checkout Redirects**: Step 4 redirects to Stripe checkout work correctly
4. **Google Maps Embeds**: Google Maps embed URLs load without CSP blocking
5. **COEP Compatibility**: Cross-Origin Embedder Policy relaxed to allow Stripe.js
6. **Vercel Speed Insights**: Analytics script loads without CSP blocking
7. **Real-time Features**: WebSocket connections work for real-time payment updates
8. **Asset Loading**: All Stripe assets (images, fonts, styles) load correctly
9. **Security Maintained**: CSP still provides strong security while allowing necessary functionality

## Testing

To verify the fix:

1. **Check Browser Console**: No CSP violations related to Stripe, Google Maps, or Vercel domains
2. **Test Payment Flow**: Complete a test payment to ensure Stripe.js loads
3. **Test Checkout Redirect**: Verify step 4 redirects to Stripe checkout work
4. **Test Google Maps**: Ensure Google Maps embeds load without CSP blocking
5. **Test Vercel Speed Insights**: Verify analytics script loads without blocking
6. **Check COEP**: Ensure no `NotSameOriginAfterDefaultedToSameOriginByCoep` errors
7. **Verify Assets**: Check that Stripe images and styles load correctly
8. **Monitor Network**: Ensure all Stripe, Google Maps, and Vercel requests go through without blocking

## Monitoring

Monitor the following for any remaining CSP issues:

1. **Browser Console**: Look for any remaining CSP violations
2. **Payment Success Rate**: Ensure payment completion rates remain high
3. **User Reports**: Monitor for any user reports of payment issues
4. **Stripe Dashboard**: Check for any failed payment attempts due to client-side issues

## Future Considerations

### Adding New Stripe Features
When adding new Stripe features:

1. Check if new domains are required
2. Update CSP accordingly
3. Test thoroughly in development
4. Monitor for any CSP violations

### Security Best Practices
- Keep CSP as restrictive as possible while allowing necessary functionality
- Regularly review and update CSP based on Stripe's recommendations
- Monitor for any security advisories from Stripe

## Conclusion

The updated Content Security Policy now properly allows Stripe.js to load and function correctly while maintaining strong security standards. All Stripe payment functionality should work without CSP-related issues.
