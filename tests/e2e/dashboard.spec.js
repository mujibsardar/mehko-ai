import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
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
                            content: { stringValue: 'Start your MEHKO journey' }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
            {
              name: 'projects/test/databases/test/documents/applications/los_angeles_county_mehko',
              fields: {
                id: { stringValue: 'los_angeles_county_mehko' },
                title: { stringValue: 'Los Angeles County MEHKO' },
                description: { stringValue: 'Home Kitchen Operations Permit for Los Angeles County' },
                rootDomain: { stringValue: 'lacounty.gov' },
                steps: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            id: { stringValue: 'planning_overview' },
                            title: { stringValue: 'Planning Overview' },
                            type: { stringValue: 'info' },
                            content: { stringValue: 'Begin your LA County MEHKO application' }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          ]
        })
      });
    });

    await page.goto('/dashboard');
  });

  test('should display application grid with available counties', async ({ page }) => {
    // Verify applications are displayed
    await expect(page.locator('[data-testid="application-card-grid"]')).toBeVisible();
    await expect(page.locator('text=Select Your Application')).toBeVisible();
    
    // Verify San Diego County application
    await expect(page.locator('text=San Diego County MEHKO')).toBeVisible();
    await expect(page.locator('text=Home Kitchen Operations Permit for San Diego County')).toBeVisible();
    await expect(page.locator('text=Source: sandiegocounty.gov')).toBeVisible();
    
    // Verify Los Angeles County application
    await expect(page.locator('text=Los Angeles County MEHKO')).toBeVisible();
    await expect(page.locator('text=Home Kitchen Operations Permit for Los Angeles County')).toBeVisible();
    await expect(page.locator('text=Source: lacounty.gov')).toBeVisible();
  });

  test('should handle application selection and navigation', async ({ page }) => {
    // Click on San Diego County application
    await page.click('text=San Diego County MEHKO');
    
    // Verify application overview is displayed
    await expect(page.locator('[data-testid="application-overview"]')).toBeVisible();
    await expect(page.locator('h2:has-text("San Diego County MEHKO")')).toBeVisible();
    await expect(page.locator('text=Home Kitchen Operations Permit for San Diego County')).toBeVisible();
    
    // Verify steps are displayed
    await expect(page.locator('[data-testid="application-steps"]')).toBeVisible();
    await expect(page.locator('text=Planning Overview')).toBeVisible();
  });

  test('should display sidebar with navigation options', async ({ page }) => {
    // Verify sidebar is visible
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Verify navigation elements
    await expect(page.locator('[data-testid="sidebar-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-applications"]')).toBeVisible();
  });

  test('should handle responsive layout changes', async ({ page }) => {
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile-specific behavior
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Verify desktop layout
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  test('should display loading states', async ({ page }) => {
    // Mock slow loading
    await page.route('**/firestore/v1/projects/*/databases/*/documents/applications**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ documents: [] })
      });
    });

    // Reload page to trigger loading state
    await page.reload();
    
    // Verify loading indicator is shown
    await expect(page.locator('text=Loading applications...')).toBeVisible();
  });

  test('should handle empty state when no applications available', async ({ page }) => {
    // Mock empty applications
    await page.route('**/firestore/v1/projects/*/databases/*/documents/applications**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ documents: [] })
      });
    });

    // Reload page
    await page.reload();
    
    // Verify empty state message
    await expect(page.locator('text=No applications available at this time')).toBeVisible();
  });

  test('should handle application search and filtering', async ({ page }) => {
    // Mock search functionality
    await page.addInitScript(() => {
      window.mockSearch = (query) => {
        const apps = document.querySelectorAll('[data-testid="application-card"]');
        apps.forEach(app => {
          const title = app.querySelector('h3').textContent.toLowerCase();
          const visible = title.includes(query.toLowerCase());
          app.style.display = visible ? 'block' : 'none';
        });
      };
    });

    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'San Diego');
    
    // Verify only San Diego application is visible
    await expect(page.locator('text=San Diego County MEHKO')).toBeVisible();
    await expect(page.locator('text=Los Angeles County MEHKO')).not.toBeVisible();
  });

  test('should handle application pinning functionality', async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        isAdmin: false
      };
    });

    // Click on San Diego application
    await page.click('text=San Diego County MEHKO');
    
    // Pin the application
    await page.click('[data-testid="pin-application-button"]');
    
    // Verify application is pinned
    await expect(page.locator('[data-testid="pinned-applications"]')).toContainText('San Diego County MEHKO');
  });

  test('should display application progress correctly', async ({ page }) => {
    // Mock progress data
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*/progress**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          documents: [
            {
              name: 'projects/test/databases/test/documents/users/test/progress/san_diego_county_mehko',
              fields: {
                completedSteps: {
                  arrayValue: {
                    values: [
                      { stringValue: 'planning_overview' }
                    ]
                  }
                }
              }
            }
          ]
        })
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify progress is displayed
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
  });
});
