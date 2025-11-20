# Quick Command Reference

## Run Tests

```bash
# Run with UI (see tests visually)
npm run test:e2e:ui

# Run all tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/landing-page-comprehensive.spec.ts

# Run in visible browser
npm run test:e2e:headed
```

## With Existing Dev Server

If dev server is already running on port 3000:

```bash
# Skip Playwright starting a server
$env:SKIP_WEBSERVER='true'; npm run test:e2e:ui
```

## Test Files

- `landing-page.spec.ts` - Basic tests
- `landing-page-comprehensive.spec.ts` - Full test suite
- `verify-firefox.spec.ts` - Firefox verification
- `environment-setup.spec.ts` - Environment checks

## All Set! 🚀

Run `npm run test:e2e:ui` to get started!

