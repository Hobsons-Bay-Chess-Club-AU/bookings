# Integration Tests

This directory contains Playwright integration tests for the Hobsons Bay Chess Club booking system.

## Setup

The tests are configured to run against `http://localhost:3000` and will automatically start the development server when running tests.

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test

# Run tests with UI (interactive)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Run tests in debug mode
npm run test:debug

# Show test report
npm run test:report
```

### Running Specific Tests

```bash
# Run only home page tests
npx playwright test home.spec.ts

# Run only event details tests
npx playwright test event-details.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests in mobile viewport
npx playwright test --project="Mobile Chrome"
```

## Test Structure

### Home Page Tests (`home.spec.ts`)
- ✅ Page loads successfully
- ✅ Hero section displays correctly
- ✅ Events section is visible
- ✅ Handles no events gracefully
- ✅ Event cards have correct structure
- ✅ Navigation elements work
- ✅ Responsive design on mobile
- ✅ SEO meta tags are present
- ✅ No console errors

### Event Details Tests (`event-details.spec.ts`)
- ✅ Page loads successfully
- ✅ Event information displays correctly
- ✅ Proper page structure
- ✅ Handles event not found gracefully
- ✅ SEO meta tags are present
- ✅ Responsive design on mobile
- ✅ No console errors

## Test Utilities (`utils/test-helpers.ts`)

Common helper functions for tests:
- `waitForPageLoad()` - Wait for page to be fully loaded
- `expectElementWithText()` - Check if element is visible and has text
- `checkForConsoleErrors()` - Check for console errors
- `checkPageResponsiveness()` - Check page responsiveness
- `checkSEOMetaTags()` - Check SEO meta tags
- `checkCommonPageElements()` - Check common page elements

## Configuration

Tests are configured in `playwright.config.ts`:
- **Base URL**: `http://localhost:3000`
- **Test Directory**: `./tests`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Web Server**: Automatically starts `npm run dev`
- **Screenshots**: On failure
- **Videos**: Retained on failure
- **Traces**: On first retry

## Future Enhancements

1. **Test Data Management**: Create helper functions to set up and clean up test data
2. **Authentication Tests**: Test user login/logout flows
3. **Event Creation Tests**: Test event creation and management
4. **Booking Flow Tests**: Test the complete booking process
5. **API Tests**: Test API endpoints directly
6. **Database Seeding**: Set up test database with known data
7. **CI/CD Integration**: Set up tests to run in CI/CD pipeline

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests
3. **Selectors**: Use semantic selectors (data-testid, roles) when possible
4. **Assertions**: Make assertions specific and meaningful
5. **Error Handling**: Test both success and error scenarios
6. **Performance**: Keep tests fast and efficient

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure port 3000 is available
2. **Database issues**: Ensure test database is properly configured
3. **Environment variables**: Check that all required env vars are set
4. **Browser issues**: Try running with different browsers

### Debug Mode

Use `npm run test:debug` to run tests in debug mode, which will:
- Open browser in headed mode
- Pause execution on failures
- Allow step-by-step debugging

### Viewing Reports

After running tests, view the HTML report:
```bash
npm run test:report
```

This will open a detailed report showing:
- Test results
- Screenshots on failure
- Videos on failure
- Console logs
- Network requests
