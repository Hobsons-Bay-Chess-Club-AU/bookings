# Emergency Logout System

This system provides comprehensive logout functionality for when Supabase auth gets into a messy state and regular logout methods don't work properly.

## Files Created/Modified

### 1. `/src/app/auth/logout/page.tsx`
A comprehensive logout page that performs complete session cleanup:
- Clears localStorage and sessionStorage
- Calls server-side logout API
- Forces Supabase global signout
- Clears all cookies
- Provides visual feedback during the process

**Usage:** Navigate to `/auth/logout` in your browser

### 2. `/src/app/api/auth/logout/route.ts`
Server-side API endpoint for logout:
- Performs server-side Supabase signout
- Clears auth-related cookies
- Supports both POST and GET requests

**Usage:** 
```javascript
fetch('/api/auth/logout', { method: 'POST' })
```

### 3. `/src/components/auth/emergency-logout.tsx`
A reusable component for emergency logout:
- Direct navigation to the logout page
- Can be styled as button or link
- Includes helpful tooltip

**Usage:**
```jsx
import EmergencyLogout from '@/components/auth/emergency-logout'

// As a button (default)
<EmergencyLogout />

// As a link
<EmergencyLogout variant="link" />

// Custom styling
<EmergencyLogout className="my-custom-class" variant="button">
  Force Logout
</EmergencyLogout>
```

### 4. Updated `/src/components/auth/logout-button.tsx`
Enhanced the existing logout button:
- Shows emergency logout option if normal logout fails
- Provides fallback mechanism

## When to Use

### Use the emergency logout system when:
1. `supabase.auth.getUser()` hangs or doesn't respond
2. Regular logout buttons don't work
3. You're stuck in an authenticated state
4. Supabase auth state becomes inconsistent
5. You need to force a complete session cleanup

### Quick Access Methods:

1. **Direct URL:** Navigate to `/auth/logout`
2. **Emergency Component:** Add `<EmergencyLogout />` anywhere in your UI
3. **API Call:** `fetch('/api/auth/logout', { method: 'POST' })`
4. **Enhanced Logout Button:** The regular logout button now shows emergency option on failure

## What Gets Cleaned Up

- All localStorage items containing 'sb-' or 'supabase'
- All sessionStorage items containing 'sb-' or 'supabase'
- Server-side Supabase session
- Client-side Supabase session (global scope)
- All browser cookies (set to expire)
- Auth-specific cookies on server

## Example Scenarios

### Scenario 1: Auth hanging in browser
```
User reports: "The page is stuck loading and auth.getUser() never resolves"
Solution: Navigate to /auth/logout or use <EmergencyLogout />
```

### Scenario 2: Regular logout not working
```
User clicks normal logout button, but stays logged in
Solution: The logout button will now show "Emergency Logout" option automatically
```

### Scenario 3: Debugging auth issues
```
During development, auth state gets messy
Solution: Use /auth/logout to completely reset auth state
```

## Development Notes

- The logout page provides visual feedback during cleanup
- All methods are fail-safe - even if some steps fail, others continue
- The page automatically redirects to home after completion
- Server-side cleanup is attempted but failure won't block client-side cleanup
- Emergency logout can be used even when normal React components aren't working

## Browser Compatibility

- Works in all modern browsers
- Uses standard web APIs (localStorage, sessionStorage, fetch, cookies)
- No special dependencies beyond existing Supabase setup
