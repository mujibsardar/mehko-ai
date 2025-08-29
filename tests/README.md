# Testing Guide

This directory contains all tests for the MEHKO application.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── dashboard.spec.js   # Dashboard functionality tests
│   ├── application-steps.spec.js # Application workflow tests
│   ├── admin.spec.js       # Admin panel tests
│   ├── auth-real.spec.js   # Real Firebase authentication tests
│   ├── ai-chat-real.spec.js # AI chat with real auth tests
│   ├── global-setup.js     # Global test setup
│   ├── global-teardown.js  # Global test cleanup
│   └── README.md           # E2E testing guide
├── unit/                   # Unit tests (Vitest)
│   ├── components/         # Component tests
│   ├── hooks/              # Hook tests
│   └── utils/              # Utility function tests
├── setup.js                # Test environment setup
└── README.md               # This file
```

## Running Tests

### Unit Tests (Vitest)
```bash
npm run test              # Run all unit tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
npm run test:ui           # Run tests with UI
```

### E2E Tests (Playwright)
```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Run E2E tests with UI
npm run test:e2e:debug    # Run E2E tests in debug mode
npm run test:e2e:headed   # Run E2E tests in headed mode
```

### All Tests
```bash
npm run test:all          # Run both unit and E2E tests
```

## Test Configuration

### Unit Tests
- **Framework**: Vitest
- **Environment**: jsdom
- **Coverage**: Built-in coverage reporting
- **Setup**: `tests/setup.js`

### E2E Tests
- **Framework**: Playwright
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Configuration**: `playwright.config.js`
- **Setup**: `tests/e2e/global-setup.js`

## Test Data

### Unit Tests
- Mock data defined in individual test files
- No external dependencies

### E2E Tests
- Mocked Firestore data
- Test user accounts
- Sample application data

## Writing Tests

### Unit Tests
```javascript
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Component from './Component';

test('should render correctly', () => {
  render(<Component />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### E2E Tests
```javascript
import { test, expect } from '@playwright/test';

test('should navigate to dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toBeVisible();
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear test descriptions
3. **Arrange-Act-Assert**: Structure tests logically
4. **Mock External Dependencies**: Don't rely on external services
5. **Use Test IDs**: For complex selectors in E2E tests

## Troubleshooting

### Unit Tests
- Check `tests/setup.js` for environment setup
- Verify imports and dependencies
- Check console for errors

### E2E Tests
- Ensure dev server is running
- Check browser console for errors
- Verify mock data is correct
- Use debug mode for step-by-step debugging

## Continuous Integration

Tests run automatically on:
- Pull requests
- Main branch pushes
- Scheduled runs

## Coverage Reports

Generate coverage reports with:
```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Debugging

### Unit Tests
```bash
npm run test:ui
```

### E2E Tests
```bash
npm run test:e2e:debug
npm run test:e2e:headed
```

## Test Maintenance

- Keep tests up to date with code changes
- Remove obsolete tests
- Update mock data when application changes
- Review test coverage regularly
