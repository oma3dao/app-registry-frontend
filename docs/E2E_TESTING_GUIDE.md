# E2E Testing Guide: Using Cursor Browser Tools + Playwright

## Overview

This guide explains how to use Cursor's browser capabilities to explore your app and generate E2E tests, then maintain them with Playwright.

## Quick Start

### 1. Install Playwright

```bash
npm install -D @playwright/test
npx playwright install firefox
```

**Note:** Firefox is configured as the default browser. To use other browsers, install them:
- `npx playwright install chromium` - For Chrome/Chromium
- `npx playwright install webkit` - For Safari/WebKit

### 2. Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-client-id-here
```

**Note:** For testing, you can use `test-client-id` as a placeholder. See `.env.local.example` for reference.

### 3. Run E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui

# Run in visible browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## Using Cursor's Browser Tools to Generate Tests

### Step 1: Explore Your App

Ask Cursor to navigate and explore:

```
Navigate to http://localhost:3000 and take a snapshot of the landing page.
What are the main interactive elements? What can users do?
```

### Step 2: Test a Flow Manually

Have Cursor walk through a user flow:

```
Navigate to http://localhost:3000, click the register button,
and walk through the wizard flow step by step. Tell me what happens at each step.
```

### Step 3: Generate Test Code

Ask Cursor to create Playwright tests:

```
Based on the wizard flow you just explored, generate a Playwright test file
at tests/e2e/wizard-flow.spec.ts that:
1. Starts the wizard
2. Fills out each step
3. Submits the form
4. Verifies success
```

### Step 4: Refine and Run

Review the generated test, refine it, then run:

```bash
npm run test:e2e:ui
```

## Test Structure

```
tests/
  ├── e2e/                    # E2E tests (Playwright)
  │   ├── landing-page.spec.ts
  │   ├── dashboard.spec.ts
  │   └── wizard-flow.spec.ts
  └── [your existing unit tests]
```

## Example: Complete Workflow

### 1. Exploration Phase

**Prompt to Cursor:**
```
Use the browser to navigate to http://localhost:3000 and explore:
- What's on the landing page?
- What buttons/links are available?
- What happens when you click "Register"?
```

**Cursor will:**
- Navigate to the page
- Take snapshots
- Click elements
- Report what it finds

### 2. Test Generation Phase

**Prompt to Cursor:**
```
Based on your exploration, create a comprehensive Playwright test file
that tests:
1. Landing page loads correctly
2. Navigation works
3. Register button opens wizard
4. Wizard can be completed
```

**Cursor will:**
- Generate `tests/e2e/landing-page.spec.ts`
- Include proper selectors
- Add assertions
- Structure tests logically

### 3. Execution Phase

```bash
# Run the generated tests
npm run test:e2e

# Or use UI mode to see what's happening
npm run test:e2e:ui
```

### 4. Maintenance Phase

- Tests run automatically in CI/CD
- Update tests as UI changes
- Use Cursor again to explore new features and generate tests

## Best Practices

### 1. Use Cursor for Exploration
- ✅ Understanding new features
- ✅ Generating initial test code
- ✅ Debugging issues
- ✅ Exploring edge cases

### 2. Use Playwright for Automation
- ✅ Running tests in CI/CD
- ✅ Maintaining test suite
- ✅ Debugging test failures
- ✅ Performance testing

### 3. Test Strategy

**Unit Tests (Vitest):**
- Fast, isolated component tests
- Test individual functions/components
- Run frequently during development

**E2E Tests (Playwright):**
- Critical user flows
- Full integration scenarios
- Run before releases

### 4. Selector Best Practices

Prefer these selector strategies (in order):
1. **Role-based**: `getByRole('button', { name: 'Submit' })`
2. **Text-based**: `getByText('Welcome')`
3. **Test IDs**: `getByTestId('nft-grid')`
4. **CSS selectors**: `locator('.my-class')` (last resort)

## Common Patterns

### Waiting for Elements

```typescript
// Wait for element to be visible
await expect(page.getByText('Loading...')).toBeVisible();

// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForSelector('[data-testid="content"]');
```

### Handling Authentication

```typescript
// Option 1: Use storageState (recommended)
test.use({ storageState: 'playwright/.auth/user.json' });

// Option 2: Login programmatically
test('authenticated test', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  // Continue with authenticated flow
});
```

### Taking Screenshots

```typescript
// Screenshot on failure (automatic with config)
// Manual screenshot
await page.screenshot({ path: 'screenshot.png' });

// Full page screenshot
await page.screenshot({ path: 'full-page.png', fullPage: true });
```

## Debugging Tests

### 1. Use Playwright UI Mode

```bash
npm run test:e2e:ui
```

This opens an interactive UI where you can:
- See test execution step-by-step
- Inspect the DOM at each step
- Debug failures visually

### 2. Use Debug Mode

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through tests
- Pause execution
- Inspect page state

### 3. Use Cursor to Debug

```
The test at tests/e2e/wizard-flow.spec.ts is failing.
Navigate to http://localhost:3000 and reproduce the issue.
What's going wrong?
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

## Troubleshooting

### Tests are flaky

- Add proper waits
- Use `waitForLoadState('networkidle')`
- Increase timeouts if needed
- Check for race conditions

### Can't find elements

- Use Cursor to explore and find correct selectors
- Check if elements are in iframes
- Verify elements are actually rendered
- Use `page.pause()` to debug

### Tests are slow

- Run tests in parallel (already configured)
- Use `test.describe.parallel()` for independent tests
- Avoid unnecessary waits
- Consider test sharding for large suites

## Next Steps

1. **Explore your app** with Cursor's browser tools
2. **Generate initial tests** for critical flows
3. **Run tests** and verify they work
4. **Add to CI/CD** pipeline
5. **Maintain tests** as your app evolves

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Cursor Browser Tools](https://cursor.sh/docs) (check Cursor docs for browser tool usage)

