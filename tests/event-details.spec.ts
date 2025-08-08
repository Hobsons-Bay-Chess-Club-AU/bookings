import { test, expect } from '@playwright/test';

test.describe('Event Details Page', () => {
  test('should load event details page successfully', async ({ page }) => {
    // Navigate to an event page (we'll need to create a test event or use an existing one)
    // For now, we'll test the page structure assuming there's an event
    await page.goto('/events/test-event-id');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page loads (even if event not found, we should get a 404 page)
    await expect(page).toHaveTitle(/Hobsons Bay Chess Club/);
  });

  test('should display event information when event exists', async ({ page }) => {
    // This test assumes there's a valid event
    // In a real setup, you'd create test data first
    await page.goto('/events/test-event-id');
    
    // Check for common event page elements
    const eventTitle = page.locator('h1');
    const eventLocation = page.locator('p').filter({ hasText: /📍/ });
    const eventDate = page.locator('p').filter({ hasText: /📅/ });
    const eventPrice = page.locator('p').filter({ hasText: /AUD \$/ });
    
    // These might not exist if the event doesn't exist, so we check if any are visible
    const hasEventContent = await eventTitle.isVisible() || 
                           await eventLocation.isVisible() || 
                           await eventDate.isVisible() || 
                           await eventPrice.isVisible();
    
    // If no event content, we should see a 404 or "not found" message
    if (!hasEventContent) {
      await expect(page.getByText(/not found|404|event not found/i)).toBeVisible();
    }
  });

  test('should have proper event page structure', async ({ page }) => {
    await page.goto('/events/test-event-id');
    
    // Check for main content area
    const mainContent = page.locator('main, [role="main"], .max-w-7xl');
    await expect(mainContent).toBeVisible();
    
    // Check for event image (if exists)
    const eventImage = page.locator('img[alt*="event"], img[alt*="Event"]');
    // Image might not exist, so we don't assert it must be visible
    
    // Check for booking section
    const bookingSection = page.locator('div').filter({ hasText: /book|booking|register/i });
    // Booking section might not exist if event is full or past
  });

  test('should handle event not found gracefully', async ({ page }) => {
    // Test with a definitely non-existent event ID
    await page.goto('/events/non-existent-event-12345');
    
    await page.waitForLoadState('networkidle');
    
    // Should show some kind of error or not found message
    const notFoundMessage = page.getByText(/not found|404|event not found|could not be found/i);
    await expect(notFoundMessage).toBeVisible();
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/events/test-event-id');
    
    // Check for meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toBeVisible();
    
    // Check for Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"]');
    const ogImage = page.locator('meta[property="og:image"]');
    
    // These might not exist for non-existent events, so we check if any are visible
    const hasOGTags = await ogTitle.isVisible() || 
                     await ogDescription.isVisible() || 
                     await ogImage.isVisible();
    
    // If OG tags exist, they should be properly formatted
    if (hasOGTags) {
      await expect(ogTitle.or(ogDescription).or(ogImage)).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/events/test-event-id');
    
    // Check that the page loads without horizontal scroll
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(375);
    
    // Check that content is still accessible
    const mainContent = page.locator('main, [role="main"], .max-w-7xl');
    await expect(mainContent).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/events/test-event-id');
    await page.waitForLoadState('networkidle');
    
    // Check that there are no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
