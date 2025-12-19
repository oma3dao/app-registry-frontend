# Accessibility Testing Guide

## Overview

This guide provides comprehensive information about accessibility testing in the E2E test suite, including test coverage, best practices, and WCAG compliance.

## 📋 Table of Contents

1. [Test Coverage](#test-coverage)
2. [Accessibility Test Files](#accessibility-test-files)
3. [WCAG Compliance](#wcag-compliance)
4. [Test Categories](#test-categories)
5. [Running Accessibility Tests](#running-accessibility-tests)
6. [Best Practices](#best-practices)
7. [Common Issues](#common-issues)

## 📊 Test Coverage

### Current Coverage

- ✅ **Basic Accessibility** - Missing alt text, unlabeled inputs, buttons without names
- ✅ **Keyboard Navigation** - Tab order, keyboard activation, arrow keys
- ✅ **ARIA Attributes** - Proper use of ARIA roles, labels, and relationships
- ✅ **Focus Management** - Focus visibility, focus trapping, focus order

### Test Files

1. **`accessibility.spec.ts`** - Basic accessibility checks
   - Landing page accessibility
   - Dashboard accessibility
   - Navigation links accessible names
   - Buttons accessible names
   - Form inputs associated labels

2. **`keyboard-navigation.spec.ts`** - Keyboard navigation tests
   - Interactive elements keyboard accessible
   - Logical tab order
   - Escape key closes modals
   - Enter/Space key activation
   - Arrow key navigation
   - Focus visibility

3. **`aria-validation.spec.ts`** - ARIA attribute validation
   - Buttons ARIA attributes
   - Links ARIA attributes
   - Form inputs ARIA attributes
   - Modals ARIA attributes
   - Images alt text
   - Landmark identification
   - Error message association
   - Valid ARIA values

4. **`focus-management.spec.ts`** - Focus management tests
   - Focus moves to modal
   - Focus returns to trigger
   - Focus trapped in modal
   - Focus visibility
   - No skipped elements
   - Logical focus order

## 🎯 WCAG Compliance

### WCAG 2.1 Level AA Compliance

Our accessibility tests verify compliance with WCAG 2.1 Level AA standards:

#### Perceivable
- ✅ **1.1.1 Non-text Content** - Images have alt text
- ✅ **1.3.1 Info and Relationships** - Proper semantic HTML and ARIA
- ✅ **1.4.3 Contrast** - (Visual check, not automated)

#### Operable
- ✅ **2.1.1 Keyboard** - All functionality keyboard accessible
- ✅ **2.1.2 No Keyboard Trap** - Focus not trapped
- ✅ **2.4.3 Focus Order** - Logical tab order
- ✅ **2.4.7 Focus Visible** - Focus indicators visible

#### Understandable
- ✅ **3.3.1 Error Identification** - Error messages associated with fields
- ✅ **3.3.2 Labels or Instructions** - Form inputs have labels

#### Robust
- ✅ **4.1.2 Name, Role, Value** - Proper ARIA attributes
- ✅ **4.1.3 Status Messages** - Status messages announced

## 📁 Test Categories

### Basic Accessibility Tests

**File:** `accessibility.spec.ts`

Tests for common accessibility issues:
- Missing alt text on images
- Buttons without accessible names
- Form inputs without labels
- Navigation links without accessible names

### Keyboard Navigation Tests

**File:** `keyboard-navigation.spec.ts`

Tests for keyboard accessibility:
- All interactive elements keyboard accessible
- Logical tab order
- Escape key functionality
- Enter/Space key activation
- Arrow key navigation
- Focus visibility

### ARIA Validation Tests

**File:** `aria-validation.spec.ts`

Tests for proper ARIA usage:
- Buttons have proper ARIA attributes
- Links have accessible names
- Form inputs have labels or ARIA labels
- Modals have proper ARIA attributes
- Images have alt text
- Landmarks properly identified
- Error messages associated with fields
- Valid ARIA attribute values

### Focus Management Tests

**File:** `focus-management.spec.ts`

Tests for focus management:
- Focus moves to modal when opened
- Focus returns to trigger when modal closes
- Focus trapped in modal
- Focus indicators visible
- No skipped focusable elements
- Logical focus order

## 🚀 Running Accessibility Tests

### Run All Accessibility Tests

```bash
# Run all accessibility tests
npx playwright test --grep "@accessibility"

# Or use test runner
node tests/e2e/test-runner.js --tag @accessibility
```

### Run Specific Test Files

```bash
# Basic accessibility tests
npx playwright test tests/e2e/accessibility.spec.ts

# Keyboard navigation tests
npx playwright test tests/e2e/keyboard-navigation.spec.ts

# ARIA validation tests
npx playwright test tests/e2e/aria-validation.spec.ts

# Focus management tests
npx playwright test tests/e2e/focus-management.spec.ts
```

### Run with UI

```bash
# Run with Playwright UI
npx playwright test --grep "@accessibility" --ui
```

## ✅ Best Practices

### Writing Accessibility Tests

1. **Use Semantic Selectors**
   ```typescript
   // ✅ Good: Use role-based selectors
   await page.locator('[role="dialog"]').first();
   await page.locator('button[aria-label="Close"]');
   
   // ❌ Bad: Use fragile CSS selectors
   await page.locator('.modal .close-btn');
   ```

2. **Test Keyboard Navigation**
   ```typescript
   // ✅ Good: Test keyboard interaction
   await button.focus();
   await page.keyboard.press('Enter');
   
   // ❌ Bad: Only test mouse clicks
   await button.click();
   ```

3. **Verify ARIA Attributes**
   ```typescript
   // ✅ Good: Check ARIA attributes
   const ariaLabel = await element.getAttribute('aria-label');
   expect(ariaLabel).toBeTruthy();
   ```

4. **Test Focus Management**
   ```typescript
   // ✅ Good: Verify focus behavior
   await modal.open();
   const focused = await page.evaluate(() => document.activeElement);
   expect(modal.contains(focused)).toBeTruthy();
   ```

### Common Patterns

#### Testing Modal Accessibility

```typescript
test('modal should be accessible', async ({ page }) => {
  // Open modal
  await page.click('button[data-testid="open-modal"]');
  const modal = page.locator('[role="dialog"]').first();
  
  // Verify modal has accessible name
  const ariaLabel = await modal.getAttribute('aria-label');
  expect(ariaLabel).toBeTruthy();
  
  // Verify focus moved to modal
  const focused = await page.evaluate(() => document.activeElement);
  expect(modal.evaluate(el => el.contains(focused))).toBeTruthy();
  
  // Test Escape key
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
});
```

#### Testing Form Accessibility

```typescript
test('form inputs should be accessible', async ({ page }) => {
  const input = page.locator('input[name="email"]');
  
  // Verify input has label
  const id = await input.getAttribute('id');
  const label = page.locator(`label[for="${id}"]`);
  await expect(label).toBeVisible();
  
  // Verify keyboard navigation
  await input.focus();
  const isFocused = await input.evaluate(el => document.activeElement === el);
  expect(isFocused).toBeTruthy();
});
```

## ⚠️ Common Issues

### Missing Alt Text

**Issue:** Images without alt text
```typescript
// ❌ Bad
<img src="icon.png" />

// ✅ Good
<img src="icon.png" alt="Close button" />
```

### Buttons Without Names

**Issue:** Icon-only buttons without accessible names
```typescript
// ❌ Bad
<button><Icon /></button>

// ✅ Good
<button aria-label="Close dialog"><Icon /></button>
```

### Form Inputs Without Labels

**Issue:** Form inputs without associated labels
```typescript
// ❌ Bad
<input type="text" name="email" />

// ✅ Good
<label for="email">Email</label>
<input type="text" id="email" name="email" />
```

### Focus Not Visible

**Issue:** Focus indicators not visible
```css
/* ❌ Bad */
button:focus {
  outline: none;
}

/* ✅ Good */
button:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

## 🔗 Related Resources

- **[TEST_BEST_PRACTICES.md](./TEST_BEST_PRACTICES.md)** - Test best practices
- **[TEST_PATTERNS.md](./TEST_PATTERNS.md)** - Common test patterns
- **[WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)** - WCAG documentation
- **[ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)** - ARIA best practices

## 📊 Test Statistics

- **Total Accessibility Tests:** ~20+ tests
- **Test Files:** 4 files
- **Coverage Areas:** 4 categories
- **WCAG Compliance:** Level AA

## ✅ Summary

The accessibility test suite provides comprehensive coverage of:
- ✅ Basic accessibility requirements
- ✅ Keyboard navigation
- ✅ ARIA attribute validation
- ✅ Focus management

All tests are tagged with `@accessibility` for easy execution and CI/CD integration.

---

**Status:** ✅ Complete - Accessibility testing guide ready

