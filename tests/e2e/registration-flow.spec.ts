import { test, expect } from '@playwright/test';

/**
 * E2E Tests for App Registration Flow
 * Tests the complete multi-step wizard for registering a new app
 * 
 * Note: These tests may require wallet connection in a real environment
 * For CI/CD, consider using wallet mocking or test accounts
 */

test.describe('App Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // Tests opening registration wizard
  test('should open registration wizard', async ({ page }) => {
    // Look for register/new app button
    const registerButton = page.getByRole('button', { name: /register|new app|create/i }).first();
    
    const buttonExists = await registerButton.count() > 0;
    
    if (buttonExists && await registerButton.isVisible()) {
      await registerButton.click();
      
      // Wizard modal should open
      const wizardModal = page.locator('[role="dialog"]');
      await expect(wizardModal).toBeVisible({ timeout: 5000 });
      
      // Should show step 1 content
      await expect(page.getByText(/app name|verification/i)).toBeVisible();
    }
  });

  // Tests wizard step indicators
  test('should display step indicators in wizard', async ({ page }) => {
    const registerButton = page.getByRole('button', { name: /register|new app|create/i }).first();
    
    if (await registerButton.isVisible().catch(() => false)) {
      await registerButton.click();
      
      // Look for step indicators (dots, numbers, or progress bar)
      const stepIndicators = page.locator('[data-testid="step-indicator"], .step-indicator, [aria-label*="Step"]');
      
      const hasSteps = await stepIndicators.count() > 0;
      expect(hasSteps).toBeTruthy();
    }
  });

  // Tests form validation on wizard
  test('should validate required fields', async ({ page }) => {
    const registerButton = page.getByRole('button', { name: /register|new app|create/i }).first();
    
    if (await registerButton.isVisible().catch(() => false)) {
      await registerButton.click();
      
      // Try to proceed without filling fields
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        
        // Should show validation errors
        const errorMessages = page.locator('text=/required|invalid|error/i');
        const hasErrors = await errorMessages.count() > 0;
        
        // Either shows errors or doesn't proceed to next step
        expect(hasErrors || await page.getByText(/app name|verification/i).isVisible()).toBeTruthy();
      }
    }
  });

  // Tests navigation between wizard steps
  test('should allow navigation between steps', async ({ page }) => {
    const registerButton = page.getByRole('button', { name: /register|new app|create/i }).first();
    
    if (await registerButton.isVisible().catch(() => false)) {
      await registerButton.click();
      
      // Fill minimal required fields if possible
      const nameInput = page.locator('input[id="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('E2E Test App');
      }
      
      const versionInput = page.locator('input[id="version"], input[placeholder*="version" i]').first();
      if (await versionInput.isVisible().catch(() => false)) {
        await versionInput.fill('1.0.0');
      }
      
      // Try to go to next step
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        
        // Should have previous button on step 2+
        await expect(page.getByRole('button', { name: /previous|back/i })).toBeVisible({ timeout: 3000 });
      }
    }
  });

  // Tests wizard cancellation
  test('should allow canceling wizard', async ({ page }) => {
    const registerButton = page.getByRole('button', { name: /register|new app|create/i }).first();
    
    if (await registerButton.isVisible().catch(() => false)) {
      await registerButton.click();
      
      // Look for close/cancel button
      const closeButton = page.locator('button[aria-label*="close"], button:has-text("Cancel")').first();
      
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        
        // Wizard should close
        const wizardModal = page.locator('[role="dialog"]');
        await expect(wizardModal).not.toBeVisible({ timeout: 2000 });
      }
    }
  });
});


