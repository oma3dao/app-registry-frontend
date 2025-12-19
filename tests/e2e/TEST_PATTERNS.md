# Common Test Patterns

## Overview

This document provides common patterns for writing E2E tests, based on best practices used in this test suite.

## 📋 Table of Contents

1. [Page Setup Pattern](#page-setup-pattern)
2. [API Testing Pattern](#api-testing-pattern)
3. [Form Testing Pattern](#form-testing-pattern)
4. [Modal Testing Pattern](#modal-testing-pattern)
5. [Navigation Pattern](#navigation-pattern)
6. [Error Handling Pattern](#error-handling-pattern)
7. [Performance Monitoring Pattern](#performance-monitoring-pattern)
8. [Authentication Pattern](#authentication-pattern)

## 🏗️ Page Setup Pattern

### Basic Page Setup

```typescript
import { test, expect } from './fixtures';
import { setupTestPage, waitForPageReady } from './test-helpers';

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestPage(page, '/', {
      navigationTimeout: 60000,
      retries: 3,
      waitForReact: true,
      removeOverlays: true,
    });
    await waitForPageReady(page, {
      waitForNetwork: true,
      waitForReact: true,
    });
  });

  test('should display content', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
  });
});
```

### Pattern Features

- Uses `setupTestPage` for consistent setup
- Waits for page to be ready before tests
- Handles overlays and errors
- Configurable timeouts and retries

## 🔌 API Testing Pattern

### Basic API Test

```typescript
import { test, expect } from './fixtures';
import { setupTestPage, performanceMonitor } from './test-helpers';
import { 
  makeApiRequest, 
  verifyApiResponse,
  checkServerAvailability,
  API_PERFORMANCE_THRESHOLDS
} from './api-test-utilities';

test.describe('API Routes', () => {
  test.setTimeout(120000);
  
  let serverAvailable = false;
  
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    serverAvailable = await checkServerAvailability(page);
    await context.close();
  });

  test('should handle API request @api @slow', async ({ page }) => {
    test.skip(!serverAvailable, 'Dev server is not available');
    
    performanceMonitor.startTest('should handle API request');
    
    try {
      await setupTestPage(page, '/');
      
      const { response, metrics } = await makeApiRequest(
        page,
        'POST',
        '/api/endpoint',
        {
          data: { /* ... */ },
          timeout: 30000,
          retries: 1,
        }
      );
      
      const { status, json } = await verifyApiResponse(response, [200]);
      expect(status).toBe(200);
      expect(json).toHaveProperty('data');
      
      // Check performance
      const perfCheck = checkPerformance(metrics, API_PERFORMANCE_THRESHOLDS.normal);
      if (!perfCheck.passed) {
        console.warn(`[Performance] ${perfCheck.message}`);
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('ECONNREFUSED')) {
        test.skip(true, 'Server is not available');
        return;
      }
      throw error;
    } finally {
      performanceMonitor.endTest();
    }
  });
});
```

### Pattern Features

- Checks server availability
- Uses `makeApiRequest` helper
- Verifies response structure
- Monitors performance
- Handles connection errors gracefully

## 📝 Form Testing Pattern

### Basic Form Test

```typescript
import { test, expect } from './fixtures';
import { setupTestPage, waitForPageReady, waitForElementStable } from './test-helpers';

test('should submit form successfully @ui', async ({ page }) => {
  await setupTestPage(page, '/form');
  await waitForPageReady(page);
  
  // Fill form fields
  await page.fill('[name="field1"]', 'value1');
  await page.fill('[name="field2"]', 'value2');
  
  // Wait for form to be ready
  const form = page.locator('form').first();
  await waitForElementStable(form, { stabilityDuration: 300 });
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for submission to complete
  await waitForPageReady(page, { waitForNetwork: true });
  
  // Verify success
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Form Validation Pattern

```typescript
test('should show validation errors @ui @error', async ({ page }) => {
  await setupTestPage(page, '/form');
  await waitForPageReady(page);
  
  // Try to submit empty form
  await page.click('button[type="submit"]');
  
  // Wait for validation errors
  await waitForElementStable(page.locator('.error-message'), {
    stabilityDuration: 300,
  });
  
  // Verify errors
  await expect(page.locator('.error-message')).toBeVisible();
  await expect(page.locator('.error-message')).toContainText('required');
});
```

### Pattern Features

- Waits for form stability before submission
- Validates form errors
- Uses stable selectors
- Handles form state changes

## 🪟 Modal Testing Pattern

### Basic Modal Test

```typescript
import { test, expect } from './fixtures';
import { setupTestPage, waitForPageReady, waitForElementStable } from './test-helpers';

test('should open and close modal @ui', async ({ page }) => {
  await setupTestPage(page, '/');
  await waitForPageReady(page);
  
  // Open modal
  await page.click('button[data-testid="open-modal"]');
  
  // Wait for modal to appear
  const modal = page.locator('[role="dialog"]').first();
  await waitForElementStable(modal, { stabilityDuration: 500 });
  
  // Verify modal is visible
  await expect(modal).toBeVisible();
  
  // Close modal
  await page.click('button[aria-label="Close"]');
  
  // Wait for modal to disappear
  await expect(modal).not.toBeVisible();
});
```

### Modal Wizard Pattern

```typescript
test('should complete wizard flow @ui @slow', async ({ page }) => {
  await setupTestPage(page, '/');
  await waitForPageReady(page);
  
  // Open wizard
  await page.click('button[data-testid="open-wizard"]');
  const modal = page.locator('[role="dialog"]').first();
  await waitForElementStable(modal, { stabilityDuration: 500 });
  
  // Step 1: Fill first step
  await page.fill('[name="step1-field"]', 'value1');
  await page.click('button:has-text("Next")');
  await waitForElementStable(modal, { stabilityDuration: 500 });
  
  // Step 2: Fill second step
  await page.fill('[name="step2-field"]', 'value2');
  await page.click('button:has-text("Next")');
  await waitForElementStable(modal, { stabilityDuration: 500 });
  
  // Step 3: Submit
  await page.click('button:has-text("Submit")');
  await waitForPageReady(page, { waitForNetwork: true });
  
  // Verify completion
  await expect(page.locator('.success-message')).toBeVisible();
});
```

### Pattern Features

- Waits for modal to stabilize
- Handles multi-step flows
- Uses role-based selectors
- Waits for state changes

## 🧭 Navigation Pattern

### Basic Navigation Test

```typescript
import { test, expect } from './fixtures';
import { setupTestPage, waitForPageReady } from './test-helpers';

test('should navigate between pages @ui', async ({ page }) => {
  await setupTestPage(page, '/');
  await waitForPageReady(page);
  
  // Navigate to another page
  await page.click('a[href="/dashboard"]');
  await waitForPageReady(page);
  
  // Verify navigation
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('.dashboard')).toBeVisible();
});
```

### Browser Navigation Pattern

```typescript
test('should handle browser back navigation @ui', async ({ page }) => {
  await setupTestPage(page, '/');
  await waitForPageReady(page);
  
  // Navigate forward
  await page.click('a[href="/page2"]');
  await waitForPageReady(page);
  await expect(page).toHaveURL(/\/page2/);
  
  // Navigate back
  await page.goBack();
  await waitForPageReady(page);
  await expect(page).toHaveURL(/\//);
});
```

### Pattern Features

- Waits for navigation to complete
- Verifies URL changes
- Handles browser navigation
- Checks page content after navigation

## ⚠️ Error Handling Pattern

### API Error Handling

```typescript
test('should handle API errors gracefully @api @error', async ({ page }) => {
  performanceMonitor.startTest('should handle API errors gracefully');
  
  try {
    await setupTestPage(page, '/');
    
    const { response } = await makeApiRequest(
      page,
      'POST',
      '/api/endpoint',
      {
        data: { invalid: 'data' },
        timeout: 30000,
      }
    );
    
    // Verify error response
    expect(response.status()).toBeGreaterThanOrEqual(400);
    
    const json = await response.json();
    expect(json).toHaveProperty('error');
  } catch (error: any) {
    const errorMessage = error?.message || '';
    const isConnectionError = 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ECONNRESET');
    
    if (isConnectionError) {
      test.skip(true, 'Server is not available');
      return;
    }
    throw error;
  } finally {
    performanceMonitor.endTest();
  }
});
```

### UI Error Handling

```typescript
test('should display error message @ui @error', async ({ page }) => {
  await setupTestPage(page, '/form');
  await waitForPageReady(page);
  
  // Trigger error
  await page.fill('[name="email"]', 'invalid-email');
  await page.click('button[type="submit"]');
  
  // Wait for error message
  await waitForElementStable(page.locator('.error-message'), {
    stabilityDuration: 300,
  });
  
  // Verify error
  await expect(page.locator('.error-message')).toBeVisible();
  await expect(page.locator('.error-message')).toContainText('invalid');
});
```

### Pattern Features

- Handles connection errors gracefully
- Verifies error responses
- Skips tests when server is unavailable
- Waits for error messages to appear

## ⚡ Performance Monitoring Pattern

### Basic Performance Monitoring

```typescript
import { test, expect } from './fixtures';
import { setupTestPage, performanceMonitor } from './test-helpers';

test.describe('Feature', () => {
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Performance Summary:');
      console.log(`  Total Tests: ${summary.total}`);
      console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
      console.log(`  Slow Tests: ${summary.slow}`);
    }
  });

  test('should load quickly @performance', async ({ page }) => {
    performanceMonitor.startTest('should load quickly');
    
    try {
      await setupTestPage(page, '/');
      // ... test code
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.warn(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});
```

### Pattern Features

- Tracks test execution time
- Logs performance summary
- Warns about slow tests
- Provides performance insights

## 🔐 Authentication Pattern

### Authenticated Test

```typescript
import { test, expect } from './fixtures';
import { setupAuthenticatedPage } from './auth-helpers';
import { waitForPageReady } from './test-helpers';

test('should display authenticated content @auth', async ({ page }) => {
  await setupAuthenticatedPage(page);
  await waitForPageReady(page);
  
  // Verify authenticated state
  await expect(page.locator('.dashboard')).toBeVisible();
  await expect(page.locator('.user-menu')).toBeVisible();
});
```

### Authentication Check Pattern

```typescript
import { isAuthenticated } from './test-helpers';

test('should handle authentication state @auth', async ({ page }) => {
  await setupTestPage(page, '/dashboard');
  await waitForPageReady(page);
  
  const authenticated = await isAuthenticated(page);
  
  if (authenticated) {
    await expect(page.locator('.dashboard')).toBeVisible();
  } else {
    await expect(page.locator('.login-prompt')).toBeVisible();
  }
});
```

### Pattern Features

- Uses authentication helpers
- Checks authentication state
- Handles both authenticated and unauthenticated states
- Uses fixtures for authenticated pages

## 🔗 Related Resources

- **[TEST_BEST_PRACTICES.md](./TEST_BEST_PRACTICES.md)** - Best practices guide
- **[TEST_ANTI_PATTERNS.md](./TEST_ANTI_PATTERNS.md)** - What to avoid
- **[test-helpers.ts](./test-helpers.ts)** - Test utilities
- **[api-test-utilities.ts](./api-test-utilities.ts)** - API utilities

---

**Status:** ✅ Complete - Common patterns documented

