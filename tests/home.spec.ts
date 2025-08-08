import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page successfully', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Hobsons Bay Chess Club/);
  });

  test('should display hero section with correct content', async ({ page }) => {
    await page.goto('/');
    
    // Check hero section exists and has correct content
    const heroSection = page.locator('div').filter({ hasText: 'Discover Amazing Events' });
    await expect(heroSection).toBeVisible();
    
    // Check hero title
    await expect(page.getByRole('heading', { name: 'Discover Amazing Events' })).toBeVisible();
    
    // Check hero description
    await expect(page.getByText(/Find and book tickets for the best events/)).toBeVisible();
  });

  test('should display events section', async ({ page }) => {
    await page.goto('/');
    
    // Check events section exists
    const eventsSection = page.locator('div').filter({ hasText: 'Upcoming Events' });
    await expect(eventsSection).toBeVisible();
    
    // Check section title
    await expect(page.getByRole('heading', { name: 'Upcoming Events' })).toBeVisible();
    
    // Check section description
    await expect(page.getByText(/Browse our selection of upcoming events/)).toBeVisible();
  });

  test('should handle no events gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Check if no events message is displayed (when there are no events)
    const noEventsMessage = page.getByText('No events available at the moment.');
    const eventsGrid = page.locator('.grid').filter({ hasText: 'View Details & Book' });
    
    // Either no events message OR events grid should be visible
    await expect(noEventsMessage.or(eventsGrid)).toBeVisible();
  });

  test('should display event cards with correct structure when events exist', async ({ page }) => {
    await page.goto('/');
    
    // Look for event cards
    const eventCards = page.locator('.bg-white.dark\\:bg-gray-800.overflow-hidden.shadow-lg.rounded-lg');
    
    // If there are events, check their structure
    const cardCount = await eventCards.count();
    if (cardCount > 0) {
      // Check first event card structure
      const firstCard = eventCards.first();
      
      // Should have event title
      await expect(firstCard.locator('h3')).toBeVisible();
      
      // Should have date
      await expect(firstCard.locator('p').filter({ hasText: /^\d{1,2}\/\d{1,2}\/\d{4}$/ })).toBeVisible();
      
      // Should have location
      await expect(firstCard.locator('p').filter({ hasText: /📍/ })).toBeVisible();
      
      // Should have price
      await expect(firstCard.locator('p').filter({ hasText: /AUD \$/ })).toBeVisible();
      
      // Should have "View Details & Book" button
      await expect(firstCard.getByRole('link', { name: 'View Details & Book' })).toBeVisible();
    }
  });

  test('should have working navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page has proper navigation structure
    // Look for common navigation elements
    const navElements = page.locator('nav, [role="navigation"]');
    await expect(navElements).toBeVisible();
  });

  test('should be responsive and load on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check that the page loads without horizontal scroll
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(375);
    
    // Check that hero section is still visible
    await expect(page.getByRole('heading', { name: 'Discover Amazing Events' })).toBeVisible();
  });

  test('should have proper meta tags and SEO elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toBeVisible();
    
    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeVisible();
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that there are no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
