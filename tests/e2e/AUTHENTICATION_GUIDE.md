# Authentication Testing Guide

This guide explains how to write E2E tests for authenticated user flows in the app-registry-frontend application.

## Overview

The application uses **Thirdweb** for wallet authentication, supporting:
- In-app wallets (social login: Email, Google, Apple, Facebook, Passkey)
- MetaMask browser extension
- Coinbase Wallet
- WalletConnect

## Testing Approaches

### 1. Mocked Authentication (Recommended for Most Tests)

**Use when:** You need fast, reliable tests that don't require actual wallet connections.

**Pros:**
- Fast execution
- No external dependencies
- Consistent results
- Works in CI/CD

**Cons:**
- Doesn't test actual wallet connection flow
- May miss integration issues

#### Using Authenticated Fixtures

```typescript
import { test } from './fixtures';

test('should display dashboard when authenticated', async ({ authenticatedDashboard }) => {
  // Page is already authenticated via fixture
  await expect(authenticatedDashboard.getByText(/My Registered Applications/i)).toBeVisible();
});
```

#### Using Authentication Helpers

```typescript
import { setupAuthenticatedPage } from './auth-helpers';

test('should access protected content', async ({ page }) => {
  await setupAuthenticatedPage(page, '/dashboard', {
    waitForReact: true,
    removeOverlays: true,
  });
  
  // Test authenticated functionality
});
```

### 2. Real Wallet Connection (For Integration Tests)

**Use when:** You need to test the actual wallet connection flow.

**Pros:**
- Tests real user flow
- Catches integration issues
- Validates wallet UI

**Cons:**
- Slower execution
- Requires browser extensions or manual interaction
- May be flaky

#### Example

```typescript
import { connectWallet } from './auth-helpers';

test('should connect wallet and access dashboard', async ({ page }) => {
  await page.goto('/');
  
  // Attempt to connect wallet
  const connected = await connectWallet(page, 'in-app');
  
  if (!connected) {
    test.skip(true, 'Wallet connection requires manual setup');
    return;
  }
  
  // Continue with test...
});
```

## Available Helpers

### `setupAuthenticatedPage(page, url, options)`

Sets up a page with mocked authentication state and navigates to the specified URL.

```typescript
await setupAuthenticatedPage(page, '/dashboard', {
  waitForReact: true,
  removeOverlays: true,
  timeout: 60000,
});
```

### `verifyAuthenticatedState(page)`

Checks if the page shows authenticated state indicators.

```typescript
const isAuth = await verifyAuthenticatedState(page);
expect(isAuth).toBeTruthy();
```

### `mockAuthenticatedState(page)`

Sets up localStorage with mocked authentication data.

```typescript
await mockAuthenticatedState(page);
```

### `connectWallet(page, method)`

Attempts to connect a wallet using the specified method.

```typescript
const connected = await connectWallet(page, 'in-app');
```

## Available Fixtures

### `authenticatedPage`

A page that's been set up with authentication state. Can be used for any authenticated route.

```typescript
test('example', async ({ authenticatedPage }) => {
  // Page is authenticated and ready
});
```

### `authenticatedDashboard`

Specifically for dashboard tests. Verifies authentication and dashboard content is visible.

```typescript
test('dashboard test', async ({ authenticatedDashboard }) => {
  // Dashboard is authenticated and loaded
});
```

## Test Examples

### Example 1: Testing Authenticated Dashboard

```typescript
import { test, expect } from './fixtures';

test('should display user apps when authenticated', async ({ authenticatedDashboard }) => {
  await expect(authenticatedDashboard.getByText(/My Registered Applications/i)).toBeVisible();
  await expect(authenticatedDashboard.getByRole('button', { name: /Register New App/i })).toBeVisible();
});
```

### Example 2: Testing Wizard Flow

```typescript
import { test, expect } from './fixtures';
import { waitForElementVisible } from './test-helpers';

test('should open wizard when authenticated', async ({ authenticatedDashboard }) => {
  const registerButton = await waitForElementVisible(
    authenticatedDashboard,
    ['button:has-text("Register New App")'],
    10000
  );
  
  await registerButton.click();
  
  const modal = authenticatedDashboard.locator('[role="dialog"]').first();
  await expect(modal).toBeVisible();
});
```

### Example 3: Testing with Manual Setup

```typescript
import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage, verifyAuthenticatedState } from './auth-helpers';

test('custom authenticated test', async ({ page }) => {
  await setupAuthenticatedPage(page, '/dashboard');
  
  const isAuth = await verifyAuthenticatedState(page);
  expect(isAuth).toBeTruthy();
  
  // Your test code...
});
```

## Enabling Previously Skipped Tests

Many tests were skipped because they required authentication. With the new infrastructure, you can enable them:

### Before:
```typescript
test.skip('should display dashboard when authenticated', async ({ page }) => {
  // Test code...
});
```

### After:
```typescript
test('should display dashboard when authenticated', async ({ authenticatedDashboard }) => {
  // Test code using authenticated fixture
});
```

## Troubleshooting

### Tests Still Skipping

If tests are still being skipped:

1. **Check authentication state:**
   ```typescript
   const isAuth = await verifyAuthenticatedState(page);
   console.log('Authenticated:', isAuth);
   ```

2. **Verify mock setup:**
   - Check browser console for localStorage
   - Verify `thirdweb:wallet` and `thirdweb:account` are set

3. **Check selectors:**
   - Ensure selectors match actual page content
   - Use `page.screenshot()` to debug

### Mock Authentication Not Working

If mocked authentication doesn't work:

1. **Check Thirdweb storage keys:**
   - The app might use different localStorage keys
   - Inspect actual localStorage in browser DevTools

2. **Update mock data:**
   - Modify `TEST_ACCOUNT_DATA` in `auth-helpers.ts`
   - Match the format your app expects

3. **Use real authentication:**
   - For integration tests, use `connectWallet()`
   - Or manually connect wallet before running tests

## Best Practices

1. **Use fixtures for common scenarios:**
   - `authenticatedDashboard` for dashboard tests
   - `authenticatedPage` for other authenticated routes

2. **Verify authentication state:**
   - Always check `verifyAuthenticatedState()` before assertions
   - Handle cases where authentication might fail

3. **Skip gracefully:**
   - Use `test.skip()` with clear messages
   - Document why tests are skipped

4. **Test both paths:**
   - Test authenticated flows
   - Test unauthenticated flows
   - Test authentication state transitions

5. **Use appropriate approach:**
   - Mocked auth for fast unit-style E2E tests
   - Real wallet connection for integration tests

## Next Steps

1. **Enable more skipped tests:**
   - Update wizard flow tests
   - Enable dashboard navigation tests
   - Add authenticated user action tests

2. **Expand coverage:**
   - Test wallet connection flow
   - Test wallet disconnection
   - Test switching between wallets

3. **Integration testing:**
   - Set up browser extension testing
   - Test MetaMask connection
   - Test social login flows

---

**See also:**
- `authenticated-example.spec.ts` - Complete examples
- `auth-helpers.ts` - Helper function reference
- `fixtures.ts` - Fixture definitions

