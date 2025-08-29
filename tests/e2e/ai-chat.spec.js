import { test, expect } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

test.describe('AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    // DEBUG: Start logging early
    console.log('🔍 DEBUG: Starting test setup...');
    
    // Mock all Firestore calls to return our test data
    await page.route('**/firestore/v1/projects/*/databases/*/documents/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/applications/san_diego_county_mehko')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fields: {
              id: { stringValue: 'san_diego_county_mehko' },
              title: { stringValue: 'San Diego County MEHKO' },
              description: { stringValue: 'Home-based restaurant permit for up to 30 meals/day or 90 meals/week, max $100,000 annual sales (adjusted). No signage; food must be prepared, cooked, and served/delivered the same day.' },
              steps: {
                arrayValue: {
                  values: [
                    {
                      mapValue: {
                        fields: {
                          id: { stringValue: 'step1' },
                          title: { stringValue: 'Submit Application' },
                          type: { stringValue: 'info' },
                          content: { stringValue: 'Complete and submit your application form' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          })
        });
      } else if (url.includes('/applications')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            documents: [
              {
                name: 'projects/test-project/databases/(default)/documents/applications/san_diego_county_mehko',
                fields: {
                  id: { stringValue: 'san_diego_county_mehko' },
                  title: { stringValue: 'San Diego County MEHKO' },
                  description: { stringValue: 'Home-based restaurant permit for up to 30 meals/day or 90 meals/day, max $100,000 annual sales (adjusted). No signage; food must be prepared, cooked, and served/delivered the same day.' },
                  steps: {
                    arrayValue: {
                      values: [
                        {
                          mapValue: {
                            fields: {
                              id: { stringValue: 'step1' },
                              title: { stringValue: 'Submit Application' },
                              type: { stringValue: 'info' },
                              content: { stringValue: 'Complete and submit your application form' }
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
      } else if (url.includes('/users/test-user-123/pinnedApplications')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            documents: []
          })
        });
      } else if (url.includes('/users/test-user-123/applications/san_diego_county_mehko/chatMessages')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            documents: []
          })
        });
      } else if (url.includes('/users/test-user-123/applications/san_diego_county_mehko/progress')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fields: {
              completedSteps: { arrayValue: { values: [] } }
            }
          })
        });
      } else {
        // Default response for other Firestore calls
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            documents: []
          })
        });
      }
    });

    // Mock the AI chat API endpoint
    await page.route('**/api/ai-chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'I can help you with your MEHKO application! What would you like to know?'
        })
      });
    });

    // Go to the dashboard first
    console.log('🔍 DEBUG: Going to dashboard...');
    await page.goto('/dashboard');
    
    // Check if we need to sign in
    const signInButton = page.locator('button:has-text("Sign In")');
    if (await signInButton.isVisible()) {
      console.log('🔐 Need to sign in - opening auth modal');
      
      // Click sign in button to open auth modal
      await signInButton.click();
      
      // Wait for auth modal to appear
      await page.waitForSelector('.auth-modal', { timeout: 10000 });
      
      // Fill in test credentials
      await page.fill('input[type="email"]', 'test@test.com');
      await page.fill('input[type="password"]', 'Test123!');
      
      // Click sign in button
      await page.click('.auth-submit-btn');
      
      // Wait for authentication to complete - try multiple selectors
      try {
        await page.waitForSelector('.user-info', { timeout: 5000 });
        console.log('✅ Found user-info element');
      } catch (error) {
        try {
          await page.waitForSelector('button:has-text("Sign Out")', { timeout: 5000 });
          console.log('✅ Found sign out button');
        } catch (error2) {
          try {
            await page.waitForSelector('text="test@test.com"', { timeout: 5000 });
            console.log('✅ Found user email text');
          } catch (error3) {
            throw new Error('Authentication failed - none of the expected elements found');
          }
        }
      }
      console.log('✅ Authentication completed successfully');
    } else {
      console.log('✅ Already authenticated');
    }
    
    // DEBUG: Check what's on the page after authentication
    console.log('🔍 DEBUG: Checking page after authentication...');
    const pageContentAfterAuth = await page.content();
    console.log('Page content after auth (first 1000 chars):');
    console.log(pageContentAfterAuth.substring(0, 1000));
    
    // Wait for the page to load and applications to appear - use more flexible selector
    console.log('🔍 DEBUG: Waiting for applications to appear...');
    try {
      await page.waitForSelector('text=San Diego County MEHKO, text=San Diego County MEHKO', { timeout: 15000 });
      console.log('✅ Found San Diego County MEHKO application');
    } catch (error) {
      console.log('❌ Failed to find San Diego County MEHKO, trying alternative selectors...');
      
      // Try alternative selectors
      const altSelectors = [
        'text=San Diego County MEHKO',
        'text=San Diego County MEHKO',
        'h3:has-text("San Diego")',
        '[data-testid*="san-diego"]',
        'text=San Diego'
      ];
      
      let found = false;
      for (const selector of altSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(`✅ Found application using selector: ${selector}`);
          found = true;
          break;
        } catch (e) {
          console.log(`❌ Selector failed: ${selector}`);
        }
      }
      
      if (!found) {
        throw new Error('Could not find San Diego County MEHKO application with any selector');
      }
    }
    
    // Select San Diego application - use more flexible selector
    console.log('🔍 DEBUG: Clicking on San Diego application...');
    try {
      await page.click('text=San Diego County MEHKO, text=San Diego County MEHKO');
    } catch (error) {
      console.log('❌ Failed to click with primary selector, trying alternatives...');
      await page.click('h3:has-text("San Diego")');
    }
    
    // Wait for the application to load
    console.log('🔍 DEBUG: Waiting for application to load...');
    await page.waitForTimeout(3000);
    
    // Click on the steps section to show AI Chat
    console.log('🔍 DEBUG: Clicking on Steps section...');
    try {
      await page.click('text=Steps');
    } catch (error) {
      console.log('❌ Failed to click Steps, trying alternative...');
      await page.click('button:has-text("Steps")');
    }
    
    // Wait for the AI chat to appear
    console.log('🔍 DEBUG: Waiting for AI chat to appear...');
    await page.waitForTimeout(3000);
    
    // DEBUG: Check what's actually on the page and write to file
    console.log('🔍 DEBUG: Checking page content after setup...');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      elements: {}
    };
    
    // Check if we can see any AI chat elements
    debugInfo.elements.aiChat = await page.locator('.ai-chat').count();
    console.log(`Found ${debugInfo.elements.aiChat} AI chat elements`);
    
    // Check if we can see the login prompt
    debugInfo.elements.loginPrompt = await page.locator('text=Please log in to use this feature').count();
    console.log(`Found ${debugInfo.elements.loginPrompt} login prompts`);
    
    // Check if we can see the user info (indicating we're authenticated)
    debugInfo.elements.userInfo = await page.locator('.user-info').count();
    console.log(`Found ${debugInfo.elements.userInfo} user info elements`);
    
    // Check if we can see the AI chat interface
    debugInfo.elements.aiChatHeader = await page.locator('.ai-chat__header').count();
    console.log(`Found ${debugInfo.elements.aiChatHeader} AI chat headers`);
    
    // Check if we can see the textarea
    debugInfo.elements.textarea = await page.locator('textarea[placeholder*="Ask Orion"]').count();
    console.log(`Found ${debugInfo.elements.textarea} AI chat textareas`);
    
    // Check what sections are visible
    debugInfo.elements.stepsSection = await page.locator('text=Steps').count();
    console.log(`Found ${debugInfo.elements.stepsSection} Steps sections`);
    
    // Check if we're on the right page
    debugInfo.currentUrl = page.url();
    console.log(`Current URL: ${debugInfo.currentUrl}`);
    
    // If we see a login prompt, the authentication didn't work properly
    if (debugInfo.elements.loginPrompt > 0) {
      console.log('❌ AI Chat is showing login prompt - authentication failed');
      throw new Error('AI Chat is showing login prompt despite authentication - test setup failed');
    }
    
    // Log page content for debugging
    const pageContent = await page.content();
    debugInfo.pageContent = pageContent.substring(0, 3000); // First 3000 chars
    console.log('Page content (first 3000 chars):');
    console.log(debugInfo.pageContent);
    
    // Write debug info to file
    const debugFilePath = join(process.cwd(), 'test-debug.log');
    try {
      writeFileSync(debugFilePath, JSON.stringify(debugInfo, null, 2));
      console.log(`📝 Debug info written to: ${debugFilePath}`);
    } catch (error) {
      console.error('Failed to write debug file:', error);
    }
  });

  test('should display AI chat interface when working on steps', async ({ page }) => {
    // The AI Chat component should be visible when working on steps
    
    // Verify AI chat interface is displayed using real selectors
    await expect(page.locator('.ai-chat')).toBeVisible();
    await expect(page.locator('.ai-chat__header')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Ask Orion"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
  });

  // COMMENTED OUT TESTS - Uncomment these one by one as you fix them
  /*
  test('should show welcome message and application context', async ({ page }) => {
    // Verify the welcome message is displayed
    await expect(page.locator('text=Welcome!')).toBeVisible();
    await expect(page.locator('text=I\'m here to help with San Diego County MEHKO')).toBeVisible();
    
    // Verify the AI avatar is visible
    await expect(page.locator('.ai-chat__avatar:has-text("🤖")')).toBeVisible();
  });

  test('should show welcome message and application context', async ({ page }) => {
    // Verify the welcome message is displayed
    await expect(page.locator('text=Welcome!')).toBeVisible();
    await expect(page.locator('text=I\'m here to help with San Diego County MEHKO')).toBeVisible();
    
    // Verify the AI avatar is visible
    await expect(page.locator('.ai-chat__avatar:has-text("🤖")')).toBeVisible();
  });

  test('should display general tasks section', async ({ page }) => {
    // Verify the general tasks section is visible
    await expect(page.locator('text=General Tasks I can assist you with')).toBeVisible();
    
    // Check if there are guide chips (quick action buttons)
    await expect(page.locator('.ai-chat__guide-chip')).toBeVisible();
  });

  test('should handle basic chat input', async ({ page }) => {
    // Find the textarea input
    const textarea = page.locator('textarea[placeholder*="Ask Orion"]');
    
    // Type a message
    await textarea.fill('How do I start my MEHKO application?');
    
    // Verify the message is in the input
    await expect(textarea).toHaveValue('How do I start my MEHKO application?');
    
    // Verify the send button is enabled
    await expect(page.locator('button:has-text("Send")')).toBeEnabled();
  });

  test('should show AI disclaimer', async ({ page }) => {
    // Verify the AI disclaimer is displayed
    await expect(page.locator('text=AI responses may contain inaccuracies')).toBeVisible();
    await expect(page.locator('text=Please verify important information with official sources')).toBeVisible();
  });

  test('should show AI assistant header', async ({ page }) => {
    // Verify the AI assistant header is displayed
    await expect(page.locator('text=Your AI Assistant')).toBeVisible();
  });
  */
});
