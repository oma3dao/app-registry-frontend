# Quick Start: Using Cursor's Browser Tools

## What You Can Do Right Now

Cursor's browser tools let you explore your app and generate E2E tests. Here's how to use them:

## Step 1: Start Your Dev Server

```bash
npm run dev
```

## Step 2: Ask Cursor to Explore

Try these prompts:

### Basic Exploration
```
Navigate to http://localhost:3000 and take a snapshot.
What UI elements are visible?
```

### Test a Flow
```
Navigate to http://localhost:3000, click the register button,
and walk through the wizard. Tell me what happens at each step.
```

### Generate Tests
```
Based on what you just explored, generate a Playwright test file
at tests/e2e/my-feature.spec.ts that tests the wizard flow.
```

## Step 3: Run Generated Tests

```bash
# Install Playwright (first time only)
npm install -D @playwright/test
npx playwright install

# Run tests
npm run test:e2e:ui
```

## Example Prompts

### Explore Landing Page
```
Navigate to http://localhost:3000 and explore the landing page.
What buttons, links, and interactive elements are there?
Take a screenshot and describe what you see.
```

### Test Registration Flow
```
Navigate to http://localhost:3000 and test the registration wizard:
1. Click the register button
2. Fill out step 1
3. Click next
4. Continue through all steps
5. Generate a Playwright test for this flow
```

### Debug an Issue
```
Navigate to http://localhost:3000/dashboard and check for console errors.
Take a screenshot and tell me what's wrong.
```

### Generate Comprehensive Tests
```
Explore the entire app:
- Landing page
- Dashboard
- Wizard flow
- NFT view modal

Then generate E2E tests for all critical user flows.
```

## What Happens Next?

1. **Cursor explores** your app using browser tools
2. **Cursor generates** Playwright test code
3. **You review** and refine the generated tests
4. **Tests run** automatically with Playwright
5. **Tests integrate** into your CI/CD pipeline

## Tips

- ✅ Be specific about what to test
- ✅ Mention your tech stack (Next.js, React)
- ✅ Ask for improvements after generation
- ✅ Use `test:e2e:ui` to see tests run visually

## Full Documentation

See `docs/E2E_TESTING_GUIDE.md` for complete documentation.

