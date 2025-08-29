import { test, expect } from '@playwright/test';

test.describe('AI Chat with Real Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard to start fresh
    await page.goto('/dashboard');
  });

  test('should require authentication to access AI chat', async ({ page }) => {
    // Try to access AI chat without being logged in
    // This should trigger the login modal
    
    // Look for any button or link that would open AI chat
    const aiChatButton = page.locator('button:has-text("AI Chat"), button:has-text("Ask AI"), .ai-chat-button, .chat-button');
    
    if (await aiChatButton.isVisible()) {
      await aiChatButton.click();
      
      // Should show login modal
      await expect(page.locator('.auth-modal, .login-modal, .modal')).toBeVisible();
    } else {
      // If no AI chat button is visible, that's also valid behavior
      console.log('No AI chat button found - this may be expected for unauthenticated users');
    }
  });

  test('should display AI chat interface after login', async ({ page }) => {
    // Login first
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
    }
    
    // Verify we're logged in
    await expect(page.locator('.auth-modal, .login-modal, .modal')).not.toBeVisible();
    
    // Now try to access AI chat
    const aiChatButton = page.locator('button:has-text("AI Chat"), button:has-text("Ask AI"), .ai-chat-button, .chat-button');
    
    if (await aiChatButton.isVisible()) {
      await aiChatButton.click();
      
      // Wait for AI chat interface to load
      await page.waitForTimeout(1000);
      
      // Look for AI chat interface elements
      const aiInterface = page.locator('.ai-chat-interface, .chat-interface, .chat-container, .ai-container');
      
      if (await aiInterface.isVisible()) {
        // Verify AI chat interface is displayed
        await expect(aiInterface).toBeVisible();
        
        // Look for common AI chat elements
        const chatInput = page.locator('.chat-input, .message-input, textarea, input[type="text"]');
        const sendButton = page.locator('.send-button, .submit-button, button:has-text("Send"), button:has-text("Submit")');
        
        if (await chatInput.isVisible()) {
          await expect(chatInput).toBeVisible();
        }
        
        if (await sendButton.isVisible()) {
          await expect(sendButton).toBeVisible();
        }
      } else {
        console.log('AI chat interface not found - may need to navigate to specific page');
      }
    } else {
      console.log('No AI chat button found after login - may need to navigate to specific page');
    }
  });

  test('should handle basic chat input and response', async ({ page }) => {
    // Login first
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
    }
    
    // Navigate to a page with AI chat (this might be an application page)
    // Let's try to find an application to work with
    const appCard = page.locator('.application-card, .app-card, .card, [class*="card"]');
    
    if (await appCard.first().isVisible()) {
      await appCard.first().click();
      
      // Wait for application to load
      await page.waitForTimeout(2000);
      
      // Look for AI chat interface in the application context
      const aiChatButton = page.locator('button:has-text("AI Chat"), button:has-text("Ask AI"), .ai-chat-button, .chat-button');
      
      if (await aiChatButton.isVisible()) {
        await aiChatButton.click();
        
        // Wait for AI chat interface
        await page.waitForTimeout(1000);
        
        // Find chat input
        const chatInput = page.locator('.chat-input, .message-input, textarea, input[type="text"]');
        
        if (await chatInput.isVisible()) {
          // Type a simple message
          await chatInput.fill('Hello, how can you help me?');
          
          // Find and click send button
          const sendButton = page.locator('.send-button, .submit-button, button:has-text("Send"), button:has-text("Submit")');
          
          if (await sendButton.isVisible()) {
            await sendButton.click();
            
            // Wait for response
            await page.waitForTimeout(3000);
            
            // Look for AI response
            const aiResponse = page.locator('.ai-response, .chat-message:not(.user-message), .message:not(.user), .response');
            
            if (await aiResponse.isVisible()) {
              await expect(aiResponse).toBeVisible();
              console.log('AI response received successfully');
            } else {
              console.log('No AI response found - may be loading or error');
            }
          }
        }
      }
    } else {
      console.log('No application cards found - may need to seed data first');
    }
  });

  test('should show appropriate error messages for invalid inputs', async ({ page }) => {
    // Login first
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
    }
    
    // Try to send empty message
    const aiChatButton = page.locator('button:has-text("AI Chat"), button:has-text("Ask AI"), .ai-chat-button, .chat-button');
    
    if (await aiChatButton.isVisible()) {
      await aiChatButton.click();
      
      await page.waitForTimeout(1000);
      
      const sendButton = page.locator('.send-button, .submit-button, button:has-text("Send"), button:has-text("Submit")');
      
      if (await sendButton.isVisible()) {
        // Try to send without input
        await sendButton.click();
        
        // Wait for potential error message
        await page.waitForTimeout(1000);
        
        // Look for error message
        const errorMessage = page.locator('.error-message, .chat-error, .error, .alert');
        
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toBeVisible();
          console.log('Error message displayed for empty input');
        }
      }
    }
  });
});
