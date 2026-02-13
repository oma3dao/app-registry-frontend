# Test Best Practices Guide

## Overview

This guide provides best practices for writing maintainable, reliable, and efficient E2E tests.

## 📋 Table of Contents

1. [Test Structure](#test-structure)
2. [Naming Conventions](#naming-conventions)
3. [Test Organization](#test-organization)
4. [Waiting Strategies](#waiting-strategies)
5. [Error Handling](#error-handling)
6. [Performance](#performance)
7. [Accessibility](#accessibility)
8. [Maintainability](#maintainability)

## 🏗️ Test Structure

### Basic Test Structure

```typescript
import { test, expect } from './fixtures';
import { setupTestPage, performanceMonitor } from './test-helpers';

test.describe('Feature Name', () => {
  // Set timeout for all tests in this suite
  test.setTimeout(60000);

  // Performance summary after all tests
  test.afterAll(() => {
    const summary = performanceMonitor.getSummary();
    if (summary.total > 0) {
      console.log('\n📊 Performance Summary:');
      // Log summary...
    }
  });

  test.beforeEach(async ({ page }) => {
    // Common setup for each test
    await setupTestPage(page, '/');
  });

  test('should do something specific @tag', async ({ page }) => {
    // Arrange
    performanceMonitor.startTest('should do something specific');
    
    try {
      // Act
      await page.click('button');
      
      // Assert
      await expect(page.locator('.result')).toBeVisible();
    } finally {
      const metric = performanceMonitor.endTest();
      if (metric && metric.duration > 5000) {
        console.warn(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
      }
    }
  });
});
```

### Test Structure Principles

1. **Arrange-Act-Assert (AAA) Pattern**
   - Arrange: Set up test data and state
   - Act: Perform the action being tested
   - Assert: Verify the expected outcome

2. **One Assertion Per Test** (when possible)
   - Focus each test on a single behavior
   - Makes failures easier to diagnose

3. **Clear Test Names**
   - Use descriptive names that explain what is being tested
   - Include expected outcome in the name

## 📝 Naming Conventions

### Test Names

**Good:**
```typescript
test('should display error message when form is invalid @ui', async ({ page }) => {
  // ...
});

test('should redirect to dashboard after successful login @auth', async ({ page }) => {
  // ...
});
```

**Bad:**
```typescript
test('test1', async ({ page }) => {
  // ...
});

test('form test', async ({ page }) => {
  // ...
});
```

### File Names

- Use descriptive names: `dashboard.spec.ts`, `api-routes.spec.ts`
- Group related tests in the same file
- Use kebab-case for file names

### Variable Names

- Use descriptive names: `submitButton`, `errorMessage`, `dashboardGrid`
- Avoid abbreviations: `btn`, `msg`, `grid`

## 🗂️ Test Organization

### Group Related Tests

```typescript
test.describe('Dashboard', () => {
  test.describe('Navigation', () => {
    test('should navigate to settings', async ({ page }) => {
      // ...
    });
  });

  test.describe('Data Display', () => {
    test('should display user data', async ({ page }) => {
      // ...
    });
  });
});
```

### Use Test Tags

Tag tests for selective execution:

```typescript
test('should handle API request @api @slow', async ({ page }) => {
  // ...
});

test('should validate form input @ui', async ({ page }) => {
  // ...
});
```

**Available Tags:**
- `@api` - API endpoint tests
- `@slow` - Slow tests (blockchain, external calls)
- `@ui` - UI component tests
- `@performance` - Performance tests
- `@security` - Security tests
- `@accessibility` - Accessibility tests
- `@network` - Network tests
- `@error` - Error handling tests
- `@edge-case` - Edge case tests

## ⏳ Waiting Strategies

### ✅ DO: Use Condition-Based Waits

```typescript
import { waitForPageReady, waitForElementStable } from './test-helpers';

// Wait for page to be ready
await waitForPageReady(page, {
  waitForNetwork: true,
  waitForReact: true,
  keySelectors: ['nav', 'main'],
});

// Wait for element to stabilize (animations)
await waitForElementStable(element, { stabilityDuration: 500 });
```

### ❌ DON'T: Use Arbitrary Timeouts

```typescript
// ❌ Bad
await page.waitForTimeout(2000);

// ✅ Good
await waitForPageReady(page);
```

### Waiting Utilities

- `waitForPageReady()` - Wait for page to be fully ready
- `waitForElementStable()` - Wait for animations to settle
- `waitForNetworkIdle()` - Wait for network requests to complete
- `waitForReactReady()` - Wait for React hydration
- `waitForElementWithRetry()` - Retry logic for element waiting

## 🛡️ Error Handling

### Graceful Error Handling

```typescript
test('should handle API errors gracefully @api @error', async ({ page }) => {
  try {
    const response = await makeApiRequest(page, 'POST', '/api/endpoint', {
      data: { /* ... */ },
      timeout: 30000,
    });
    
    expect(response.status).toBe(200);
  } catch (error: any) {
    // Handle connection errors gracefully
    const errorMessage = error?.message || '';
    const isConnectionError = 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ECONNRESET');
    
    if (isConnectionError) {
      test.skip(true, 'Server is not available');
      return;
    }
    throw error;
  }
});
```

### Server Availability Checks

```typescript
let serverAvailable = false;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  serverAvailable = await checkServerAvailability(page);
  await context.close();
});

test('should test API endpoint @api', async ({ page }) => {
  test.skip(!serverAvailable, 'Dev server is not available');
  // ... test code
});
```

## ⚡ Performance

### Performance Monitoring

```typescript
test('should load page quickly @performance', async ({ page }) => {
  performanceMonitor.startTest('should load page quickly');
  
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
```

### Performance Thresholds

- **Fast:** < 1s
- **Normal:** < 5s
- **Slow:** < 15s
- **Very Slow:** < 60s (blockchain calls)

### Optimize Slow Tests

1. Use condition-based waits instead of timeouts
2. Minimize unnecessary navigation
3. Use test fixtures for shared setup
4. Group related assertions

## ♿ Accessibility

### Test Accessibility

```typescript
test('should meet accessibility requirements @accessibility', async ({ page }) => {
  await setupTestPage(page, '/');
  
  // Check for accessible names
  const buttons = page.locator('button');
  const count = await buttons.count();
  
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const ariaLabel = await button.getAttribute('aria-label');
    const text = await button.textContent();
    
    expect(ariaLabel || text).toBeTruthy();
  }
});
```

### Accessibility Best Practices

1. Test keyboard navigation
2. Verify ARIA attributes
3. Check for accessible names
4. Test focus management

## 🔧 Maintainability

### Use Test Helpers

```typescript
// ✅ Good: Use helper functions
import { setupTestPage, waitForPageReady } from './test-helpers';

test('should display content', async ({ page }) => {
  await setupTestPage(page, '/');
  await waitForPageReady(page);
  // ...
});
```

### Avoid Code Duplication

```typescript
// ✅ Good: Extract common logic
async function fillForm(page: Page, data: FormData) {
  await page.fill('[name="field1"]', data.field1);
  await page.fill('[name="field2"]', data.field2);
  await page.click('button[type="submit"]');
}

test('should submit form', async ({ page }) => {
  await fillForm(page, { field1: 'value1', field2: 'value2' });
  // ...
});
```

### Use Test Fixtures

```typescript
// ✅ Good: Use fixtures for shared setup
test('should display dashboard', async ({ authenticatedPage }) => {
  // authenticatedPage is already set up
  await expect(authenticatedPage.locator('.dashboard')).toBeVisible();
});
```

### Keep Tests Independent

- Each test should be able to run independently
- Avoid shared state between tests
- Use unique test data per test

## 📊 Test Data

### Use Test Data Factories

```typescript
// ✅ Good: Use factories
import { createTestUser, createTestApp } from './test-data';

test('should create app', async ({ page }) => {
  const user = createTestUser();
  const app = createTestApp();
  // ...
});
```

### Avoid Hard-Coded Data

```typescript
// ❌ Bad: Hard-coded data
test('should create user', async ({ page }) => {
  await page.fill('[name="email"]', 'test@example.com');
  // ...
});

// ✅ Good: Use variables
test('should create user', async ({ page }) => {
  const testEmail = `test-${Date.now()}@example.com`;
  await page.fill('[name="email"]', testEmail);
  // ...
});
```

## 🎯 Selectors

### Prefer Stable Selectors

```typescript
// ✅ Good: Use stable selectors
await page.locator('[data-testid="submit-button"]').click();
await page.locator('button[aria-label="Submit form"]').click();

// ❌ Bad: Use fragile selectors
await page.locator('div > div > button').click();
await page.locator('.btn-primary:nth-child(3)').click();
```

### Selector Priority

1. `data-testid` - Most stable
2. `aria-label` - Accessible and stable
3. Role-based selectors - `[role="button"]`
4. Text content - `text="Submit"`
5. CSS classes - Less stable, use as last resort

## 📚 Documentation

### Add Comments

```typescript
test('should handle complex workflow @ui @slow', async ({ page }) => {
  // This test verifies the complete registration flow
  // including wallet connection, form submission, and verification
  
  performanceMonitor.startTest('should handle complex workflow');
  
  try {
    // Step 1: Connect wallet
    await connectWallet(page);
    
    // Step 2: Fill registration form
    await fillRegistrationForm(page, testData);
    
    // Step 3: Verify submission
    await expect(page.locator('.success-message')).toBeVisible();
  } finally {
    performanceMonitor.endTest();
  }
});
```

## ✅ Checklist

Before submitting a test, ensure:

- [ ] Test name clearly describes what is being tested
- [ ] Test is tagged appropriately
- [ ] Uses condition-based waits (no `waitForTimeout`)
- [ ] Handles errors gracefully
- [ ] Includes performance monitoring (for slow tests)
- [ ] Uses stable selectors
- [ ] Test is independent (can run alone)
- [ ] Uses test helpers and utilities
- [ ] Includes comments for complex logic
- [ ] Follows AAA pattern (Arrange-Act-Assert)

## 🔗 Related Resources

- **[TEST_PATTERNS.md](./TEST_PATTERNS.md)** - Common test patterns
- **[TEST_ANTI_PATTERNS.md](./TEST_ANTI_PATTERNS.md)** - What to avoid
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Migration guide
- **[test-helpers.ts](./test-helpers.ts)** - Test utilities
- **[wait-utilities.ts](./wait-utilities.ts)** - Waiting utilities

---

**Status:** ✅ Complete - Best practices documented

