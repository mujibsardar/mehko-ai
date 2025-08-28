import { test, expect } from '@playwright/test';

test.describe('AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.mockUser = {
        uid: 'test-user-123',
        email: 'test@example.com',
        isAdmin: false
      };
    });

    // Mock application data
    await page.route('**/firestore/v1/projects/*/databases/*/documents/applications/san_diego_county_mehko**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            id: { stringValue: 'san_diego_county_mehko' },
            title: { stringValue: 'San Diego County MEHKO' },
            description: { stringValue: 'Home Kitchen Operations Permit for San Diego County' }
          }
        })
      });
    });

    await page.goto('/dashboard');
    
    // Select San Diego application
    await page.click('text=San Diego County MEHKO');
  });

  test('should display AI chat interface', async ({ page }) => {
    // Navigate to AI chat section
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Verify AI chat interface is displayed
    await expect(page.locator('[data-testid="ai-chat-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
  });

  test('should send messages and receive AI responses', async ({ page }) => {
    // Mock AI API response
    await page.route('**/api/ai/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'I can help you with your San Diego County MEHKO application. What specific question do you have?',
          context: 'san_diego_county_mehko'
        })
      });
    });

    // Navigate to AI chat
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Type a message
    await page.fill('[data-testid="chat-input"]', 'How do I start my MEHKO application?');
    
    // Send the message
    await page.click('[data-testid="send-button"]');
    
    // Verify message is displayed
    await expect(page.locator('[data-testid="user-message"]')).toContainText('How do I start my MEHKO application?');
    
    // Verify AI response is displayed
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('I can help you with your San Diego County MEHKO application');
  });

  test('should maintain chat context for the current application', async ({ page }) => {
    // Mock AI API with context-aware response
    await page.route('**/api/ai/chat', async route => {
      const requestBody = JSON.parse(route.postData());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `Based on your San Diego County MEHKO application, ${requestBody.message}`,
          context: 'san_diego_county_mehko'
        })
      });
    });

    // Navigate to AI chat
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Send a context-specific message
    await page.fill('[data-testid="chat-input"]', 'What are the fees?');
    await page.click('[data-testid="send-button"]');
    
    // Verify response includes application context
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('San Diego County MEHKO application');
  });

  test('should handle chat history and persistence', async ({ page }) => {
    // Mock chat history
    await page.route('**/firestore/v1/projects/*/databases/*/documents/users/*/chats/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            messages: {
              arrayValue: {
                values: [
                  {
                    mapValue: {
                      fields: {
                        role: { stringValue: 'user' },
                        content: { stringValue: 'Previous question about fees' },
                        timestamp: { timestampValue: '2024-01-01T00:00:00Z' }
                      }
                    }
                  },
                  {
                    mapValue: {
                      fields: {
                        role: { stringValue: 'assistant' },
                        content: { stringValue: 'Previous answer about fees' },
                        timestamp: { timestampValue: '2024-01-01T00:00:01Z' }
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

    // Navigate to AI chat
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Verify chat history is loaded
    await expect(page.locator('[data-testid="chat-history"]')).toBeVisible();
    await expect(page.locator('text=Previous question about fees')).toBeVisible();
    await expect(page.locator('text=Previous answer about fees')).toBeVisible();
  });

  test('should handle chat input validation', async ({ page }) => {
    // Navigate to AI chat
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Try to send empty message
    await page.click('[data-testid="send-button"]');
    
    // Verify validation message
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Please enter a message');
    
    // Try to send very long message
    const longMessage = 'a'.repeat(1001);
    await page.fill('[data-testid="chat-input"]', longMessage);
    await page.click('[data-testid="send-button"]');
    
    // Verify length validation
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Message too long');
  });

  test('should handle AI API errors gracefully', async ({ page }) => {
    // Mock AI API error
    await page.route('**/api/ai/chat', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AI service temporarily unavailable'
        })
      });
    });

    // Navigate to AI chat
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Send a message
    await page.fill('[data-testid="chat-input"]', 'Help me with my application');
    await page.click('[data-testid="send-button"]');
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('AI service temporarily unavailable');
  });

  test('should show typing indicators during AI processing', async ({ page }) => {
    // Mock slow AI response
    await page.route('**/api/ai/chat', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Here is your answer',
          context: 'san_diego_county_mehko'
        })
      });
    });

    // Navigate to AI chat
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Send a message
    await page.fill('[data-testid="chat-input"]', 'What are the requirements?');
    await page.click('[data-testid="send-button"]');
    
    // Verify typing indicator is shown
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
    
    // Wait for response
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
    
    // Verify typing indicator is hidden
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible();
  });

  test('should handle chat context switching between applications', async ({ page }) => {
    // Mock Los Angeles application
    await page.route('**/firestore/v1/projects/*/databases/*/documents/applications/los_angeles_county_mehko**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fields: {
            id: { stringValue: 'los_angeles_county_mehko' },
            title: { stringValue: 'Los Angeles County MEHKO' },
            description: { stringValue: 'Home Kitchen Operations Permit for Los Angeles County' }
          }
        })
      });
    });

    // Start chat in San Diego context
    await page.click('[data-testid="ai-chat-tab"]');
    await page.fill('[data-testid="chat-input"]', 'San Diego question');
    await page.click('[data-testid="send-button"]');
    
    // Switch to Los Angeles application
    await page.goto('/dashboard');
    await page.click('text=Los Angeles County MEHKO');
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Verify context has changed
    await expect(page.locator('[data-testid="chat-context"]')).toContainText('Los Angeles County MEHKO');
  });

  test('should provide helpful suggestions and examples', async ({ page }) => {
    // Navigate to AI chat
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Verify suggestion chips are displayed
    await expect(page.locator('[data-testid="suggestion-chips"]')).toBeVisible();
    await expect(page.locator('[data-testid="suggestion-chip"]')).toHaveCount(3);
    
    // Click on a suggestion
    await page.click('[data-testid="suggestion-chip"]:first-child');
    
    // Verify suggestion is added to input
    const inputValue = await page.inputValue('[data-testid="chat-input"]');
    expect(inputValue.length).toBeGreaterThan(0);
  });

  test('should handle chat export and sharing', async ({ page }) => {
    // Navigate to AI chat
    await page.click('[data-testid="ai-chat-tab"]');
    
    // Send a few messages to create chat history
    await page.fill('[data-testid="chat-input"]', 'First question');
    await page.click('[data-testid="send-button"]');
    
    await page.fill('[data-testid="chat-input"]', 'Second question');
    await page.click('[data-testid="send-button"]');
    
    // Click export button
    await page.click('[data-testid="export-chat-button"]');
    
    // Verify export options are shown
    await expect(page.locator('[data-testid="export-options"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-text"]')).toBeVisible();
  });
});
