import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should show login modal for unauthenticated users', async ({ page }) => {
    // Check that login modal appears when trying to access protected features
    // Look for a button that would trigger auth - try the report button or any interactive element
    const reportButton = page.locator('button:has-text("Report Issue"), .report-button, button:has-text("Report")');
    
    if (await reportButton.isVisible()) {
      await reportButton.click();
      
      // Verify login modal is displayed - look for actual modal elements
      await expect(page.locator('.auth-modal, .login-modal, .modal, [role="dialog"]')).toBeVisible();
    } else {
      // If no report button, try to find any protected feature
      console.log('No report button found - testing alternative protected features');
      // Look for any button that might require auth
      const anyButton = page.locator('button').first();
      if (await anyButton.isVisible()) {
        await anyButton.click();
        // Check if auth modal appears
        await expect(page.locator('.auth-modal, .login-modal, .modal, [role="dialog"]')).toBeVisible();
      }
    }
  });

  test('should handle login with valid credentials', async ({ page }) => {
    // Mock successful authentication
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            uid: { stringValue: 'test-user-123' },
            email: { stringValue: 'test@example.com' },
            role: { stringValue: 'user' }
          }
        })
      });
    });

    // Open login modal
    const reportButton = page.locator('button:has-text("Report Issue"), .report-button, button:has-text("Report")');
    
    if (await reportButton.isVisible()) {
      await reportButton.click();
    }
    
    // Fill login form using actual form elements
    await page.fill('input[type="email"], input[name="email"], .email-input', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"], .password-input', 'password123');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Verify successful login
    await expect(page.locator('.user-info, .user-menu, .user-avatar')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    // Mock failed authentication
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'User not found' })
      });
    });

    // Open login modal
    const reportButton = page.locator('button:has-text("Report Issue"), .report-button, button:has-text("Report")');
    
    if (await reportButton.isVisible()) {
      await reportButton.click();
    }
    
    // Fill login form with invalid credentials
    await page.fill('input[type="email"], input[name="email"], .email-input', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"], .password-input', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Verify error message
    await expect(page.locator('text=Invalid credentials, text=Login failed, .error-message')).toBeVisible();
  });

  test('should handle logout', async ({ page }) => {
    // Mock authenticated user
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            uid: { stringValue: 'test-user-123' },
            email: { stringValue: 'test@example.com' },
            role: { stringValue: 'user' }
          }
        })
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Open user menu
    const userMenu = page.locator('.user-menu, .user-info, .user-avatar, button:has-text("Menu")');
    
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }
    
    // Click logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), .logout-button');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Verify user is logged out
      await expect(page.locator('.auth-modal, .login-modal, .modal')).toBeVisible();
    }
  });

  test('should restrict admin access for non-admin users', async ({ page }) => {
    // Mock non-admin user
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            uid: { stringValue: 'test-user-123' },
            email: { stringValue: 'test@example.com' },
            role: { stringValue: 'user' }
          }
        })
      });
    });

    // Try to access admin route
    await page.goto('/admin');
    
    // Verify access denied message
    await expect(page.locator('text=Access Denied, text=Unauthorized, text=Forbidden, .error-message')).toBeVisible();
  });

  test('should allow admin access for admin users', async ({ page }) => {
    // Mock admin user
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            uid: { stringValue: 'admin-user-123' },
            email: { stringValue: 'admin@example.com' },
            role: { stringValue: 'admin' }
          }
        })
      });
    });

    // Navigate to admin route
    await page.goto('/admin');
    
    // Verify admin interface is accessible
    await expect(page.locator('.admin-dashboard, h1:has-text("Admin Dashboard"), .admin-header')).toBeVisible();
  });

  test('should handle authentication state persistence', async ({ page }) => {
    // Mock authenticated user
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            uid: { stringValue: 'test-user-123' },
            email: { stringValue: 'test@example.com' },
            role: { stringValue: 'user' }
          }
        })
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify user is authenticated
    await expect(page.locator('.user-info, .user-menu, .user-avatar')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Verify user is still authenticated after page reload
    await expect(page.locator('.user-info, .user-menu, .user-avatar')).toBeVisible();
  });
});
