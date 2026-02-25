# Setting Up Visual Regression Baselines

## Overview

Visual regression tests require baseline screenshots to compare against. This guide explains how to create the initial baselines.

## Initial Setup

### Step 1: Ensure Dev Server is Running

```bash
npm run dev
```

Wait for the server to be ready (usually shows "Ready" message).

### Step 2: Create Initial Baselines

Run the visual regression tests with the `--update-snapshots` flag:

```bash
npm run test:e2e:visual:update
```

This will:
1. Run all visual regression tests
2. Capture screenshots
3. Save them as baselines in `tests/e2e/screenshots/`
4. Create the directory structure if needed

### Step 3: Review Baselines

After creating baselines, review them to ensure they look correct:

```bash
# View the screenshots directory
ls tests/e2e/screenshots/
```

The baselines should show:
- Landing page (full page)
- Hero section
- Navigation bar
- Dashboard (if accessible)
- Mobile viewport
- Tablet viewport
- Feature sections

### Step 4: Commit Baselines

Baseline screenshots should be committed to git:

```bash
git add tests/e2e/screenshots/
git commit -m "Add visual regression baselines"
```

## Updating Baselines

### When to Update

Update baselines when you:
- Intentionally change the UI
- Update styling or layout
- Add new features that change appearance
- Fix visual bugs

### How to Update

```bash
# Update all visual baselines
npm run test:e2e:visual:update

# Update specific test
npx playwright test --update-snapshots tests/e2e/visual-regression.spec.ts -g "landing page"
```

### Review Changes

After updating, always:
1. Review the new screenshots
2. Verify they match your intended changes
3. Commit with a descriptive message

## Baseline Structure

```
tests/e2e/screenshots/
├── visual-regression.spec.ts/
│   ├── landing-page.png
│   ├── landing-hero-section.png
│   ├── navigation-bar.png
│   ├── dashboard.png
│   ├── landing-page-mobile.png
│   ├── landing-page-tablet.png
│   └── feature-sections.png
```

## Troubleshooting

### Baselines Not Created

**Issue**: Tests fail with "screenshot not found"

**Solution**: 
1. Ensure dev server is running
2. Run with `--update-snapshots` flag
3. Check file permissions on `tests/e2e/screenshots/`

### Baselines Look Wrong

**Issue**: Screenshots don't match expected appearance

**Solution**:
1. Check if dev server is serving correct content
2. Verify environment variables are set
3. Ensure error overlays are removed
4. Check viewport sizes match expectations

### Tests Fail After UI Changes

**Issue**: Visual tests fail after intentional UI changes

**Solution**:
1. Review the diff images in `test-results/`
2. Verify changes are intentional
3. Update baselines with `--update-snapshots`
4. Commit both code and baseline changes

## Best Practices

1. **Review Before Committing**: Always review baseline screenshots before committing
2. **Document Changes**: Include why baselines were updated in commit messages
3. **Version Control**: Keep baselines in git for team consistency
4. **Regular Updates**: Update baselines as part of UI change workflow
5. **CI Integration**: Don't auto-update baselines in CI - fail and require manual review

## CI/CD Considerations

In CI/CD pipelines:
- **Don't** auto-update baselines
- **Do** fail the build if visual tests fail
- **Do** upload diff images as artifacts
- **Do** require manual review of visual changes

## Next Steps

After setting up baselines:
1. Run visual tests regularly: `npm run test:e2e:visual`
2. Review any failures carefully
3. Update baselines when UI changes intentionally
4. Keep baselines in sync with code changes

