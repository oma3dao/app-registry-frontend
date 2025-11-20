# Firefox Browser Setup for E2E Tests

## Overview

Firefox is configured as the **default browser** for E2E tests in this project. All E2E tests will run in Firefox unless specified otherwise.

## Installation

Firefox browser for Playwright is already installed. If you need to reinstall:

```bash
npx playwright install firefox
```

## Running Tests with Firefox

### Default (Firefox)
```bash
npm run test:e2e
```

### Explicit Firefox
```bash
npm run test:e2e:firefox
```

### With UI (Firefox)
```bash
npm run test:e2e:ui
```

### Headed Mode (See Firefox Window)
```bash
npm run test:e2e:headed
```

## Why Firefox?

- **Cross-platform compatibility** - Works consistently across Windows, macOS, and Linux
- **Open source** - Fully open-source browser engine
- **Standards compliance** - Excellent web standards support
- **Performance** - Good performance for automated testing

## Running Tests on Multiple Browsers

If you want to test on multiple browsers, uncomment the other browser projects in `playwright.config.ts`:

```typescript
projects: [
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
],
```

Then install the browsers:
```bash
npx playwright install chromium webkit
```

And run tests:
```bash
npm run test:e2e  # Runs on all configured browsers
```

## Browser-Specific Commands

- `npm run test:e2e:firefox` - Run only Firefox tests
- `npm run test:e2e:chromium` - Run only Chromium tests (if enabled)
- `npm run test:e2e:webkit` - Run only WebKit tests (if enabled)

## Troubleshooting

### Firefox not found
```bash
npx playwright install firefox
```

### Tests fail in Firefox but work in Chrome
- Check for Firefox-specific CSS/JS issues
- Verify selectors work in Firefox
- Check console for Firefox-specific errors

### Firefox is slow
- This is normal - Firefox can be slower than Chromium for some operations
- Consider increasing timeouts in `playwright.config.ts` if needed

## Configuration

Firefox settings are configured in `playwright.config.ts`:

```typescript
{
  name: 'firefox',
  use: { ...devices['Desktop Firefox'] },
}
```

You can customize Firefox settings by modifying the `use` object:

```typescript
{
  name: 'firefox',
  use: {
    ...devices['Desktop Firefox'],
    // Custom Firefox settings
    viewport: { width: 1280, height: 720 },
    // ... other settings
  },
}
```

## See Also

- [Playwright Firefox Documentation](https://playwright.dev/docs/browsers#firefox)
- [Firefox-specific APIs](https://playwright.dev/docs/api/class-firefox)

