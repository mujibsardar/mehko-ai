import { test, expect } from '@playwright/test';

test.describe('PDF Overlay and Form Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        isAdmin: false
      };
    });

    // Mock PDF data
    await page.route('**/api/pdf/overlay**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          pdfUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsO...',
          fields: [
            { name: 'applicant_name', type: 'text', coordinates: [100, 100, 300, 120] },
            { name: 'business_name', type: 'text', coordinates: [100, 150, 300, 170] },
            { name: 'signature', type: 'signature', coordinates: [100, 200, 300, 250] }
          ]
        })
      });
    });

    await page.goto('/admin/mapper/san_diego_county_mehko/SAN_DIEGO_SOP-English');
  });

  test('should display PDF overlay interface', async ({ page }) => {
    // Verify PDF overlay interface is displayed
    await expect(page.locator('[data-testid="pdf-overlay-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="pdf-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-mapping-panel"]')).toBeVisible();
  });

  test('should load and display PDF with form fields', async ({ page }) => {
    // Verify PDF is loaded
    await expect(page.locator('[data-testid="pdf-viewer"]')).toBeVisible();
    
    // Verify form fields are displayed
    await expect(page.locator('[data-testid="field-applicant_name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-business_name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-signature"]')).toBeVisible();
  });

  test('should allow field mapping and configuration', async ({ page }) => {
    // Click on a field to configure it
    await page.click('[data-testid="field-applicant_name"]');
    
    // Verify field configuration panel is shown
    await expect(page.locator('[data-testid="field-config-panel"]')).toBeVisible();
    
    // Configure field properties
    await page.fill('[data-testid="field-label-input"]', 'Applicant Full Name');
    await page.selectOption('[data-testid="field-type-select"]', 'text');
    await page.check('[data-testid="field-required-checkbox"]');
    
    // Save field configuration
    await page.click('[data-testid="save-field-config"]');
    
    // Verify configuration is saved
    await expect(page.locator('[data-testid="field-applicant_name"]')).toContainText('Applicant Full Name');
  });

  test('should handle text field input and validation', async ({ page }) => {
    // Click on text field
    await page.click('[data-testid="field-applicant_name"]');
    
    // Type in the field
    await page.fill('[data-testid="field-input"]', 'John Doe');
    
    // Verify input is displayed
    await expect(page.locator('[data-testid="field-input"]')).toHaveValue('John Doe');
    
    // Test validation for required field
    await page.clear('[data-testid="field-input"]');
    await page.click('[data-testid="validate-form"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Applicant Name is required');
  });

  test('should handle signature field functionality', async ({ page }) => {
    // Click on signature field
    await page.click('[data-testid="field-signature"]');
    
    // Verify signature interface is shown
    await expect(page.locator('[data-testid="signature-pad"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-signature"]')).toBeVisible();
    
    // Draw a signature (simulate mouse events)
    const signaturePad = page.locator('[data-testid="signature-pad"]');
    await signaturePad.hover();
    await page.mouse.down();
    await page.mouse.move(150, 225);
    await page.mouse.move(200, 225);
    await page.mouse.move(250, 225);
    await page.mouse.up();
    
    // Verify signature is captured
    await expect(page.locator('[data-testid="signature-preview"]')).toBeVisible();
    
    // Clear signature
    await page.click('[data-testid="clear-signature"]');
    
    // Verify signature is cleared
    await expect(page.locator('[data-testid="signature-preview"]')).not.toBeVisible();
  });

  test('should handle form submission and PDF generation', async ({ page }) => {
    // Fill in form fields
    await page.click('[data-testid="field-applicant_name"]');
    await page.fill('[data-testid="field-input"]', 'Jane Smith');
    
    await page.click('[data-testid="field-business_name"]');
    await page.fill('[data-testid="field-input"]', 'Smith Kitchen');
    
    // Mock PDF generation
    await page.route('**/api/pdf/generate**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('fake-pdf-content')
      });
    });
    
    // Submit the form
    await page.click('[data-testid="submit-form"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Form submitted successfully');
  });

  test('should handle PDF preview and editing', async ({ page }) => {
    // Fill in some fields
    await page.click('[data-testid="field-applicant_name"]');
    await page.fill('[data-testid="field-input"]', 'Test User');
    
    // Preview the filled PDF
    await page.click('[data-testid="preview-pdf"]');
    
    // Verify preview is shown
    await expect(page.locator('[data-testid="pdf-preview-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-pdf-viewer"]')).toBeVisible();
    
    // Close preview
    await page.click('[data-testid="close-preview"]');
    
    // Verify preview is closed
    await expect(page.locator('[data-testid="pdf-preview-modal"]')).not.toBeVisible();
  });

  test('should handle field positioning and resizing', async ({ page }) => {
    // Click on a field to select it
    await page.click('[data-testid="field-applicant_name"]');
    
    // Verify field is selected
    await expect(page.locator('[data-testid="field-applicant_name"]')).toHaveClass(/selected/);
    
    // Drag field to new position
    const field = page.locator('[data-testid="field-applicant_name"]');
    await field.dragTo(page.locator('[data-testid="pdf-viewer"]'), { targetPosition: { x: 200, y: 200 } });
    
    // Verify field position has changed
    const newPosition = await field.boundingBox();
    expect(newPosition.x).toBeGreaterThan(100);
  });

  test('should handle form field types and validation rules', async ({ page }) => {
    // Click on a field to configure it
    await page.click('[data-testid="field-applicant_name"]');
    
    // Change field type to email
    await page.selectOption('[data-testid="field-type-select"]', 'email');
    
    // Add email validation
    await page.fill('[data-testid="field-validation-pattern"]', '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
    await page.fill('[data-testid="field-validation-message"]', 'Please enter a valid email address');
    
    // Save configuration
    await page.click('[data-testid="save-field-config"]');
    
    // Test invalid email
    await page.fill('[data-testid="field-input"]', 'invalid-email');
    await page.click('[data-testid="validate-form"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Please enter a valid email address');
    
    // Test valid email
    await page.fill('[data-testid="field-input"]', 'test@example.com');
    await page.click('[data-testid="validate-form"]');
    
    // Verify no validation error
    await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
  });

  test('should handle form saving and loading', async ({ page }) => {
    // Fill in form fields
    await page.click('[data-testid="field-applicant_name"]');
    await page.fill('[data-testid="field-input"]', 'Saved User');
    
    await page.click('[data-testid="field-business_name"]');
    await page.fill('[data-testid="field-input"]', 'Saved Business');
    
    // Save form
    await page.click('[data-testid="save-form"]');
    
    // Verify save success
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Verify form data is restored
    await expect(page.locator('[data-testid="field-applicant_name"]')).toContainText('Saved User');
    await expect(page.locator('[data-testid="field-business_name"]')).toContainText('Saved Business');
  });

  test('should handle PDF export with filled form data', async ({ page }) => {
    // Fill in form fields
    await page.click('[data-testid="field-applicant_name"]');
    await page.fill('[data-testid="field-input"]', 'Export User');
    
    // Mock PDF export
    await page.route('**/api/pdf/export**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('exported-pdf-content')
      });
    });
    
    // Export filled PDF
    await page.click('[data-testid="export-pdf"]');
    
    // Verify export options
    await expect(page.locator('[data-testid="export-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-filled"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-blank"]')).toBeVisible();
    
    // Export filled PDF
    await page.click('[data-testid="export-filled"]');
    
    // Verify download starts
    const downloadPromise = page.waitForEvent('download');
    await downloadPromise;
  });

  test('should handle form field templates and presets', async ({ page }) => {
    // Open field templates
    await page.click('[data-testid="field-templates"]');
    
    // Verify templates are shown
    await expect(page.locator('[data-testid="templates-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-personal-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-business-info"]')).toBeVisible();
    
    // Apply personal info template
    await page.click('[data-testid="template-personal-info"]');
    
    // Verify template fields are added
    await expect(page.locator('[data-testid="field-first-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-last-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-phone"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-email"]')).toBeVisible();
  });

  test('should handle collaborative editing and comments', async ({ page }) => {
    // Add a comment to a field
    await page.click('[data-testid="field-applicant_name"]');
    await page.click('[data-testid="add-comment"]');
    
    // Type comment
    await page.fill('[data-testid="comment-input"]', 'This field should be required for all applications');
    
    // Save comment
    await page.click('[data-testid="save-comment"]');
    
    // Verify comment is displayed
    await expect(page.locator('[data-testid="field-comment"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-comment"]')).toContainText('This field should be required for all applications');
    
    // Edit comment
    await page.click('[data-testid="edit-comment"]');
    await page.fill('[data-testid="comment-input"]', 'Updated: This field should be required for all applications');
    await page.click('[data-testid="save-comment"]');
    
    // Verify comment is updated
    await expect(page.locator('[data-testid="field-comment"]')).toContainText('Updated: This field should be required for all applications');
  });
});
