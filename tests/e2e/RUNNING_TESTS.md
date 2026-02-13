# Running E2E Tests

## Prerequisites

1. **Environment Variables**
   - Create `.env.local` file with:
     ```
     NEXT_PUBLIC_THIRDWEB_CLIENT_ID=test-client-id
     ```
   - Or set it in your environment

2. **Dev Server**
   - Start the dev server in a separate terminal:
     ```bash
     npm run dev
     ```
   - Wait for server to be ready (usually shows "Ready" message)

## Running Tests

### Option 1: With Playwright Managing Server (Recommended)

Playwright will automatically start/stop the dev server:

```bash
# Run all tests
npm run test:e2e

# Run with UI (best for development)
npm run test:e2e:ui

# Run in visible browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

### Option 2: With Existing Server

If you already have `npm run dev` running:

```bash
# Set environment variable to skip web server
$env:SKIP_WEBSERVER='true'; npm run test:e2e

# Or on Linux/Mac:
SKIP_WEBSERVER=true npm run test:e2e
```

### Option 3: Run Specific Tests

```bash
# Run specific test file
npx playwright test tests/e2e/landing-page.spec.ts

# Run specific test
npx playwright test tests/e2e/landing-page.spec.ts -g "should load"

# Run tests matching pattern
npx playwright test -g "dashboard"
```

## Test Results

After running tests, you can view results:

```bash
# View HTML report
npx playwright show-report

# View last test run
npx playwright show-report playwright-report
```

## Troubleshooting

### Issue: Tests timeout waiting for server

**Solution:** Ensure dev server is running:
```bash
npm run dev
```

Wait for "Ready" message, then run tests in another terminal.

### Issue: "NEXT_PUBLIC_THIRDWEB_CLIENT_ID" error

**Solution:** Create `.env.local` file:
```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=test-client-id
```

Restart dev server after creating the file.

### Issue: Tests fail with "page.goto timeout"

**Solution:** 
1. Check if server is accessible: `curl http://localhost:3000`
2. Increase timeout in `playwright.config.ts`:
   ```typescript
   timeout: 60 * 1000, // Increase from 30s
   ```
3. Or use `SKIP_WEBSERVER=true` if server is already running

### Issue: Firefox not installed

**Solution:** Install Firefox:
```bash
npx playwright install firefox
```

### Issue: Tests are flaky

**Solution:**
1. Use UI mode to see what's happening: `npm run test:e2e:ui`
2. Check screenshots in `test-results/` folder
3. Review test logs for timing issues
4. Consider increasing timeouts for slow elements

## Best Practices

1. **Run tests in UI mode first** to see what's happening
2. **Check screenshots** when tests fail (in `test-results/`)
3. **Use headed mode** for debugging: `npm run test:e2e:headed`
4. **Run specific tests** when developing new features
5. **Check console logs** in test output for errors

## CI/CD

Tests run automatically in GitHub Actions (`.github/workflows/e2e-tests.yml`).

To run tests locally as CI would:
```bash
CI=true npm run test:e2e
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:ui` | Run with Playwright UI |
| `npm run test:e2e:headed` | Run in visible browser |
| `npm run test:e2e:debug` | Debug mode |
| `npm run test:e2e:firefox` | Run only Firefox tests |
| `npx playwright show-report` | View test report |

