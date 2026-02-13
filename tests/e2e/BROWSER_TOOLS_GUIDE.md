# Using Browser Tools for Test Authoring & Debugging

## Overview

This guide explains how to use Cursor's browser capabilities to improve Playwright test authoring and debugging. The browser tools are **not** a replacement for Playwright's test runner, but rather a powerful assistant for:

1. **Test Authoring** - Exploring the UI to write better tests
2. **Selector Verification** - Checking if selectors match actual elements
3. **Test Debugging** - Understanding why tests fail by inspecting the real UI
4. **UI Exploration** - Discovering new elements and interactions to test

## Workflow: Browser Tools + Playwright

### The Sweet Spot

```
1. Use Browser Tools → Explore UI & Identify Elements
2. Write Playwright Tests → Based on what you found
3. Run Tests in CI → Standard Playwright execution
```

**Key Principle:** Browser tools help you **write** better tests, but Playwright **runs** the tests.

## Use Cases

### 1. Test Authoring: Exploring UI Structure

**Scenario:** You need to write tests for a new component.

**Steps:**
1. Start dev server: `npm run dev`
2. Ask Cursor: "Navigate to http://localhost:3000 and show me the landing page structure"
3. Cursor uses browser tools to:
   - Navigate to the page
   - Take a snapshot of the DOM
   - Identify key elements and their properties
4. Use the information to write Playwright tests with accurate selectors

**Example:**
```typescript
// Before: Generic selector
const button = page.locator('button').first();

// After: Specific selector based on browser inspection
const connectButton = page.locator('#hero-connect button');
```

### 2. Selector Verification

**Scenario:** A test is failing because a selector doesn't match.

