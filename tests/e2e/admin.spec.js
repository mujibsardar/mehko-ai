import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'admin-user-123',
        email: 'admin@example.com',
        isAdmin: true
      };
    });

    // Mock applications data
    await page.route('**/firestore/v1/projects/*/databases/*/documents/applications**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: [
            {
              name: 'projects/test/databases/test/documents/applications/san_diego_county_mehko',
              fields: {
                id: { stringValue: 'san_diego_county_mehko' },
                title: { stringValue: 'San Diego County MEHKO' },
                description: { stringValue: 'Home Kitchen Operations Permit for San Diego County' },
                rootDomain: { stringValue: 'sandiegocounty.gov' }
              }
            }
          ]
        })
      });
    });

    await page.goto('/admin');
  });

  test('should display admin dashboard for admin users', async ({ page }) => {
    // Verify admin interface is accessible
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="apps-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="reports-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="import-tab"]')).toBeVisible();
  });

  test('should manage applications in the apps tab', async ({ page }) => {
    // Click on apps tab
    await page.click('[data-testid="apps-tab"]');
    
    // Verify applications list is displayed
    await expect(page.locator('[data-testid="applications-list"]')).toBeVisible();
    await expect(page.locator('text=San Diego County MEHKO')).toBeVisible();
    
    // Select an application
    await page.click('[data-testid="application-item"]:first-child');
    
    // Verify application form is populated
    await expect(page.locator('[data-testid="app-id-input"]')).toHaveValue('san_diego_county_mehko');
    await expect(page.locator('[data-testid="app-title-input"]')).toHaveValue('San Diego County MEHKO');
    await expect(page.locator('[data-testid="root-domain-input"]')).toHaveValue('sandiegocounty.gov');
  });

  test('should create new applications', async ({ page }) => {
    // Click on apps tab
    await page.click('[data-testid="apps-tab"]');
    
    // Fill in new application form
    await page.fill('[data-testid="app-id-input"]', 'orange_county_mehko');
    await page.fill('[data-testid="app-title-input"]', 'Orange County MEHKO');
    await page.fill('[data-testid="root-domain-input"]', 'ocgov.com');
    await page.fill('[data-testid="description-input"]', 'Home Kitchen Operations Permit for Orange County');
    
    // Save the application
    await page.click('[data-testid="save-application-button"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Application saved successfully');
  });

  test('should edit existing applications', async ({ page }) => {
    // Click on apps tab
    await page.click('[data-testid="apps-tab"]');
    
    // Select existing application
    await page.click('[data-testid="application-item"]:first-child');
    
    // Modify the description
    await page.fill('[data-testid="description-input"]', 'Updated description for San Diego County MEHKO');
    
    // Save changes
    await page.click('[data-testid="save-application-button"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Application updated successfully');
  });

  test('should manage application steps', async ({ page }) => {
    // Click on apps tab
    await page.click('[data-testid="apps-tab"]');
    
    // Select an application
    await page.click('[data-testid="application-item"]:first-child');
    
    // Add a new step
    await page.selectOption('[data-testid="step-type-select"]', 'info');
    await page.fill('[data-testid="step-title-input"]', 'New Step');
    await page.fill('[data-testid="step-content-input"]', 'This is a new step for the application');
    
    // Add step to queue
    await page.click('[data-testid="add-step-button"]');
    
    // Verify step is in queue
    await expect(page.locator('[data-testid="queued-steps"]')).toContainText('New Step');
    
    // Save all changes
    await page.click('[data-testid="save-all-button"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should handle bulk import functionality', async ({ page }) => {
    // Click on import tab
    await page.click('[data-testid="import-tab"]');
    
    // Verify bulk import interface
    await expect(page.locator('[data-testid="bulk-import-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="drag-drop-zone"]')).toBeVisible();
    
    // Mock file upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="file-upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/bulk-applications.json');
    
    // Verify file is uploaded
    await expect(page.locator('[data-testid="uploaded-files"]')).toContainText('bulk-applications.json');
    
    // Process bulk import
    await page.click('[data-testid="process-import-button"]');
    
    // Verify processing status
    await expect(page.locator('[data-testid="processing-status"]')).toBeVisible();
  });

  test('should view and manage reports', async ({ page }) => {
    // Click on reports tab
    await page.click('[data-testid="reports-tab"]');
    
    // Verify reports interface
    await expect(page.locator('[data-testid="reports-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="reports-list"]')).toBeVisible();
    
    // Mock reports data
    await page.route('**/firestore/v1/projects/*/databases/*/documents/reports**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: [
            {
              name: 'projects/test/databases/test/documents/reports/report1',
              fields: {
                id: { stringValue: 'report1' },
                type: { stringValue: 'issue' },
                message: { stringValue: 'User reported an issue with the application' },
                status: { stringValue: 'open' }
              }
            }
          ]
        })
      });
    });
    
    // Reload to get reports
    await page.reload();
    
    // Verify report is displayed
    await expect(page.locator('text=User reported an issue with the application')).toBeVisible();
  });

  test('should handle PDF form management', async ({ page }) => {
    // Click on apps tab
    await page.click('[data-testid="apps-tab"]');
    
    // Select an application
    await page.click('[data-testid="application-item"]:first-child');
    
    // Add a PDF step
    await page.selectOption('[data-testid="step-type-select"]', 'pdf');
    await page.fill('[data-testid="step-title-input"]', 'PDF Form Step');
    await page.fill('[data-testid="form-name-input"]', 'Test Form');
    await page.fill('[data-testid="form-id-input"]', 'TEST_FORM_001');
    
    // Mock file upload for PDF
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="pdf-upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/test-form.pdf');
    
    // Add step to queue
    await page.click('[data-testid="add-step-button"]');
    
    // Verify PDF step is queued
    await expect(page.locator('[data-testid="queued-steps"]')).toContainText('PDF Form Step');
  });

  test('should handle AcroForm conversion', async ({ page }) => {
    // Click on apps tab
    await page.click('[data-testid="apps-tab"]');
    
    // Select an application
    await page.click('[data-testid="application-item"]:first-child');
    
    // Mock AcroForm conversion
    await page.route('**/api/convert-acroform', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fields: [
            { name: 'field1', type: 'text', coordinates: [100, 100, 200, 120] },
            { name: 'field2', type: 'checkbox', coordinates: [100, 150, 120, 170] }
          ]
        })
      });
    });
    
    // Upload PDF for conversion
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="acroform-upload-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/acroform-test.pdf');
    
    // Start conversion
    await page.click('[data-testid="start-conversion-button"]');
    
    // Verify conversion status
    await expect(page.locator('[data-testid="conversion-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversion-status"]')).toContainText('Converting...');
    
    // Wait for completion
    await expect(page.locator('[data-testid="conversion-complete"]')).toBeVisible();
  });

  test('should handle admin access control', async ({ page }) => {
    // Test with non-admin user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'regular-user-123',
        email: 'user@example.com',
        isAdmin: false
      };
    });
    
    // Try to access admin page
    await page.goto('/admin');
    
    // Verify access denied
    await expect(page.locator('text=Access Denied')).toBeVisible();
    await expect(page.locator('text=Admin privileges required')).toBeVisible();
    
    // Switch back to admin user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'admin-user-123',
        email: 'admin@example.com',
        isAdmin: true
      };
    });
    
    // Access admin page again
    await page.goto('/admin');
    
    // Verify access granted
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
  });

  test('should handle admin search and filtering', async ({ page }) => {
    // Click on apps tab
    await page.click('[data-testid="apps-tab"]');
    
    // Search for specific application
    await page.fill('[data-testid="search-input"]', 'San Diego');
    
    // Verify only matching applications are shown
    await expect(page.locator('text=San Diego County MEHKO')).toBeVisible();
    
    // Clear search
    await page.clear('[data-testid="search-input"]');
    
    // Verify all applications are shown
    await expect(page.locator('[data-testid="application-item"]')).toHaveCount(1);
  });

  test('should export application data', async ({ page }) => {
    // Click on apps tab
    await page.click('[data-testid="apps-tab"]');
    
    // Select an application
    await page.click('[data-testid="application-item"]:first-child');
    
    // Click export button
    await page.click('[data-testid="export-application-button"]');
    
    // Verify export options
    await expect(page.locator('[data-testid="export-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-json"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();
    
    // Export as JSON
    await page.click('[data-testid="export-json"]');
    
    // Verify download starts
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
  });
});
