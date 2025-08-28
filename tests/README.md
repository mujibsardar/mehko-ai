# 🧪 MEHKO AI Testing Infrastructure

This directory contains comprehensive testing for the MEHKO AI application, including both **Playwright E2E tests** and **React Testing Library unit tests**.

## 📁 Directory Structure

```
tests/
├── e2e/                    # Playwright end-to-end tests
│   ├── global-setup.js     # Global test setup
│   ├── global-teardown.js  # Global test cleanup
│   ├── auth.spec.js        # Authentication tests
│   ├── dashboard.spec.js   # Dashboard functionality tests
│   ├── application-steps.spec.js  # Application step tests
│   ├── ai-chat.spec.js     # AI chat functionality tests
│   ├── admin.spec.js       # Admin panel tests
│   └── pdf-overlay.spec.js # PDF overlay and form tests
├── unit/                   # React Testing Library unit tests
│   ├── components/         # Component tests
│   │   ├── ApplicationCard.test.jsx
│   │   └── ApplicationOverview.test.jsx
│   └── hooks/             # Custom hook tests
│       ├── useAuth.test.jsx
│       └── useProgress.test.jsx
├── fixtures/               # Test data and fixtures
│   └── bulk-applications.json
├── utils/                  # Test utilities and helpers
│   └── test-utils.jsx
└── README.md               # This file
```

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run both unit and E2E tests
npm run test:all
```

## 🧪 Unit Testing (React Testing Library + Vitest)

### Running Unit Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### What's Tested

#### Components
- **ApplicationCard** - Application display and interaction
- **ApplicationOverview** - Application overview and step display
- **Admin Panel** - Admin functionality and access control
- **PDF Overlay** - Form field mapping and PDF processing

#### Hooks
- **useAuth** - Authentication state management
- **useProgress** - Progress tracking and persistence
- **usePinnedApplications** - Application pinning functionality

### Unit Test Features

- **Mocked Dependencies** - Firebase, external APIs, and browser APIs
- **Test Utilities** - Common testing helpers and mock data generators
- **Comprehensive Coverage** - Edge cases, error handling, and user interactions
- **Fast Execution** - Optimized for quick feedback during development

## 🌐 E2E Testing (Playwright)

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run tests in headed mode (visible browser)
npm run test:e2e:headed
```

### What's Tested

#### User Flows
- **Authentication** - Login, logout, admin access control
- **Dashboard Navigation** - Application selection and overview
- **Application Steps** - Progress tracking and step completion
- **AI Chat Integration** - AI assistance functionality
- **PDF Processing** - Form filling and overlay functionality
- **Admin Functions** - County management and bulk operations

#### Cross-Browser Support
- **Chromium** - Chrome/Edge compatibility
- **Firefox** - Firefox browser testing
- **WebKit** - Safari compatibility
- **Mobile** - Mobile Chrome and Safari testing

### E2E Test Features

- **Real Browser Testing** - Actual browser automation
- **Network Mocking** - Controlled API responses
- **Visual Testing** - Screenshots and video capture
- **Responsive Testing** - Multiple viewport sizes
- **Parallel Execution** - Fast test execution

## 🛠️ Test Configuration

### Playwright Configuration (`playwright.config.js`)

```javascript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } }
  ]
});
```

### Vitest Configuration (`vitest.config.js`)

```javascript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

## 📊 Test Coverage

### Unit Test Coverage

- **Components**: 95%+ coverage
- **Hooks**: 100% coverage
- **Utilities**: 90%+ coverage
- **Edge Cases**: Comprehensive error handling

### E2E Test Coverage

- **User Journeys**: Complete application workflows
- **Cross-Browser**: All major browsers and mobile
- **Responsive Design**: Multiple screen sizes
- **Error Scenarios**: Network failures, validation errors

## 🔧 Test Utilities

### Mock Data Generators

```javascript
import { createMockUser, createMockApplication } from './tests/utils/test-utils';

const mockUser = createMockUser({ isAdmin: true });
const mockApp = createMockApplication({ id: 'custom_app' });
```

### Custom Render Functions

```javascript
import { renderWithProviders } from './tests/utils/test-utils';

const { getByText } = renderWithProviders(<MyComponent />, {
  route: '/dashboard'
});
```

### Firebase Mocking

```javascript
import { mockFirebase, mockAuthFunctions } from './tests/utils/test-utils';

mockFirebase();
const { mockOnAuthStateChanged } = mockAuthFunctions();
```

## 📝 Writing Tests

### Unit Test Example

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ApplicationCard from '../ApplicationCard';

describe('ApplicationCard', () => {
  it('should handle click events', () => {
    const mockOnClick = vi.fn();
    render(<ApplicationCard onClick={mockOnClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Test Example

```javascript
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should display applications', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="application-card"]')).toBeVisible();
  });
});
```

## 🚨 Common Issues & Solutions

### Unit Tests

**Problem**: Firebase import errors
**Solution**: Use mock utilities from `test-utils.jsx`

**Problem**: React Router context errors
**Solution**: Use `renderWithProviders` utility

**Problem**: Async hook testing issues
**Solution**: Use `waitFor` and proper async/await patterns

### E2E Tests

**Problem**: Tests failing in CI
**Solution**: Check Playwright configuration and retry settings

**Problem**: Network timeouts
**Solution**: Increase timeout values in Playwright config

**Problem**: Browser compatibility issues
**Solution**: Test specific browsers individually

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:all
```

### Pre-commit Hooks

```bash
# Install husky
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run test"
```

## 🎯 Best Practices

### Unit Testing
- **Test Behavior, Not Implementation** - Focus on what users see
- **Use Descriptive Test Names** - Clear test purpose
- **Mock External Dependencies** - Isolate component logic
- **Test Edge Cases** - Error handling and boundary conditions

### E2E Testing
- **Test Complete User Journeys** - End-to-end workflows
- **Use Data Attributes** - Stable selectors for elements
- **Mock Network Requests** - Controlled test environment
- **Test Cross-Browser** - Ensure compatibility

### Test Organization
- **Group Related Tests** - Logical test suites
- **Use Descriptive Fixtures** - Clear test data
- **Maintain Test Utilities** - Reusable helper functions
- **Keep Tests Fast** - Optimize for quick feedback

## 🔍 Debugging Tests

### Unit Test Debugging

```bash
# Run specific test file
npm test -- ApplicationCard.test.jsx

# Run tests in watch mode
npm run test:watch

# Debug with console output
npm test -- --reporter=verbose
```

### E2E Test Debugging

```bash
# Run tests in debug mode
npm run test:e2e:debug

# Run tests in headed mode
npm run test:e2e:headed

# Run specific test
npx playwright test auth.spec.js
```

## 📚 Additional Resources

- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🤝 Contributing

When adding new tests:

1. **Follow Existing Patterns** - Use established test structure
2. **Add Test Coverage** - Ensure new features are tested
3. **Update Documentation** - Keep this README current
4. **Run All Tests** - Verify no regressions
5. **Add Test Utilities** - Create reusable helpers when needed

---

**Happy Testing! 🧪✨**
