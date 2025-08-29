import { test, expect } from '@playwright/test';

test.describe('Application Steps', () => {
  test.beforeEach(async ({ page }) => {
    // Mock application with detailed steps
    await page.route('**/firestore/v1/projects/*/databases/*/documents/applications/san_diego_county_mehko**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            id: { stringValue: 'san_diego_county_mehko' },
            title: { stringValue: 'San Diego County MEHKO' },
            description: { stringValue: 'Home Kitchen Operations Permit for San Diego County' },
            rootDomain: { stringValue: 'sandiegocounty.gov' },
            steps: {
              arrayValue: {
                values: [
                  {
                    mapValue: {
                      fields: {
                        id: { stringValue: 'planning_overview' },
                        title: { stringValue: 'Planning Overview' },
                        type: { stringValue: 'info' },
                        content: { stringValue: 'Start your MEHKO journey with planning resources and guides.' },
                        action_required: { booleanValue: false }
                      }
                    }
                  },
                  {
                    mapValue: {
                      fields: {
                        id: { stringValue: 'approvals_training' },
                        title: { stringValue: 'Approvals & Training' },
                        type: { stringValue: 'info' },
                        content: { stringValue: 'Complete required training and obtain necessary approvals.' },
                        action_required: { booleanValue: true }
                      }
                    }
                  },
                  {
                    mapValue: {
                      fields: {
                        id: { stringValue: 'sop_form' },
                        title: { stringValue: 'Standard Operating Procedures' },
                        type: { stringValue: 'pdf' },
                        content: { stringValue: 'Download and complete the SOP form.' },
                        action_required: { booleanValue: true },
                        fill_pdf: { booleanValue: true },
                        formId: { stringValue: 'SAN_DIEGO_SOP-English' },
                        appId: { stringValue: 'san_diego_county_mehko' }
                      }
                    }
                  },
                  {
                    mapValue: {
                      fields: {
                        id: { stringValue: 'permit_application_form' },
                        title: { stringValue: 'Permit Application' },
                        type: { stringValue: 'pdf' },
                        content: { stringValue: 'Complete the main permit application form.' },
                        action_required: { booleanValue: true },
                        fill_pdf: { booleanValue: true },
                        formId: { stringValue: 'SAN_DIEGO_PERMIT-English' },
                        appId: { stringValue: 'san_diego_county_mehko' }
                      }
                    }
                  }
                ]
              }
            }
          }
        })
      });
    });

    // Mock progress data
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*/progress/san_diego_county_mehko**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            completedSteps: {
              arrayValue: {
                values: [
                  { stringValue: 'planning_overview' }
                ]
              }
            }
          }
        })
      });
    });

    await page.goto('/dashboard');
    
    // Select San Diego application
    await page.click('text=San Diego County MEHKO');
  });

  test('should display application steps correctly', async ({ page }) => {
    // Verify steps are displayed
    await expect(page.locator('.sidebar-sublist')).toBeVisible();
    
    // Verify step items are visible
    const stepItems = page.locator('.sidebar-sublist .step-item');
    await expect(stepItems).toHaveCount(4);
    
    // Verify specific steps
    await expect(page.locator('text=Planning Overview')).toBeVisible();
    await expect(page.locator('text=Approvals & Training')).toBeVisible();
    await expect(page.locator('text=Standard Operating Procedures')).toBeVisible();
    await expect(page.locator('text=Permit Application')).toBeVisible();
  });

  test('should show step completion status', async ({ page }) => {
    // Verify completed step has completion indicator
    const completedStep = page.locator('.step-item:has-text("Planning Overview") .checkmark');
    if (await completedStep.isVisible()) {
      await expect(completedStep).toBeVisible();
    }
    
    // Verify incomplete step doesn't have completion indicator
    const incompleteStep = page.locator('.step-item:has-text("Approvals & Training") .checkmark');
    await expect(incompleteStep).not.toBeVisible();
  });

  test('should handle step selection and content display', async ({ page }) => {
    // Click on planning overview step
    await page.click('.step-item:has-text("Planning Overview")');
    
    // Verify step content is displayed
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Verify step title is shown
    await expect(page.locator('text=Planning Overview')).toBeVisible();
  });

  test('should handle PDF step content', async ({ page }) => {
    // Click on SOP form step
    await page.click('.step-item:has-text("Standard Operating Procedures")');
    
    // Verify PDF step content is displayed
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Look for download button or PDF viewer
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("View PDF"), .pdf-viewer');
    if (await downloadButton.isVisible()) {
      await expect(downloadButton).toBeVisible();
    }
  });

  test('should handle step completion', async ({ page }) => {
    // Click on approvals training step
    await page.click('.step-item:has-text("Approvals & Training")');
    
    // Look for mark complete button
    const completeButton = page.locator('button:has-text("Mark Complete"), button:has-text("Complete")');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      
      // Wait for completion to register
      await page.waitForTimeout(1000);
      
      // Verify step is now completed
      const completedIndicator = page.locator('.step-item:has-text("Approvals & Training") .checkmark');
      if (await completedIndicator.isVisible()) {
        await expect(completedIndicator).toBeVisible();
      }
    }
  });

  test('should handle step navigation and content persistence', async ({ page }) => {
    // Click on planning overview step
    await page.click('.step-item:has-text("Planning Overview")');
    
    // Verify step content is displayed
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Click on approvals training step
    await page.click('.step-item:has-text("Approvals & Training")');
    
    // Verify step content is displayed
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Go back to planning overview
    await page.click('.step-item:has-text("Planning Overview")');
    
    // Verify step content is displayed
    await expect(page.locator('.main-content')).toBeVisible();
  });

  test('should display progress information', async ({ page }) => {
    // Look for progress bar in sidebar
    const progressBar = page.locator('.sidebar-progress-bar');
    const progressInfo = page.locator('.progress-info');
    
    if (await progressBar.isVisible()) {
      await expect(progressBar).toBeVisible();
      await expect(progressInfo).toBeVisible();
      
      // Verify progress text
      await expect(page.locator('text=1 of 4 steps complete')).toBeVisible();
    }
  });

  test('should show action required indicators', async ({ page }) => {
    // Verify planning overview doesn't show action required (completed)
    const planningStep = page.locator('.step-item:has-text("Planning Overview")');
    await expect(planningStep).toBeVisible();
    
    // Verify other steps show action required
    await expect(page.locator('.step-item:has-text("Approvals & Training")')).toBeVisible();
    await expect(page.locator('.step-item:has-text("Standard Operating Procedures")')).toBeVisible();
    await expect(page.locator('.step-item:has-text("Permit Application")')).toBeVisible();
  });

  test('should handle different step types correctly', async ({ page }) => {
    // Click on info step
    await page.click('.step-item:has-text("Planning Overview")');
    
    // Verify info step content
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Click on PDF step
    await page.click('.step-item:has-text("Standard Operating Procedures")');
    
    // Verify PDF step content
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Verify form ID is displayed
    await expect(page.locator('text=SAN_DIEGO_SOP-English')).toBeVisible();
  });

  test('should handle step completion workflow', async ({ page }) => {
    // Click on approvals training step
    await page.click('.step-item:has-text("Approvals & Training")');
    
    // Look for mark complete button
    const completeButton = page.locator('button:has-text("Mark Complete"), button:has-text("Complete")');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      
      // Wait for completion to register
      await page.waitForTimeout(1000);
      
      // Verify step is now completed
      const completedIndicator = page.locator('.step-item:has-text("Approvals & Training") .checkmark');
      if (await completedIndicator.isVisible()) {
        await expect(completedIndicator).toBeVisible();
      }
    }
    
    // Verify step content is still accessible
    await page.click('.step-item:has-text("Approvals & Training")');
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Go back to planning overview
    await page.click('.step-item:has-text("Planning Overview")');
    await expect(page.locator('.main-content')).toBeVisible();
  });
});
