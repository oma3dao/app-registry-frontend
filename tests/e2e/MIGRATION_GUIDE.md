# Migration Guide: Replacing waitForTimeout

## Overview

This guide helps you migrate from `waitForTimeout` to the new advanced waiting utilities for more reliable and faster tests.

## Why Migrate?

**Problems with `waitForTimeout`:**
- ❌ Arbitrary delays that may be too short or too long
- ❌ Flaky tests due to timing issues
- ❌ Slower test execution
- ❌ Hard to debug timing-related failures

**Benefits of new utilities:**
- ✅ Condition-based waits (only wait as long as needed)
- ✅ More reliable tests
- ✅ Faster execution
- ✅ Better error messages

## Common Patterns

### Pattern 1: Waiting for Page Load

**Before:**
```typescript
await page.goto('/');
await page.waitForTimeout(2000);
```

**After:**
```typescript
import { waitForPageReady } from './test-helpers';

await page.goto('/');
await waitForPageReady(page, {
  waitForNetwork: true,
  waitForReact: true,
  keySelectors: ['main', 'nav'],
});
```

### Pattern 2: Waiting for Animations/Stability

**Before:**
```typescript
await element.click();
await page.waitForTimeout(1000);
```

**After:**
```typescript
import { waitForElementStable } from './test-helpers';

await element.click();
await waitForElementStable(element, { stabilityDuration: 500 });
```

### Pattern 3: Waiting for Modal/Dialog

**Before:**
```typescript
await button.click();
await page.waitForTimeout(1000);
const modal = page.locator('[role="dialog"]');
await expect(modal).toBeVisible();
```

**After:**
```typescript
import { waitForModal, waitForElementStable } from './test-helpers';

await button.click();
const modal = await waitForModal(page);
await waitForElementStable(modal, { stabilityDuration: 300 });
```

### Pattern 4: Waiting for Network Requests

**Before:**
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
```

**After:**
```typescript
import { waitForNetworkIdle, waitForPageReady } from './test-helpers';

await waitForPageReady(page, {
  waitForNetwork: true,
  waitForReact: true,
});
```

### Pattern 5: Waiting for Form Validation

**Before:**
```typescript
await field.fill('value');
await page.waitForTimeout(500);
await button.click();
await page.waitForTimeout(1000);
```

**After:**
```typescript
import { waitForElementStable } from './test-helpers';

await field.fill('value');
await waitForElementStable(field, { stabilityDuration: 300 });
await button.click();
const form = page.locator('form').first();
await waitForElementStable(form, { stabilityDuration: 500 });
```

### Pattern 6: Waiting for Text Content

**Before:**
```typescript
await page.waitForTimeout(1000);
const text = await element.textContent();
expect(text).toContain('expected');
```

**After:**
```typescript
import { waitForTextContent } from './test-helpers';

const text = await waitForTextContent(element, {
  text: 'expected',
  timeout: 5000,
});
expect(text).toContain('expected');
```

## Migration Checklist

- [ ] Identify all `waitForTimeout` calls in your test file
- [ ] Determine the purpose of each timeout:
  - [ ] Page load → Use `waitForPageReady`
  - [ ] Animation/Stability → Use `waitForElementStable`
  - [ ] Modal/Dialog → Use `waitForModal` + `waitForElementStable`
  - [ ] Network → Use `waitForNetworkIdle` or `waitForPageReady`
  - [ ] Form validation → Use `waitForElementStable`
  - [ ] Text content → Use `waitForTextContent`
- [ ] Replace `waitForTimeout` with appropriate utility
- [ ] Update imports
- [ ] Run tests to verify
- [ ] Remove unused imports

## Examples by Test Type

### Visual Regression Tests

**Before:**
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await expect(page).toHaveScreenshot('baseline.png');
```

**After:**
```typescript
import { waitForPageReady, waitForElementStable } from './test-helpers';

await waitForPageReady(page, {
  waitForNetwork: true,
  waitForReact: true,
});
const target = page.locator('main').first();
await waitForElementStable(target, { stabilityDuration: 500 });
await expect(page).toHaveScreenshot('baseline.png');
```

### API Integration Tests

**Before:**
```typescript
await page.goto('/');
await page.waitForTimeout(2000);
const content = await page.textContent('body');
```

**After:**
```typescript
import { waitForPageReady } from './test-helpers';

await page.goto('/');
await waitForPageReady(page, {
  waitForNetwork: true,
  waitForReact: true,
});
const content = await page.textContent('body');
```

### Wizard Flow Tests

**Before:**
```typescript
await button.click();
await page.waitForTimeout(1000);
const modal = page.locator('[role="dialog"]');
```

**After:**
```typescript
import { waitForModal, waitForElementStable } from './test-helpers';

await button.click();
const modal = await waitForModal(page);
await waitForElementStable(modal, { stabilityDuration: 500 });
```

## Performance Monitoring

Add performance monitoring to track test execution:

```typescript
import { performanceMonitor } from './test-helpers';

test('my test', async ({ page }) => {
  performanceMonitor.startTest('my test');
  
  // ... test code ...
  
  const metrics = performanceMonitor.endTest();
  if (metrics && metrics.duration > 10000) {
    console.warn(`Test took ${metrics.duration}ms - consider optimizing`);
  }
});
```

## Troubleshooting

### Test still flaky after migration?

1. **Increase stability duration:**
   ```typescript
   await waitForElementStable(element, { stabilityDuration: 1000 });
   ```

2. **Add more key selectors:**
   ```typescript
   await waitForPageReady(page, {
     keySelectors: ['main', 'nav', 'footer'],
   });
   ```

3. **Use retry logic:**
   ```typescript
   import { waitForElementWithRetry } from './test-helpers';
   const element = await waitForElementWithRetry(page, 'selector', {
     retries: 3,
   });
   ```

### Test too slow?

1. **Reduce stability duration:**
   ```typescript
   await waitForElementStable(element, { stabilityDuration: 200 });
   ```

2. **Skip network idle if not needed:**
   ```typescript
   await waitForPageReady(page, {
     waitForNetwork: false, // Skip if not needed
     waitForReact: true,
   });
   ```

## Resources

- **[IMPROVEMENTS_V2.md](./IMPROVEMENTS_V2.md)** - Detailed improvements documentation
- **[wait-utilities.ts](./wait-utilities.ts)** - Source code for all utilities
- **[test-helpers.ts](./test-helpers.ts)** - Re-exports and additional helpers

## Support

If you encounter issues during migration:
1. Check the utility documentation in `wait-utilities.ts`
2. Review examples in migrated test files
3. Check test logs for specific error messages

