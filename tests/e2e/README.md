# E2E Testing Guide

This directory contains end-to-end tests for the MEHKO application using Playwright.

## Test Suites

The Dashboard test suite (`dashboard.spec.js`) tests the main dashboard functionality and application selection.

The Application Steps test suite (`application-steps.spec.js`) tests the step-by-step application workflow.

The Admin Panel test suite (`admin.spec.js`) tests admin functionality and access control.

The Real Authentication test suite (`auth-real.spec.js`) tests Firebase authentication with real credentials.

The AI Chat Real test suite (`ai-chat-real.spec.js`) tests AI chat functionality with real authentication.

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run specific test suite
```bash
npm run test:e2e tests/e2e/dashboard.spec.js
npm run test:e2e tests/e2e/application-steps.spec.js
npm run test:e2e tests/e2e/admin.spec.js
npm run test:e2e tests/e2e/auth-real.spec.js
npm run test:e2e tests/e2e/ai-chat-real.spec.js
```

### Run tests with UI
```bash
npm run test:e2e:ui
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run tests in headed mode
```bash
npm run test:e2e:headed
```

## Test Configuration

Tests are configured in `playwright.config.js` and run against:
- Desktop browsers (Chrome, Firefox, Safari)
- Mobile browsers (Chrome Mobile, Safari Mobile)

## Test Data

Tests use mocked Firestore data to ensure consistent test results. The mock data includes:
- Sample applications (San Diego County, Los Angeles County)
- Sample user data
- Sample progress data

## Debugging Tests

### View test results
```bash
npx playwright show-report
```

### Debug specific test
```bash
npm run test:e2e:debug tests/e2e/dashboard.spec.js
```

### Run with headed browser
```bash
npm run test:e2e:headed tests/e2e/dashboard.spec.js
```

## Test Structure

Each test suite follows this pattern:
1. **Setup**: Mock data and navigate to test page
2. **Action**: Perform the test action (click, fill, etc.)
3. **Assertion**: Verify expected behavior
4. **Cleanup**: Reset state if needed

## Common Test Patterns

### Mocking Firestore
```javascript
await page.route('**/firestore/v1/projects/*/databases/*/documents/**', async route => {
  // Return mock data
});
```

### Waiting for elements
```javascript
await expect(page.locator('.selector')).toBeVisible();
await page.waitForTimeout(1000); // For complex interactions
```

### Handling authentication
```javascript
// Tests automatically handle authentication
// Mock user data is provided in test setup
```

## Troubleshooting

### Tests failing on mobile
- Some elements may be hidden on mobile devices
- Use responsive design selectors
- Check for mobile-specific behavior

### Tests timing out
- Increase timeout in playwright.config.js
- Check if page is fully loaded before assertions
- Use proper wait conditions

### Mock data issues
- Verify mock data structure matches real app
- Check Firestore route patterns
- Ensure mock data is returned for all requests
