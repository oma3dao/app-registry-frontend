# E2E Test Setup

## Prerequisites

Before running E2E tests, ensure your development environment is properly configured:

### 1. Environment Variables

Create a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-thirdweb-client-id
```

**Note:** For testing purposes, you can use a test/dummy client ID. The tests will still run, but wallet connections won't work without a valid ID.

### 2. Start Dev Server

```bash
npm run dev
```

The Playwright config is set to automatically start the dev server, but you can also start it manually.

### 3. Run Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (recommended)
npm run test:e2e:ui

# Run in visible browser
npm run test:e2e:headed
```

## Test Structure

- `landing-page.spec.ts` - Tests for the landing page
- `dashboard.spec.ts` - Tests for the dashboard (requires auth)
- `wizard-flow.spec.ts` - Tests for the registration wizard

## Troubleshooting

### Error: "No client ID provided"

**Solution:** Create `.env.local` with `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` set.

### Tests fail to connect to dev server

**Solution:** 
1. Ensure dev server is running on port 3000
2. Check `playwright.config.ts` webServer configuration
3. Try starting dev server manually: `npm run dev`

### Tests timeout

**Solution:**
- Increase timeout in `playwright.config.ts`
- Check network connectivity
- Verify dev server is responding

## Using Cursor Browser Tools

See `docs/USING_CURSOR_BROWSER_EXAMPLE.md` for examples of using Cursor's browser capabilities to explore and generate tests.

