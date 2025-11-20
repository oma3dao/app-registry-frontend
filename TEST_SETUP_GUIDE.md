# E2E Test Setup Guide

## Quick Start

1. **Create `.env.local` file** (already created):
   ```
   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=test-client-id
   ```

2. **Start dev server**:
   ```powershell
   npm run dev
   ```

3. **Run tests**:
   ```powershell
   $env:SKIP_WEBSERVER='true'; npm run test:e2e -- tests/e2e/landing-page-comprehensive.spec.ts --reporter=list --project=firefox
   ```

## The Problem

Tests were failing because `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` was not set in the dev server environment. When this variable is missing, the error is thrown in `src/app/client.ts` during module initialization, which prevents React from rendering at all.

The page shows "missing required error components, refreshing..." because React can't render without this variable.

## Solution: Environment Variable Setup

### Option 1: Use `.env.local` file (RECOMMENDED - Already Created)

The `.env.local` file has been created with:
```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=test-client-id
```

Just restart your dev server:
```powershell
npm run dev
```

Then run tests with:
```powershell
$env:SKIP_WEBSERVER='true'; npm run test:e2e -- tests/e2e/landing-page-comprehensive.spec.ts
```

### Option 2: Set env var when starting dev server

**PowerShell:**
```powershell
$env:NEXT_PUBLIC_THIRDWEB_CLIENT_ID='test-client-id'; npm run dev
```

**Command Prompt:**
```cmd
set NEXT_PUBLIC_THIRDWEB_CLIENT_ID=test-client-id && npm run dev
```

### Option 3: Let Playwright manage the server

Stop your dev server, then run tests without `SKIP_WEBSERVER`:
```powershell
npm run test:e2e -- tests/e2e/landing-page-comprehensive.spec.ts
```

Playwright will start a new server with the env var automatically.

## Test Fixes Applied

### Better Selectors

- **Hero Section**: `h1:has-text("OMATrust is Trust for")` - targets actual `<h1>` element
- **Navigation**: `nav a:has-text("Docs")` - more specific selectors
- **Features**: `h4:has-text("Register Services")` - targets actual headings
- **Buttons**: `#hero-connect button` and `#nav-connect button` - uses component IDs

### Better Waiting Strategy

- Wait for elements to be **attached** first
- Then wait for **visible**
- Then verify with **expect**

### Error Overlay Handling

- JavaScript-based removal in `beforeEach`
- Multiple removal attempts
- Verifies page content is visible after removal

## Why This Matters

**Without the env var:**
- React throws error during module initialization
- Next.js shows error overlay
- Error overlay components are missing
- Page gets stuck in refresh loop
- Tests can't find any elements

**With the env var:**
- React renders normally
- Page loads correctly
- Tests can find elements
- Everything works!

## Verify It's Working

After setting the env var:
1. Dev server starts without errors
2. Page loads at http://localhost:3000
3. No error overlay appears
4. Tests can find elements

## Running Tests

### Quick Start (Recommended)
```powershell
# Make sure dev server is running first
npm run dev

# Then run tests with UI (see tests visually)
npm run test:e2e:ui
```

### All Test Commands

**Run all E2E tests:**
```powershell
$env:SKIP_WEBSERVER='true'; npm run test:e2e --reporter=list
```

**Run comprehensive landing page tests:**
```powershell
$env:SKIP_WEBSERVER='true'; npm run test:e2e -- tests/e2e/landing-page-comprehensive.spec.ts --reporter=list --project=firefox
```

**With UI (interactive - recommended):**
```powershell
npm run test:e2e:ui
```

**In headed mode (see browser):**
```powershell
npm run test:e2e:headed
```

**Debug mode:**
```powershell
npm run test:e2e:debug
```

**View test report:**
```powershell
npx playwright show-report
```

**Run specific test file:**
```powershell
npm run test:e2e -- tests/e2e/landing-page-comprehensive.spec.ts
```

