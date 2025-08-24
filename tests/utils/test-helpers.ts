import { Page, expect } from '@playwright/test';

/**
 * Helper function to wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Helper function to check if element is visible and has text
 */
export async function expectElementWithText(page: Page, selector: string, text: string) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await expect(element).toContainText(text);
}

/**
 * Helper function to check for console errors
 */
export async function checkForConsoleErrors(page: Page): Promise<string[]> {
  const consoleErrors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  return consoleErrors;
}

/**
 * Helper function to check page responsiveness
 */
export async function checkPageResponsiveness(page: Page, viewportWidth: number) {
  await page.setViewportSize({ width: viewportWidth, height: 667 });
  
  const body = page.locator('body');
  const bodyBox = await body.boundingBox();
  expect(bodyBox?.width).toBeLessThanOrEqual(viewportWidth);
}

/**
 * Helper function to check SEO meta tags
 */
export async function checkSEOMetaTags(page: Page) {
  // Check for meta description
  const metaDescription = page.locator('meta[name="description"]');
  await expect(metaDescription).toBeVisible();
  
  // Check for viewport meta tag
  const viewport = page.locator('meta[name="viewport"]');
  await expect(viewport).toBeVisible();
  
  // Check for title
  const title = page.locator('title');
  await expect(title).toBeVisible();
}

/**
 * Helper function to check for common page elements
 */
export async function checkCommonPageElements(page: Page) {
  // Check for main content area
  const mainContent = page.locator('main, [role="main"], .max-w-9xl');
  await expect(mainContent).toBeVisible();
  
  // Check for navigation
  const nav = page.locator('nav, [role="navigation"]');
  await expect(nav).toBeVisible();
}

/**
 * Helper function to create test data (placeholder for future use)
 */
export async function createTestEvent() {
  // This would be implemented to create test events in the database
  // For now, it's a placeholder
  console.log('Test event creation not implemented yet');
}

/**
 * Helper function to clean up test data (placeholder for future use)
 */
export async function cleanupTestData() {
  // This would be implemented to clean up test data from the database
  // For now, it's a placeholder
  console.log('Test data cleanup not implemented yet');
}
