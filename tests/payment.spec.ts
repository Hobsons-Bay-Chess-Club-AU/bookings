import { test, expect } from '@playwright/test';
import { 
  TEST_CARDS, 
  fillPaymentForm, 
  fillStripeElements, 
  testSuccessfulPayment, 
  testFailedPayment,
  getTestCard,
  TEST_CARD_SCENARIOS 
} from './utils/payment-helpers';

test.describe('Payment Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page with payment form (adjust URL as needed)
    // This is a placeholder - you'll need to adjust based on your app's payment flow
    await page.goto('/events/some-event-id/booking');
  });

  test('should load payment form successfully', async ({ page }) => {
    // Skip this test for now since we don't have a real payment form
    // This test will work once you have a real payment form in your app
    test.skip();
    
    // Check that payment form elements are present
    await expect(page.getByLabel(/card number|number/i)).toBeVisible();
    await expect(page.getByLabel(/expiry|expiration/i)).toBeVisible();
    await expect(page.getByLabel(/cvc|cvv|security code/i)).toBeVisible();
    await expect(page.getByLabel(/name|cardholder/i)).toBeVisible();
  });

  test('should complete payment with valid Mastercard', async ({ page }) => {
    // Use the test card from environment variables
    await testSuccessfulPayment(page, TEST_CARDS.mastercard);
  });

  test('should complete payment with valid Visa', async ({ page }) => {
    await testSuccessfulPayment(page, TEST_CARDS.visa);
  });

  test('should complete payment with valid Amex', async ({ page }) => {
    await testSuccessfulPayment(page, TEST_CARDS.amex);
  });

  test('should handle declined payment', async ({ page }) => {
    const declinedCard = getTestCard('declined');
    await testFailedPayment(page, declinedCard);
  });

  test('should handle insufficient funds', async ({ page }) => {
    const insufficientFundsCard = getTestCard('insufficientFunds');
    await testFailedPayment(page, insufficientFundsCard);
  });

  test('should handle expired card', async ({ page }) => {
    const expiredCard = getTestCard('expired');
    await testFailedPayment(page, expiredCard);
  });

  test('should handle invalid CVC', async ({ page }) => {
    const invalidCvcCard = getTestCard('invalidCvc');
    await testFailedPayment(page, invalidCvcCard);
  });

  test('should fill payment form correctly', async ({ page }) => {
    await fillPaymentForm(page, TEST_CARDS.mastercard);
    
    // Verify form is filled correctly
    await expect(page.getByLabel(/card number|number/i)).toHaveValue(TEST_CARDS.mastercard.number);
    await expect(page.getByLabel(/expiry|expiration/i)).toHaveValue(`${TEST_CARDS.mastercard.expiryMonth}/${TEST_CARDS.mastercard.expiryYear}`);
    await expect(page.getByLabel(/cvc|cvv|security code/i)).toHaveValue(TEST_CARDS.mastercard.cvc);
    await expect(page.getByLabel(/name|cardholder/i)).toHaveValue(TEST_CARDS.mastercard.holder);
  });

  test('should fill Stripe Elements correctly', async ({ page }) => {
    // This test assumes you're using Stripe Elements
    await fillStripeElements(page, TEST_CARDS.mastercard);
    
    // Verify Stripe Elements are filled (this might need adjustment based on your Stripe setup)
    const cardNumberFrame = page.frameLocator('iframe[title="Secure card number input frame"]');
    await expect(cardNumberFrame.getByRole('textbox')).toHaveValue(TEST_CARDS.mastercard.number);
  });

  test('should validate card number format', async ({ page }) => {
    // Test with invalid card number
    const invalidCard = {
      ...TEST_CARDS.mastercard,
      number: '1234567890123456' // Invalid card number
    };
    
    await fillPaymentForm(page, invalidCard);
    await page.getByRole('button', { name: /pay|submit|confirm/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible();
  });

  test('should validate expiry date', async ({ page }) => {
    // Test with past expiry date
    const pastExpiryCard = {
      ...TEST_CARDS.mastercard,
      expiryMonth: '01',
      expiryYear: '2020'
    };
    
    await fillPaymentForm(page, pastExpiryCard);
    await page.getByRole('button', { name: /pay|submit|confirm/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/expired|invalid|error/i)).toBeVisible();
  });

  test('should validate CVC format', async ({ page }) => {
    // Test with invalid CVC
    const invalidCvcCard = {
      ...TEST_CARDS.mastercard,
      cvc: '12' // Too short
    };
    
    await fillPaymentForm(page, invalidCvcCard);
    await page.getByRole('button', { name: /pay|submit|confirm/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible();
  });

  test('should handle payment processing state', async ({ page }) => {
    await fillPaymentForm(page, TEST_CARDS.mastercard);
    
    // Submit payment
    await page.getByRole('button', { name: /pay|submit|confirm/i }).click();
    
    // Should show processing state
    await expect(page.getByText(/processing|loading/i)).toBeVisible();
    
    // Wait for completion
    await page.waitForLoadState('networkidle');
    
    // Should show success or error
    await expect(page.getByText(/success|confirmed|declined|error/i)).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that payment form is still accessible
    await expect(page.getByLabel(/card number|number/i)).toBeVisible();
    await expect(page.getByLabel(/expiry|expiration/i)).toBeVisible();
    await expect(page.getByLabel(/cvc|cvv|security code/i)).toBeVisible();
    await expect(page.getByLabel(/name|cardholder/i)).toBeVisible();
    
    // Check that page loads without horizontal scroll
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(375);
  });

  test('should have proper security attributes', async ({ page }) => {
    // Check that sensitive fields have proper security attributes
    const cardNumberField = page.getByLabel(/card number|number/i);
    await expect(cardNumberField).toHaveAttribute('autocomplete', 'cc-number');
    
    const cvcField = page.getByLabel(/cvc|cvv|security code/i);
    await expect(cvcField).toHaveAttribute('autocomplete', 'cc-csc');
    
    const expiryField = page.getByLabel(/expiry|expiration/i);
    await expect(expiryField).toHaveAttribute('autocomplete', 'cc-exp');
  });

  test('should not expose sensitive information in page source', async ({ page }) => {
    // Get page content
    const content = await page.content();
    
    // Check that no test card numbers are exposed
    expect(content).not.toContain('5200828282828210');
    expect(content).not.toContain('4242424242424242');
    expect(content).not.toContain('378282246310005');
    
    // Check that no CVC codes are exposed
    expect(content).not.toContain('123');
    expect(content).not.toContain('1234');
  });

  test('should have payment helpers configured correctly', async ({ page }) => {
    // Test that payment helpers are properly configured
    expect(TEST_CARDS.mastercard.number).toBe('5200828282828210');
    expect(TEST_CARDS.mastercard.cvc).toBe('123');
    expect(TEST_CARDS.mastercard.expiryMonth).toBe('12');
    expect(TEST_CARDS.mastercard.expiryYear).toBe('2025');
    expect(TEST_CARDS.mastercard.holder).toBe('Test User');
    
    // Test that environment variables are loaded
    expect(process.env.TEST_CARD_NUMBER).toBe('5200828282828210');
    expect(process.env.TEST_CARD_CVC).toBe('123');
    expect(process.env.TEST_CARD_EXPIRY_MONTH).toBe('12');
    expect(process.env.TEST_CARD_EXPIRY_YEAR).toBe('2025');
    expect(process.env.TEST_CARD_HOLDER).toBe('Test User');
  });
});
