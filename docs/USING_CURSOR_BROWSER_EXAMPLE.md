# Example: Using Cursor's Browser Tools to Generate Tests

This document shows a practical example of using Cursor's browser capabilities to explore your app and generate E2E tests.

## Scenario: Testing the Landing Page

### Step 1: Start Your Dev Server

```bash
npm run dev
```

### Step 2: Ask Cursor to Explore

**Prompt to Cursor:**
```
Navigate to http://localhost:3000 and take a snapshot of the landing page.
What are the main UI elements? What buttons, links, and interactive elements are visible?
```

**What Cursor Will Do:**
- Navigate to your app
- Take an accessibility snapshot
- Report what it sees

### Step 3: Test a Specific Flow

**Prompt to Cursor:**
```
Navigate to http://localhost:3000 and test the navigation:
1. Click on the "Docs" link
2. Go back
3. Click on "About"
4. Tell me what happens
```

### Step 4: Generate Tests

**Prompt to Cursor:**
```
Based on your exploration of the landing page, generate a comprehensive Playwright test file
at tests/e2e/landing-page-generated.spec.ts that tests:
1. Landing page loads with hero section
2. Navigation links are visible and clickable
3. Get Started button is present
4. Feature sections (Register Services, Build Reputation) are displayed
5. Page is responsive on mobile
```

**Cursor Will Generate:**
- A complete Playwright test file
- Proper selectors based on what it saw
- Assertions for key elements
- Test structure following best practices

### Step 5: Review and Refine

**Prompt to Cursor:**
```
Review the generated test file and improve it:
- Add better error handling
- Add more edge cases
- Improve selectors to be more robust
- Add comments explaining each test
```

### Step 6: Run the Tests

```bash
npm run test:e2e:ui
```

## Example: Testing the Wizard Flow

### Step 1: Explore the Wizard

**Prompt to Cursor:**
```
Navigate to http://localhost:3000 and start the registration wizard:
1. Click the "Get Started" or "Register" button
2. Walk through each step of the wizard
3. Tell me what fields are on each step
4. What happens when you click Next?
```

### Step 2: Generate Wizard Tests

**Prompt to Cursor:**
```
Based on the wizard flow you just explored, generate a Playwright test file
at tests/e2e/wizard-generated.spec.ts that:
1. Starts the wizard
2. Fills out each step with test data
3. Navigates through all steps
4. Submits the form
5. Verifies success
```

### Step 3: Add Edge Cases

**Prompt to Cursor:**
```
Add tests to the wizard test file for:
- Validation errors (empty required fields)
- Back navigation
- Closing the wizard mid-flow
- Network errors
```

## Tips for Best Results

### ✅ Do:
- Be specific about what to test
- Mention your tech stack (Next.js, React, thirdweb)
- Ask for improvements after generation
- Test one feature at a time

### ❌ Don't:
- Ask Cursor to test everything at once
- Skip reviewing generated tests
- Forget to run tests after generation
- Ignore test failures - ask Cursor to fix them

## Common Prompts

### Explore a New Feature
```
Navigate to http://localhost:3000/dashboard and explore the dashboard.
What can users do? What buttons and actions are available?
```

### Debug a Test Failure
```
The test at tests/e2e/landing-page.spec.ts is failing.
Navigate to http://localhost:3000 and reproduce the issue.
What's going wrong? How can we fix the test?
```

### Generate Tests for Multiple Pages
```
Explore these pages:
1. http://localhost:3000 (landing page)
2. http://localhost:3000/dashboard (if accessible)
3. The wizard flow

Then generate E2E tests for all critical user flows.
```

### Improve Existing Tests
```
Review tests/e2e/landing-page.spec.ts and improve them:
- Make selectors more robust
- Add better error messages
- Add more edge cases
- Improve test organization
```

## Next Steps

1. Try exploring your app with Cursor
2. Generate tests for critical flows
3. Run tests and verify they work
4. Add tests to your CI/CD pipeline
5. Maintain tests as your app evolves

See `docs/E2E_TESTING_GUIDE.md` for complete documentation.

