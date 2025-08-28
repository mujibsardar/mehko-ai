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

  test('should display all application steps correctly', async ({ page }) => {
    // Verify steps are displayed
    await expect(page.locator('[data-testid="application-steps"]')).toBeVisible();
    
    // Verify step titles
    await expect(page.locator('text=Planning Overview')).toBeVisible();
    await expect(page.locator('text=Approvals & Training')).toBeVisible();
    await expect(page.locator('text=Standard Operating Procedures')).toBeVisible();
    await expect(page.locator('text=Permit Application')).toBeVisible();
  });

  test('should show step completion status', async ({ page }) => {
    // Verify completed step is marked
    await expect(page.locator('[data-testid="step-planning_overview"] [data-testid="step-completed"]')).toBeVisible();
    
    // Verify incomplete steps are not marked
    await expect(page.locator('[data-testid="step-approvals_training"] [data-testid="step-completed"]')).not.toBeVisible();
  });

  test('should display step content when clicked', async ({ page }) => {
    // Click on Planning Overview step
    await page.click('[data-testid="step-planning_overview"]');
    
    // Verify step content is displayed
    await expect(page.locator('[data-testid="step-content"]')).toBeVisible();
    await expect(page.locator('text=Start your MEHKO journey with planning resources and guides')).toBeVisible();
  });

  test('should handle PDF step interactions', async ({ page }) => {
    // Click on SOP form step
    await page.click('[data-testid="step-sop_form"]');
    
    // Verify PDF step content
    await expect(page.locator('[data-testid="pdf-step-content"]')).toBeVisible();
    await expect(page.locator('text=Download and complete the SOP form')).toBeVisible();
    
    // Verify PDF download button
    await expect(page.locator('[data-testid="download-pdf-button"]')).toBeVisible();
  });

  test('should allow step completion marking', async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        isAdmin: false
      };
    });

    // Click on Approvals & Training step
    await page.click('[data-testid="step-approvals_training"]');
    
    // Mark step as complete
    await page.click('[data-testid="mark-step-complete"]');
    
    // Verify step is marked as complete
    await expect(page.locator('[data-testid="step-approvals_training"] [data-testid="step-completed"]')).toBeVisible();
  });

  test('should handle step navigation between steps', async ({ page }) => {
    // Navigate to first step
    await page.click('[data-testid="step-planning_overview"]');
    await expect(page.locator('[data-testid="step-content"]')).toBeVisible();
    
    // Navigate to second step
    await page.click('[data-testid="step-approvals_training"]');
    await expect(page.locator('[data-testid="step-content"]')).toBeVisible();
    await expect(page.locator('text=Complete required training and obtain necessary approvals')).toBeVisible();
    
    // Navigate back to first step
    await page.click('[data-testid="step-planning_overview"]');
    await expect(page.locator('text=Start your MEHKO journey with planning resources and guides')).toBeVisible();
  });

  test('should display progress indicators correctly', async ({ page }) => {
    // Verify overall progress
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    
    // Verify progress percentage (1 out of 4 steps = 25%)
    await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('25%');
    
    // Verify progress text
    await expect(page.locator('[data-testid="progress-text"]')).toContainText('1 of 4 steps completed');
  });

  test('should handle step action requirements', async ({ page }) => {
    // Verify action required indicators
    await expect(page.locator('[data-testid="step-planning_overview"] [data-testid="action-required"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="step-approvals_training"] [data-testid="action-required"]')).toBeVisible();
    
    // Verify PDF steps show action required
    await expect(page.locator('[data-testid="step-sop_form"] [data-testid="action-required"]')).toBeVisible();
    await expect(page.locator('[data-testid="step-permit_application_form"] [data-testid="action-required"]')).toBeVisible();
  });

  test('should handle step type-specific rendering', async ({ page }) => {
    // Info step should show content
    await page.click('[data-testid="step-planning_overview"]');
    await expect(page.locator('[data-testid="info-step-content"]')).toBeVisible();
    
    // PDF step should show PDF-specific content
    await page.click('[data-testid="step-sop_form"]');
    await expect(page.locator('[data-testid="pdf-step-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="form-id"]')).toContainText('SAN_DIEGO_SOP-English');
  });

  test('should handle step completion persistence', async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        isAdmin: false
      };
    });

    // Mark a step as complete
    await page.click('[data-testid="step-approvals_training"]');
    await page.click('[data-testid="mark-step-complete"]');
    
    // Reload page
    await page.reload();
    
    // Verify step completion persists
    await expect(page.locator('[data-testid="step-approvals_training"] [data-testid="step-completed"]')).toBeVisible();
  });

  test('should handle step content expansion and collapse', async ({ page }) => {
    // Initially step content should be collapsed
    await expect(page.locator('[data-testid="step-planning_overview"] [data-testid="step-content"]')).not.toBeVisible();
    
    // Click to expand
    await page.click('[data-testid="step-planning_overview"]');
    await expect(page.locator('[data-testid="step-content"]')).toBeVisible();
    
    // Click again to collapse
    await page.click('[data-testid="step-planning_overview"]');
    await expect(page.locator('[data-testid="step-content"]')).not.toBeVisible();
  });
});
