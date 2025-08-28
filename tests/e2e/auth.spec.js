import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should show login modal for unauthenticated users', async ({ page }) => {
    // Check that login modal appears when trying to access protected features
    await page.click('[data-testid="report-issue-button"]');
    
    // Verify login modal is displayed
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should handle login with valid credentials', async ({ page }) => {
    // Mock successful login
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            uid: 'test-user-123',
            email: 'test@example.com',
            isAdmin: false
          }
        })
      });
    });

    // Open login modal
    await page.click('[data-testid="report-issue-button"]');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Submit form
    await page.click('[data-testid="login-submit"]');
    
    // Verify successful login
    await expect(page.locator('[data-testid="auth-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    // Mock failed login
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid credentials'
        })
      });
    });

    // Open login modal
    await page.click('[data-testid="report-issue-button"]');
    
    // Fill login form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    // Submit form
    await page.click('[data-testid="login-submit"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
  });

  test('should handle logout', async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        isAdmin: false
      };
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Open user menu
    await page.click('[data-testid="user-menu"]');
    
    // Click logout
    await page.click('[data-testid="logout-button"]');
    
    // Verify user is logged out
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should restrict admin access for non-admin users', async ({ page }) => {
    // Mock non-admin user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        isAdmin: false
      };
    });

    // Try to access admin page
    await page.goto('/admin');
    
    // Verify access denied message
    await expect(page.locator('text=Access Denied')).toBeVisible();
    await expect(page.locator('text=Admin privileges required')).toBeVisible();
  });

  test('should allow admin access for admin users', async ({ page }) => {
    // Mock admin user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'admin-user-123',
        email: 'admin@example.com',
        isAdmin: true
      };
    });

    // Access admin page
    await page.goto('/admin');
    
    // Verify admin interface is accessible
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="apps-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="reports-tab"]')).toBeVisible();
  });

  test('should handle authentication state persistence', async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        isAdmin: false
      };
      localStorage.setItem('authUser', JSON.stringify(window.mockUser));
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify user is still authenticated after page reload
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Verify authentication state persists
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
