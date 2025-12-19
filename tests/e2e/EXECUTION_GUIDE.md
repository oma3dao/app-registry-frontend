# Test Execution Guide

## Quick Reference

### Basic Commands

```bash
# Run all tests
npm run test:e2e

# Run with UI (recommended for debugging)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e -- tests/e2e/api-integration.spec.ts
```

### Using Test Runner

```bash
# List all available test suites
node tests/e2e/test-runner.js --help

# Run specific test suite
node tests/e2e/test-runner.js api

# Run with UI mode
node tests/e2e/test-runner.js error --ui

# Run with headed mode
node tests/e2e/test-runner.js visual --headed

# Run with debug mode
node tests/e2e/test-runner.js dashboard --debug

# Run with specific browser
node tests/e2e/test-runner.js landing --project=chromium

# Run all tests
node tests/e2e/test-runner.js all
```

## Test Categories

### Core Functionality Tests

```bash
# Landing page
node tests/e2e/test-runner.js landing

# Dashboard
node tests/e2e/test-runner.js dashboard

# Wizard flow
node tests/e2e/test-runner.js wizard
```

### Quality Assurance Tests

```bash
# Accessibility
node tests/e2e/test-runner.js accessibility

# Performance
node tests/e2e/test-runner.js performance

# Visual regression
node tests/e2e/test-runner.js visual

# Network
node tests/e2e/test-runner.js network
```

### Integration Tests

```bash
# API integration
node tests/e2e/test-runner.js api

# Error boundaries
node tests/e2e/test-runner.js error

# Authentication
node tests/e2e/test-runner.js auth
```

## Execution Modes

### 1. Standard Mode (Headless)
```bash
npm run test:e2e
```
- Fast execution
- No browser UI
- Best for CI/CD
- Default mode

### 2. UI Mode
```bash
npm run test:e2e:ui
```
- Interactive UI
- Step through tests
- Debug failures
- Best for development

### 3. Headed Mode
```bash
npm run test:e2e:headed
```
- See browser
- Watch test execution
- Debug visually
- Best for visual debugging

### 4. Debug Mode
```bash
npm run test:e2e:debug
```
- Step-by-step execution
- Breakpoints
- Console access
- Best for deep debugging

## Running Specific Tests

### By Test Name
```bash
# Run tests matching a pattern
npm run test:e2e -- -g "should load landing page"

# Run multiple patterns
npm run test:e2e -- -g "landing|dashboard"
```

### By File
```bash
# Single file
npm run test:e2e -- tests/e2e/landing-page.spec.ts

# Multiple files
npm run test:e2e -- tests/e2e/landing-page.spec.ts tests/e2e/dashboard.spec.ts
```

### By Line Number
```bash
# Run specific test by line
npm run test:e2e -- tests/e2e/landing-page.spec.ts:25
```

## Browser Selection

### Default (Firefox)
```bash
npm run test:e2e
```

### Specific Browser
```bash
# Firefox
npm run test:e2e:firefox

# Chromium
npm run test:e2e:chromium

# WebKit
npm run test:e2e:webkit
```

### With Test Runner
```bash
node tests/e2e/test-runner.js api --project=chromium
```

## Visual Regression

### Run Visual Tests
```bash
npm run test:e2e:visual
```

### Update Baselines
```bash
npm run test:e2e:visual:update
```

### Specific Visual Test
```bash
npm run test:e2e -- tests/e2e/visual-regression.spec.ts -g "landing page"
```

## Coverage & Reporting

### Generate Coverage Report
```bash
npm run test:e2e:coverage
```

### View Test Report
```bash
npx playwright show-report
```

### Verify Setup
```bash
npm run test:e2e:verify
```

## CI/CD Execution

### Local CI Simulation
```bash
# Set CI environment
export CI=true
export TEST_WORKERS=1

# Run tests
npm run test:e2e
```

### With Sharding
```bash
# Shard 1 of 4
CI_TOTAL_SHARDS=4 CI_SHARD_INDEX=0 npm run test:e2e

# Shard 2 of 4
CI_TOTAL_SHARDS=4 CI_SHARD_INDEX=1 npm run test:e2e
```

## Performance Optimization

### Parallel Execution
```bash
# Use more workers (default: 3)
TEST_WORKERS=4 npm run test:e2e

# Use fewer workers (for slower machines)
TEST_WORKERS=1 npm run test:e2e
```

### Stop on Failures
```bash
# Stop after 5 failures
npm run test:e2e -- --max-failures=5
```

## Common Workflows

### Development Workflow
```bash
# 1. Start dev server
npm run dev

# 2. In another terminal, run tests with UI
npm run test:e2e:ui

# 3. Debug failures interactively
```

### Pre-Commit Workflow
```bash
# Run quick tests
npm run test:e2e -- tests/e2e/landing-page.spec.ts

# Check for regressions
npm run test:e2e:visual
```

### Full Test Suite
```bash
# Run everything
npm run test:e2e

# Generate coverage
npm run test:e2e:coverage

# Verify setup
npm run test:e2e:verify
```

### Debugging Workflow
```bash
# 1. Run in debug mode
npm run test:e2e:debug

# 2. Or use UI mode
npm run test:e2e:ui

# 3. Or use headed mode
npm run test:e2e:headed
```

## Environment Variables

### Test Configuration
```bash
# Skip web server (if already running)
SKIP_WEBSERVER=true npm run test:e2e

# Set base URL
BASE_URL=http://localhost:3000 npm run test:e2e

# Set workers
TEST_WORKERS=2 npm run test:e2e
```

### Authentication
```bash
# Set wallet email for auth tests
TEST_WALLET_EMAIL=test@example.com npm run test:e2e

# Set Thirdweb client ID
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your-id npm run test:e2e
```

## Troubleshooting

### Tests Timeout
```bash
# Increase timeout
npm run test:e2e -- --timeout=120000
```

### Tests Fail Intermittently
```bash
# Add retries
npm run test:e2e -- --retries=2
```

### Browser Issues
```bash
# Reinstall browsers
npx playwright install

# Install specific browser
npx playwright install firefox
```

## Best Practices

### 1. Run Tests Locally First
Always run tests locally before pushing:
```bash
npm run test:e2e
```

### 2. Use UI Mode for Debugging
When tests fail, use UI mode:
```bash
npm run test:e2e:ui
```

### 3. Update Visual Baselines
When UI changes are intentional:
```bash
npm run test:e2e:visual:update
```

### 4. Check Coverage Regularly
Monitor test coverage:
```bash
npm run test:e2e:coverage
```

### 5. Verify Setup
After setup changes:
```bash
npm run test:e2e:verify
```

## Quick Commands Cheat Sheet

```bash
# Basic
npm run test:e2e                    # Run all
npm run test:e2e:ui                 # UI mode
npm run test:e2e:headed             # Headed mode
npm run test:e2e:debug               # Debug mode

# Specific
npm run test:e2e -- tests/e2e/api-integration.spec.ts
node tests/e2e/test-runner.js api   # Test runner

# Visual
npm run test:e2e:visual             # Run visual
npm run test:e2e:visual:update      # Update baselines

# Reporting
npm run test:e2e:coverage           # Coverage
npm run test:e2e:verify             # Verify setup
npx playwright show-report           # View report

# Browsers
npm run test:e2e:firefox            # Firefox
npm run test:e2e:chromium           # Chromium
npm run test:e2e:webkit             # WebKit
```

---

**For more information:**
- `QUICK_START.md` - Quick start guide
- `TROUBLESHOOTING.md` - Troubleshooting guide
- `TEST_MATRIX.md` - Coverage matrix