**Steps:**
1. Ask Cursor: "Open http://localhost:3000 and check if the selector `#hero-connect button` exists"
2. Cursor uses browser tools to:
   - Navigate to the page
   - Query the selector
   - Show you what elements match (or don't match)
3. Update your test with the correct selector

**Example:**
```typescript
// Test failing - selector might be wrong
test('should find connect button', async ({ page }) => {
  // ❌ This might not exist
  const button = page.locator('.connect-btn');
  
  // ✅ After browser verification, use correct selector
  const button = page.locator('#hero-connect button');
});
```

### 3. Test Debugging

**Scenario:** A test passes locally but fails in CI, or you can't reproduce the issue.

**Steps:**
1. Ask Cursor: "Open http://localhost:3000 and show me what the hero section looks like"
2. Cursor uses browser tools to:
   - Navigate to the page
   - Take a screenshot
   - Show the actual DOM structure
3. Compare with what your test expects
4. Identify the discrepancy and fix the test

**Example:**
```typescript
// Test expects text "Get Started"
test('should show Get Started button', async ({ page }) => {
  const button = page.getByRole('button', { name: /get started/i });
  // ❌ Fails - actual text might be different
  
  // ✅ After browser inspection, use correct text
  const button = page.locator('#hero-connect button');
  // Or verify actual text from browser
});
```

### 4. UI Exploration for New Tests

**Scenario:** You want to add tests for a feature you haven't tested yet.

**Steps:**
1. Ask Cursor: "Navigate to http://localhost:3000 and explore the landing page. What interactive elements can I test?"
2. Cursor uses browser tools to:
   - Navigate and explore
   - Identify clickable elements, forms, modals, etc.
   - Show their properties and states
3. Write new tests based on discovered elements

**Example:**
```typescript
// New test based on browser exploration
test('should handle rotating service text', async ({ page }) => {
  // Discovered via browser: rotating text in hero section
  const rotatingText = page.locator('h1 span.animate-fade-in');
  await expect(rotatingText).toBeVisible();
  
  // Test that text changes over time
  const initialText = await rotatingText.textContent();
  await page.waitForTimeout(4000); // Wait for rotation
  const newText = await rotatingText.textContent();
  expect(newText).not.toBe(initialText);
});
```

## Browser Tool Commands

### Available Browser Tools

Cursor provides these browser capabilities:

1. **`browser_navigate`** - Navigate to a URL
2. **`browser_snapshot`** - Get accessibility snapshot of the page
3. **`browser_take_screenshot`** - Capture visual screenshot
4. **`browser_click`** - Click an element
5. **`browser_type`** - Type into input fields
6. **`browser_evaluate`** - Run JavaScript on the page
7. **`browser_wait_for`** - Wait for text/elements to appear

### Example: Using Browser Tools

```typescript
// Ask Cursor to do this:
"Navigate to http://localhost:3000, take a snapshot, and show me all buttons with their text content"

// Cursor will:
1. Navigate to the page
2. Take a snapshot
3. Identify all buttons
4. Show you their properties
5. You can then write better Playwright tests
```

## Best Practices

### ✅ DO

1. **Use browser tools for exploration** - Discover UI structure
2. **Verify selectors** - Check if selectors match before writing tests
3. **Debug failing tests** - Inspect the actual UI when tests fail
4. **Document findings** - Note what you discovered for future reference

### ❌ DON'T

1. **Don't use browser tools as test runner** - Use Playwright for execution
2. **Don't write tests that depend on browser tools** - Tests must run in CI
3. **Don't skip Playwright** - Browser tools complement, don't replace Playwright

## Example Workflow

### Complete Example: Adding a New Test

**Step 1: Explore with Browser Tools**
```
You: "Navigate to http://localhost:3000 and show me the 'Latest Registrations' section"

Cursor: [Uses browser tools]
- Navigates to page
- Finds the section with heading "Latest Registrations"
- Shows the structure: h1 with text "Latest Registrations", NFTGrid component
- Identifies that it only appears after 1 second delay
```

**Step 2: Write Playwright Test**
```typescript
test('should display latest registrations section', async ({ page }) => {
  await setupTestPage(page, '/', {
    navigationTimeout: 60000,
    retries: 3,
    waitForReact: true,
    removeOverlays: true,
  });

  // Wait for section to load (1 second delay + loading time)
  const sectionHeading = page.getByRole('heading', { 
    name: /latest registrations/i 
  });
  await expect(sectionHeading).toBeVisible({ timeout: 10000 });
  
  // Verify NFT grid is present
  const nftGrid = page.locator('[class*="grid"]').filter({ 
    hasText: /latest/i 
  });
  await expect(nftGrid).toBeVisible({ timeout: 15000 });
});
```

**Step 3: Run in CI**
```yaml
# .github/workflows/e2e-tests.yml
- name: Run E2E tests
  run: npm run test:e2e
```

## Integration with Current Test Suite

### Current Test Files That Could Benefit

1. **`landing-page.spec.ts`**
   - Verify hero section selectors
   - Check rotating text behavior
   - Verify connect button selector

2. **`component-interactions.spec.ts`**
   - Verify modal selectors
   - Check toast notification structure
   - Verify navigation component

3. **`visual-regression.spec.ts`**
   - Take baseline screenshots
   - Verify visual elements match expectations

### How to Request Browser Tool Help

**For Test Authoring:**
```
"Use the browser to explore http://localhost:3000 and help me write tests for the hero section"
```

**For Selector Verification:**
```
"Check if the selector '#hero-connect button' exists on the landing page"
```

**For Debugging:**
```
"A test is failing for the connect button. Can you open the page and see what's actually there?"
```

**For UI Exploration:**
```
"Navigate to http://localhost:3000 and show me all interactive elements I should test"
```

## Summary

- **Browser Tools = Test Authoring Assistant**
- **Playwright = Test Execution Engine**
- **CI/CD = Automated Test Runner**

Use browser tools to **write better tests**, then run those tests with Playwright in CI like normal. This gives you the best of both worlds: intelligent UI exploration and reliable automated testing.

---

**Last Updated:** 2024  
**Status:** ✅ Ready for Use

