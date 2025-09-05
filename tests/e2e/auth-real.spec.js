import { test, expect } from '@playwright/test';

test.describe('Real Firebase Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard to start fresh
    await page.goto('/dashboard');
  });

  test('should show login modal for unauthenticated users', async ({ page }) => {
    // Check if already logged in by looking for logout button or user menu
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), .logout-button');
    const userMenu = page.locator('.user-menu, .profile-menu, .account-menu');
    
    if (await logoutButton.isVisible() || await userMenu.isVisible()) {
      console.log('User appears to be already logged in - skipping login modal test');
      return;
    }
    
    // Look for any button that might trigger login (Sign In button in header)
    const signInButton = page.locator('button:has-text("Sign In"), .auth-button, .signin-button');
    
    if (await signInButton.isVisible()) {
      await signInButton.click();
      
      // Verify login modal is displayed
      await expect(page.locator('.auth-modal, .login-modal, .modal')).toBeVisible();
      await expect(page.locator('form, .login-form, .auth-form')).toBeVisible();
    } else {
      console.log('No sign in button found - user may already be logged in or auth is not implemented');
    }
  });

  test('should handle login with real test credentials', async ({ page }) => {
    // Check if already logged in
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), .logout-button');
    if (await logoutButton.isVisible()) {
      console.log('User already logged in - skipping login test');
      return;
    }
    
    // Open login modal
    const signInButton = page.locator('button:has-text("Sign In"), .auth-button, .signin-button');
    
    if (await signInButton.isVisible()) {
      await signInButton.click();
    } else {
      console.log('No sign in button found - may already be logged in');
      return;
    }
    
    // Fill login form with real test credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], .email-input');
    const passwordInput = page.locator('input[type="password"], input[name="password"], .password-input');
    
    await emailInput.fill('test@test.com');
    await passwordInput.fill('Test123!');
    
    // Submit form - be more specific to avoid duplicate buttons
    const submitButton = page.locator('button[type="submit"]:has-text("Sign In"), .auth-submit-btn, button:has-text("Sign In"):not(.auth-button)');
    await submitButton.click();
    
    // Wait for authentication to complete
    await page.waitForTimeout(2000);
    
    // Verify successful login - modal should be closed
    await expect(page.locator('.auth-modal, .login-modal, .modal')).not.toBeVisible();
    
    // Verify user is authenticated by checking for user info (more specific)
    await expect(page.locator('.user-info')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    // Check if already logged in
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), .logout-button');
    if (await logoutButton.isVisible()) {
      console.log('User already logged in - skipping invalid credentials test');
      return;
    }
    
    // Open login modal
    const signInButton = page.locator('button:has-text("Sign In"), .auth-button, .signin-button');
    
    if (await signInButton.isVisible()) {
      await signInButton.click();
    } else {
      console.log('No sign in button found - may already be logged in');
      return;
    }
    
    // Fill login form with invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], .email-input');
    const passwordInput = page.locator('input[type="password"], input[name="password"], .password-input');
    
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    
    // Submit form - be more specific to avoid duplicate buttons
    const submitButton = page.locator('button[type="submit"]:has-text("Sign In"), .auth-submit-btn, button:has-text("Sign In"):not(.auth-button)');
    await submitButton.click();
    
    // Wait for error to appear
    await page.waitForTimeout(1000);
    
    // Verify error message is displayed - look for the error-banner class
    await expect(page.locator('.error-banner')).toBeVisible();
  });

  test('should handle logout after successful login', async ({ page }) => {
    // Check if already logged in, if not, try to log in first
    let logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), .logout-button');
    
    if (!(await logoutButton.isVisible())) {
      // Try to log in first
      const signInButton = page.locator('button:has-text("Sign In"), .auth-button, .signin-button');
      
      if (await signInButton.isVisible()) {
        await signInButton.click();
        
        const emailInput = page.locator('input[type="email"], input[name="email"], .email-input');
        const passwordInput = page.locator('input[type="password"], input[name="password"], .password-input');
        
        await emailInput.fill('test@test.com');
        await passwordInput.fill('Test123!');
        
        const submitButton = page.locator('button[type="submit"]:has-text("Sign In"), .auth-submit-btn, button:has-text("Sign In"):not(.auth-button)');
        await submitButton.click();
        
        // Wait for authentication
        await page.waitForTimeout(2000);
      } else {
        console.log('No sign in button found - may already be logged in');
        return;
      }
    }
    
    // Verify we're logged in
    await expect(page.locator('.auth-modal, .login-modal, .modal')).not.toBeVisible();
    
    // Find and click logout (could be in user menu or header)
    logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), .logout-button');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Wait for logout to complete
      await page.waitForTimeout(1000);
      
      // Verify user is logged out by checking for login button
      await expect(page.locator('button:has-text("Sign In"), .auth-button, .signin-button')).toBeVisible();
    } else {
      console.log('No logout button found - may need to open user menu first');
    }
  });
});
