# E2E Test Suite - Quick Reference

## Quick Commands

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/landing-page-comprehensive.spec.ts

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run visual regression tests
npm run test:e2e:visual

# Update visual regression baselines
npm run test:e2e:visual:update

# Run with specific browser
npm run test:e2e:firefox
npm run test:e2e:chromium
npm run test:e2e:webkit

# Debug mode
npm run test:e2e:debug
```

## Test Structure

```
tests/e2e/
├── fixtures.ts                    # Custom test fixtures
├── test-helpers.ts                # Common utilities
├── auth-helpers.ts                # Authentication utilities
├── landing-page-comprehensive.spec.ts
├── dashboard.spec.ts
├── wizard-flow.spec.ts
├── accessibility.spec.ts
├── visual-regression.spec.ts
├── performance.spec.ts
├── network.spec.ts
└── authenticated-example-improved.spec.ts
```

## Common Patterns

### Using Fixtures

```typescript
import { test, expect } from './fixtures';

test('example with landing page fixture', async ({ landingPage }) => {
  // landingPage is already navigated to '/'
  await expect(landingPage.getByText(/OMATrust/i)).toBeVisible();
});

test('example with authenticated dashboard', async ({ authenticatedDashboard }) => {
  // authenticatedDashboard is already authenticated and on '/dashboard'
  await expect(authenticatedDashboard.getByText(/My Registered Applications/i)).toBeVisible();
});
```

### Manual Page Setup

```typescript
import { test, expect } from '@playwright/test';
import { setupTestPage } from './test-helpers';

test('example with manual setup', async ({ page }) => {
  await setupTestPage(page, '/dashboard', {
    waitForReact: true,
    removeOverlays: true,
    navigationTimeout: 60000,
    retries: 3,
  });
  
  // Your test code here
});
```

### Authentication

```typescript
import { connectWalletWithEmail, verifyAuthenticatedState } from './auth-helpers';

test('connect wallet', async ({ page }) => {
  await page.goto('/');
  const connected = await connectWalletWithEmail(page, 'test@example.com');
  expect(connected).toBe(true);
  await verifyAuthenticatedState(page);
});
```

### Form Filling

```typescript
import { fillFormField, fillFormFields } from './test-helpers';

// Single field
await fillFormField(page, { label: 'App Name' }, 'My App');

// Multiple fields
await fillFormFields(page, [
  { selector: { label: 'App Name' }, value: 'My App' },
  { selector: { label: 'Version' }, value: '1.0.0' },
]);
```

### Waiting for Elements

```typescript
import { waitForElementVisible, waitForElements } from './test-helpers';

// Wait for any of multiple selectors
const element = await waitForElementVisible(page, [
  'button:has-text("Submit")',
  '[data-testid="submit-button"]',
]);

// Wait for multiple elements
await waitForElements(page, [
  'h1',
  'nav',
  'main',
]);
```

### Performance Testing

```typescript
import { measurePageLoadTime, PerformanceMonitor } from './test-helpers';

// Simple load time
const loadTime = await measurePageLoadTime(page, '/', ['h1', 'nav']);

// Advanced monitoring
const monitor = new PerformanceMonitor(page);
await monitor.start();
await page.goto('/');
const metrics = await monitor.stop();
console.log('Load time:', metrics.loadTime);
```

### Visual Regression

```typescript
test('visual regression test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing-page.png', {
    animations: 'disabled',
  });
});
```

### Network Testing

```typescript
import { mockApiResponse, getNetworkRequests } from './test-helpers';

// Mock API response
await mockApiResponse(page, '**/api/data**', {
  status: 200,
  body: { data: 'test' },
});

// Get network requests
const requests = await getNetworkRequests(page);
console.log('API calls:', requests);
```

## Common Issues & Solutions

### Test Timeout

**Problem:** Test times out during navigation

**Solution:**
```typescript
// Increase timeout for specific test
test.setTimeout(120000); // 2 minutes

// Or use setupTestPage with retry logic
await setupTestPage(page, '/', {
  navigationTimeout: 60000,
  retries: 3,
});
```

### Element Not Found

**Problem:** Element not visible when test runs

**Solution:**
```typescript
// Wait for element with multiple strategies
await waitForElementVisible(page, [
  'button:has-text("Submit")',
  '[data-testid="submit"]',
  'button[type="submit"]',
]);

// Or wait for React content
await waitForReactContent(page, 10000);
```

### Authentication Not Working

**Problem:** Authenticated tests are skipped

**Solution:**
- See `AUTHENTICATION_USAGE.md` for options
- Use `connectWalletWithEmail()` for real wallet connection
- Or configure test mode in app

### Flaky Tests

**Problem:** Tests pass sometimes, fail other times

**Solution:**
```typescript
// Use retry logic
await setupTestPage(page, '/', { retries: 3 });

// Wait for specific content instead of networkidle
await page.goto('/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('h1', { state: 'visible' });

// Remove error overlays
await removeErrorOverlays(page);
```

## Best Practices

1. **Use fixtures** for common setup
2. **Wait for specific content** instead of generic timeouts
3. **Use retry logic** for navigation
4. **Remove error overlays** before testing
5. **Use data-testid** for stable selectors
6. **Test user flows**, not implementation details
7. **Keep tests independent** - don't rely on test order
8. **Use descriptive test names** that explain what's being tested

## Debugging

### View Test Report

```bash
npx playwright show-report
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### Screenshots & Videos

- Screenshots: Saved on failure in `test-results/`
- Videos: Saved on failure in `test-results/`
- Traces: Available in HTML report

### Console Logs

```typescript
// Listen to console
page.on('console', msg => console.log('Browser:', msg.text()));

// Listen to errors
page.on('pageerror', error => console.error('Page error:', error));
```

## Environment Variables

```bash
# Skip web server (if running manually)
SKIP_WEBSERVER=true npm run test:e2e

# Test workers
TEST_WORKERS=1 npm run test:e2e

# Test wallet email (for authenticated tests)
TEST_WALLET_EMAIL=test@example.com npm run test:e2e
```

## CI/CD

Tests run automatically in GitHub Actions on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual workflow dispatch

See `.github/workflows/e2e-tests.yml` for configuration.

