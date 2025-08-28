import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test('should redirect non-admin users to dashboard', async ({ page }) => {
    // Navigate to admin page without authentication
    await page.goto('/admin');
    
    // Should be redirected to dashboard due to ProtectedAdminRoute
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show dashboard content after admin redirect', async ({ page }) => {
    // Navigate to admin page
    await page.goto('/admin');
    
    // Should be redirected to dashboard since we're not authenticated
    await expect(page).toHaveURL('/dashboard');
    
    // Wait a bit for the page to fully load
    await page.waitForTimeout(2000);
    
    // Verify we're on the dashboard and can see content
    // The page snapshot shows these elements exist
    await expect(page.locator('h1:has-text("MEHKO.ai")')).toBeVisible();
    await expect(page.locator('h2:has-text("Select Your Application")')).toBeVisible();
    await expect(page.locator('h3:has-text("Your Applications")')).toBeVisible();
    
    // Check if there are application cards visible
    await expect(page.locator('text=Los Angeles County MEHKO')).toBeVisible();
    await expect(page.locator('text=San Diego County MEHKO')).toBeVisible();
  });
});
