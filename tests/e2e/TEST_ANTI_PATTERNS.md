# Test Anti-Patterns - What to Avoid

## Overview

This document outlines common anti-patterns in E2E testing and how to avoid them.

## 📋 Table of Contents

1. [Waiting Anti-Patterns](#waiting-anti-patterns)
2. [Selector Anti-Patterns](#selector-anti-patterns)
3. [Test Structure Anti-Patterns](#test-structure-anti-patterns)
4. [Error Handling Anti-Patterns](#error-handling-anti-patterns)
5. [Performance Anti-Patterns](#performance-anti-patterns)
6. [Maintainability Anti-Patterns](#maintainability-anti-patterns)

## ⏳ Waiting Anti-Patterns

### ❌ Anti-Pattern: Arbitrary Timeouts

```typescript
// ❌ BAD: Arbitrary timeout
test('should display content', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000); // Arbitrary delay
  await expect(page.locator('.content')).toBeVisible();
});
```

**Problems:**
- May wait too long (slow tests)
- May wait too short (flaky tests)
- No guarantee element is ready

**✅ Solution:**
```typescript
// ✅ GOOD: Condition-based wait
import { waitForPageReady } from './test-helpers';

test('should display content', async ({ page }) => {
  await page.goto('/');
  await waitForPageReady(page, {
    waitForNetwork: true,
    waitForReact: true,
  });
  await expect(page.locator('.content')).toBeVisible();
});
```

### ❌ Anti-Pattern: Multiple Timeouts

```typescript
// ❌ BAD: Multiple arbitrary timeouts
test('should complete workflow', async ({ page }) => {
  await page.click('button');
  await page.waitForTimeout(1000);
  await page.fill('input', 'value');
  await page.waitForTimeout(500);
  await page.click('submit');
  await page.waitForTimeout(2000);
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Wait for specific conditions
import { waitForElementStable, waitForPageReady } from './test-helpers';

test('should complete workflow', async ({ page }) => {
  await page.click('button');
  await waitForElementStable(page.locator('input'), { stabilityDuration: 300 });
  await page.fill('input', 'value');
  await waitForElementStable(page.locator('form'), { stabilityDuration: 300 });
  await page.click('submit');
  await waitForPageReady(page, { waitForNetwork: true });
});
```

## 🎯 Selector Anti-Patterns

### ❌ Anti-Pattern: Fragile Selectors

```typescript
// ❌ BAD: Fragile CSS selectors
test('should click button', async ({ page }) => {
  await page.click('div > div > div > button');
  await page.click('.container .row .col .btn-primary:nth-child(3)');
});
```

**Problems:**
- Breaks when HTML structure changes
- Hard to understand intent
- Difficult to maintain

**✅ Solution:**
```typescript
// ✅ GOOD: Stable selectors
test('should click button', async ({ page }) => {
  await page.click('[data-testid="submit-button"]');
  await page.click('button[aria-label="Submit form"]');
  await page.click('button:has-text("Submit")');
});
```

### ❌ Anti-Pattern: Overly Specific Selectors

```typescript
// ❌ BAD: Overly specific
await page.locator('body > div > main > section > div > div > button').click();
```

**✅ Solution:**
```typescript
// ✅ GOOD: Simple and stable
await page.locator('[data-testid="submit-button"]').click();
```

## 🏗️ Test Structure Anti-Patterns

### ❌ Anti-Pattern: Vague Test Names

```typescript
// ❌ BAD: Vague names
test('test1', async ({ page }) => {
  // ...
});

test('form test', async ({ page }) => {
  // ...
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Descriptive names
test('should display error message when form is invalid @ui', async ({ page }) => {
  // ...
});

test('should submit form successfully after validation @ui', async ({ page }) => {
  // ...
});
```

### ❌ Anti-Pattern: Multiple Assertions in One Test

```typescript
// ❌ BAD: Testing multiple things
test('should handle form', async ({ page }) => {
  await page.fill('input', 'value');
  await expect(page.locator('.field')).toBeVisible();
  await expect(page.locator('.button')).toBeEnabled();
  await expect(page.locator('.error')).not.toBeVisible();
  await page.click('submit');
  await expect(page.locator('.success')).toBeVisible();
  await expect(page.locator('.result')).toContainText('Success');
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Focused tests
test('should display form fields @ui', async ({ page }) => {
  await page.goto('/form');
  await expect(page.locator('.field')).toBeVisible();
  await expect(page.locator('.button')).toBeEnabled();
});

test('should show validation errors for invalid input @ui @error', async ({ page }) => {
  await page.goto('/form');
  await page.fill('input', 'invalid');
  await expect(page.locator('.error')).toBeVisible();
});

test('should submit form successfully @ui', async ({ page }) => {
  await page.goto('/form');
  await page.fill('input', 'valid');
  await page.click('submit');
  await expect(page.locator('.success')).toBeVisible();
});
```

### ❌ Anti-Pattern: Shared State Between Tests

```typescript
// ❌ BAD: Shared state
let sharedData = {};

test('should create data', async ({ page }) => {
  sharedData = { id: 1, name: 'Test' };
  // ...
});

test('should use data', async ({ page }) => {
  // Uses sharedData - may fail if previous test fails
  await page.fill('input', sharedData.name);
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Independent tests
test('should create data', async ({ page }) => {
  const data = { id: 1, name: 'Test' };
  // ... use data
});

test('should use data', async ({ page }) => {
  const data = { id: 2, name: 'Test2' };
  await page.fill('input', data.name);
});
```

## ⚠️ Error Handling Anti-Patterns

### ❌ Anti-Pattern: Ignoring Errors

```typescript
// ❌ BAD: Ignoring errors
test('should handle API request', async ({ page }) => {
  try {
    await page.request.post('/api/endpoint', { data: {} });
  } catch (error) {
    // Ignore error - test may pass incorrectly
  }
  await expect(page.locator('.result')).toBeVisible();
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Proper error handling
test('should handle API request @api', async ({ page }) => {
  try {
    const response = await makeApiRequest(page, 'POST', '/api/endpoint', {
      data: {},
      timeout: 30000,
    });
    expect(response.status).toBe(200);
  } catch (error: any) {
    const errorMessage = error?.message || '';
    if (errorMessage.includes('ECONNREFUSED')) {
      test.skip(true, 'Server is not available');
      return;
    }
    throw error; // Re-throw unexpected errors
  }
});
```

### ❌ Anti-Pattern: Catching All Errors

```typescript
// ❌ BAD: Catching all errors
test('should do something', async ({ page }) => {
  try {
    // All test code
    await page.goto('/');
    await page.click('button');
    await expect(page.locator('.result')).toBeVisible();
  } catch (error) {
    // Catches everything - hides real failures
    console.log('Error:', error);
  }
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Specific error handling
test('should do something', async ({ page }) => {
  await page.goto('/');
  await page.click('button');
  await expect(page.locator('.result')).toBeVisible();
  // Let test framework handle failures
});
```

## ⚡ Performance Anti-Patterns

### ❌ Anti-Pattern: No Performance Monitoring

```typescript
// ❌ BAD: No performance tracking
test('should load page', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(5000); // Slow but not tracked
  await expect(page.locator('.content')).toBeVisible();
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Performance monitoring
import { performanceMonitor } from './test-helpers';

test('should load page @performance', async ({ page }) => {
  performanceMonitor.startTest('should load page');
  try {
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page.locator('.content')).toBeVisible();
  } finally {
    const metric = performanceMonitor.endTest();
    if (metric && metric.duration > 5000) {
      console.warn(`⚠️  Slow test: ${metric.testName} took ${metric.duration}ms`);
    }
  }
});
```

### ❌ Anti-Pattern: Unnecessary Navigation

```typescript
// ❌ BAD: Multiple navigations
test('should test multiple pages', async ({ page }) => {
  await page.goto('/');
  await page.goto('/page1');
  await page.goto('/page2');
  await page.goto('/page3');
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Group related tests
test.describe('Page Tests', () => {
  test('should load page1', async ({ page }) => {
    await page.goto('/page1');
    // ...
  });

  test('should load page2', async ({ page }) => {
    await page.goto('/page2');
    // ...
  });
});
```

## 🔧 Maintainability Anti-Patterns

### ❌ Anti-Pattern: Code Duplication

```typescript
// ❌ BAD: Duplicated code
test('should test form 1', async ({ page }) => {
  await page.goto('/form1');
  await page.fill('[name="field1"]', 'value1');
  await page.fill('[name="field2"]', 'value2');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  await expect(page.locator('.success')).toBeVisible();
});

test('should test form 2', async ({ page }) => {
  await page.goto('/form2');
  await page.fill('[name="field1"]', 'value1');
  await page.fill('[name="field2"]', 'value2');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  await expect(page.locator('.success')).toBeVisible();
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Extract common logic
async function fillAndSubmitForm(page: Page, formUrl: string, data: FormData) {
  await page.goto(formUrl);
  await page.fill('[name="field1"]', data.field1);
  await page.fill('[name="field2"]', data.field2);
  await page.click('button[type="submit"]');
  await waitForPageReady(page);
}

test('should test form 1', async ({ page }) => {
  await fillAndSubmitForm(page, '/form1', { field1: 'value1', field2: 'value2' });
  await expect(page.locator('.success')).toBeVisible();
});

test('should test form 2', async ({ page }) => {
  await fillAndSubmitForm(page, '/form2', { field1: 'value1', field2: 'value2' });
  await expect(page.locator('.success')).toBeVisible();
});
```

### ❌ Anti-Pattern: Hard-Coded Values

```typescript
// ❌ BAD: Hard-coded values
test('should create user', async ({ page }) => {
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="name"]', 'Test User');
  // ...
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Use variables or factories
import { createTestUser } from './test-data';

test('should create user', async ({ page }) => {
  const user = createTestUser();
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="name"]', user.name);
  // ...
});
```

### ❌ Anti-Pattern: Missing Comments

```typescript
// ❌ BAD: No comments for complex logic
test('should handle complex workflow', async ({ page }) => {
  await page.click('button1');
  await page.waitForTimeout(1000);
  await page.fill('input1', 'value1');
  await page.click('button2');
  await page.waitForTimeout(2000);
  await page.fill('input2', 'value2');
  // What is this test doing? Why these steps?
});
```

**✅ Solution:**
```typescript
// ✅ GOOD: Comments explain intent
test('should handle complex workflow @ui @slow', async ({ page }) => {
  // Step 1: Open wizard
  await page.click('button[data-testid="open-wizard"]');
  await waitForElementStable(page.locator('[role="dialog"]'), { stabilityDuration: 500 });
  
  // Step 2: Fill first step
  await page.fill('[name="step1"]', 'value1');
  await page.click('button:has-text("Next")');
  await waitForElementStable(page.locator('[role="dialog"]'), { stabilityDuration: 500 });
  
  // Step 3: Fill second step and submit
  await page.fill('[name="step2"]', 'value2');
  await page.click('button:has-text("Submit")');
  await waitForPageReady(page, { waitForNetwork: true });
});
```

## 📊 Summary

### Common Anti-Patterns to Avoid

1. ❌ **Arbitrary timeouts** → ✅ Use condition-based waits
2. ❌ **Fragile selectors** → ✅ Use stable selectors
3. ❌ **Vague test names** → ✅ Use descriptive names
4. ❌ **Shared state** → ✅ Keep tests independent
5. ❌ **Ignoring errors** → ✅ Handle errors properly
6. ❌ **No performance monitoring** → ✅ Track performance
7. ❌ **Code duplication** → ✅ Extract common logic
8. ❌ **Hard-coded values** → ✅ Use variables/factories
9. ❌ **Missing comments** → ✅ Document complex logic

## 🔗 Related Resources

- **[TEST_BEST_PRACTICES.md](./TEST_BEST_PRACTICES.md)** - Best practices guide
- **[TEST_PATTERNS.md](./TEST_PATTERNS.md)** - Common patterns
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Migration guide

---

**Status:** ✅ Complete - Anti-patterns documented

