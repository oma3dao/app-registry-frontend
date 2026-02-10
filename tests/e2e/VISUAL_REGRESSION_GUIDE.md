# Visual Regression Testing Guide

## Overview

Visual regression tests capture screenshots of your application and compare them against baseline images to detect unintended visual changes.

## How It Works

Playwright's built-in `toHaveScreenshot()` automatically:
1. Captures a screenshot of the page or element
2. Compares it with the baseline image (stored in `tests/e2e/screenshots/`)
3. Reports differences if any are found
4. Generates diff images showing what changed

## Running Visual Regression Tests

### Run All Visual Tests

```bash
npm run test:e2e -- tests/e2e/visual-regression.spec.ts
```

### Update Baselines (After Intentional UI Changes)

When you intentionally change the UI and want to update the baseline images:

```bash
npx playwright test --update-snapshots tests/e2e/visual-regression.spec.ts
```

Or update all snapshots:

```bash
npx playwright test --update-snapshots
```

### View Screenshot Differences

When a test fails, Playwright automatically:
- Saves the actual screenshot to `test-results/`
- Saves the diff image showing differences
- Opens them in the HTML report

View the report:
```bash
npx playwright show-report
```

## Configuration

### Screenshot Comparison Settings

Configured in `playwright.config.ts`:

```typescript
expect: {
  toHaveScreenshot: {
    threshold: 0.2,        // 0-1, pixel difference threshold
    maxDiffPixels: 100,    // Maximum pixels that can differ
    animations: 'disabled', // Disable animations for consistency
  },
}
```

### Adjusting Thresholds

- **Lower threshold (0.1)**: Stricter comparison, catches smaller changes
- **Higher threshold (0.3)**: More lenient, allows minor rendering differences
- **maxDiffPixels**: Total number of pixels that can differ before failure

## Best Practices

### 1. Stable Test Environment

- Use consistent viewport sizes
- Disable animations (`animations: 'disabled'`)
- Wait for network idle before screenshots
- Use fixed timestamps or mock data when possible

### 2. Focused Screenshots

- Test specific components/elements rather than full pages when possible
- Use `element.screenshot()` for component-level testing
- Full page screenshots are useful but can be more flaky

### 3. Viewport Testing

- Test multiple viewports (mobile, tablet, desktop)
- Different viewports may have different layouts
- Create separate baselines for each viewport

### 4. Handling Dynamic Content

For content that changes (dates, user data, etc.):

```typescript
// Option 1: Mock the data
await page.route('/api/data', route => route.fulfill({ ... }));

// Option 2: Hide dynamic elements
await page.evaluate(() => {
  document.querySelector('.timestamp')?.remove();
});

// Option 3: Use mask to ignore specific areas
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('.timestamp')],
});
```

### 5. Updating Baselines

- **Always review changes** before updating baselines
- **Commit baseline updates** with the code changes
- **Use version control** to track baseline history
- **Document** why baselines were updated

## Test Structure

Visual regression tests are in `tests/e2e/visual-regression.spec.ts`:

```typescript
test('page should match baseline', async ({ page }) => {
  await setupTestPage(page, '/');
  await prepareForScreenshot(page);
  await expect(page).toHaveScreenshot('page-name.png');
});
```

## Troubleshooting

### Test Fails But UI Looks Correct

1. **Check the diff image** - See what actually changed
2. **Review threshold settings** - May be too strict
3. **Check for timing issues** - Content may not be fully loaded
4. **Verify viewport size** - Different sizes can cause differences

### Screenshots Look Different Every Run

1. **Disable animations** - Use `animations: 'disabled'`
2. **Wait for network idle** - Ensure all assets loaded
3. **Check for dynamic content** - Mock or mask changing elements
4. **Verify viewport consistency** - Use fixed viewport sizes

### Baseline Images Missing

1. **Run with `--update-snapshots`** to create initial baselines
2. **Check `tests/e2e/screenshots/` directory exists**
3. **Verify file permissions** - Ensure write access

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run visual regression tests
  run: npm run test:e2e -- tests/e2e/visual-regression.spec.ts
  
- name: Upload screenshot artifacts
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: screenshot-diffs
    path: test-results/
```

### Handling Baseline Updates in CI

1. **Don't auto-update** baselines in CI
2. **Fail the build** if visual tests fail
3. **Review differences** manually
4. **Update baselines locally** and commit

## Advanced Usage

### Masking Dynamic Areas

```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [
    page.locator('.timestamp'),
    page.locator('.user-avatar'),
  ],
});
```

### Testing Specific Regions

```typescript
const hero = page.locator('#hero');
await expect(hero).toHaveScreenshot('hero-section.png');
```

### Multiple Viewports

```typescript
test('responsive design', async ({ page }) => {
  for (const viewport of [{ width: 375, height: 667 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await setupTestPage(page, '/');
    await expect(page).toHaveScreenshot(`page-${viewport.width}.png`);
  }
});
```

## File Structure

```
tests/e2e/
├── visual-regression.spec.ts    # Visual regression tests
├── screenshots/                  # Baseline screenshots (git tracked)
│   ├── landing-page.png
│   ├── dashboard.png
│   └── ...
└── test-results/                 # Actual screenshots and diffs (git ignored)
    └── ...
```

## Resources

- [Playwright Screenshot Documentation](https://playwright.dev/docs/test-screenshots)
- [Visual Comparison Guide](https://playwright.dev/docs/test-snapshots)
- [Best Practices](https://playwright.dev/docs/best-practices#visual-comparison)

