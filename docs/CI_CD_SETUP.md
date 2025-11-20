# CI/CD Setup for E2E Tests

## GitHub Actions Workflow

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright browsers
      run: npx playwright install --with-deps firefox

    - name: Run E2E tests
      run: npm run test:e2e
      env:
        NEXT_PUBLIC_THIRDWEB_CLIENT_ID: ${{ secrets.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || 'test-client-id' }}

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

## Environment Variables

Add to GitHub Secrets (optional):
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` - Your Thirdweb client ID

## Test Reports

Test reports will be uploaded as artifacts and can be viewed in the Actions tab.

## Next Steps

1. Create `.github/workflows/e2e-tests.yml` with the above content
2. Push to trigger workflow
3. View results in GitHub Actions

