# Troubleshooting Guide

## Common Issues and Solutions

### Test Execution Issues

#### Tests Timeout
**Symptoms:** Tests fail with timeout errors

**Solutions:**
1. Check if dev server is running:
   ```bash
   npm run dev
   ```

2. Increase timeout in `playwright.config.ts`:
   ```typescript
   timeout: 90 * 1000, // Increase from 60s to 90s
   ```

3. Reduce parallel workers:
   ```bash
   TEST_WORKERS=1 npm run test:e2e
   ```

4. Check server logs for errors

#### Tests Fail Intermittently
**Symptoms:** Tests pass sometimes, fail other times

**Solutions:**
1. Add retry logic (already configured in CI):
   ```typescript
   retries: process.env.CI ? 2 : 0,
   ```

2. Increase wait times for slow elements:
   ```typescript
   await page.waitForSelector('selector', { timeout: 10000 });
   ```

3. Use `waitForNetworkIdle` for API-heavy pages:
   ```typescript
   await waitForNetworkIdle(page);
   ```

#### Authentication Tests Fail
**Symptoms:** Tests requiring authentication fail

**Solutions:**
1. Check if `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` is set:
   ```bash
   echo $NEXT_PUBLIC_THIRDWEB_CLIENT_ID
   ```

2. Use real wallet connection for integration tests:
   ```typescript
   await connectWalletWithEmail(page, 'test@example.com');
   ```

3. Check if wallet connection modal appears:
   ```typescript
   const modal = await page.waitForSelector('[role="dialog"]');
   ```

### Visual Regression Issues

#### Visual Tests Fail with Minor Differences
**Symptoms:** Visual tests fail due to pixel differences

**Solutions:**
1. Update baselines if changes are intentional:
   ```bash
   npm run test:e2e:visual:update
   ```

2. Adjust threshold in `playwright.config.ts`:
   ```typescript
   toHaveScreenshot: {
     threshold: 0.3, // Increase from 0.2
     maxDiffPixels: 200, // Increase from 100
   }
   ```

3. Check for dynamic content (timestamps, random IDs):
   - Use `mask` option to ignore dynamic regions
   - Wait for content to stabilize before screenshot

#### Snapshots Not Found
**Symptoms:** Error: "Snapshot not found"

**Solutions:**
1. Generate initial snapshots:
   ```bash
   npm run test:e2e:visual:update
   ```

2. Check snapshot directory exists:
   ```bash
   ls tests/e2e/visual-regression.spec.ts-snapshots/
   ```

### Network Issues

#### API Requests Fail
**Symptoms:** API integration tests fail

**Solutions:**
1. Verify API endpoints are accessible:
   ```bash
   curl http://localhost:3000/api/data-url/test
   ```

2. Check network request interception:
   ```typescript
   page.on('request', request => console.log(request.url()));
   ```

3. Verify CORS headers if testing cross-origin:
   ```typescript
   const response = await page.goto(url);
   const headers = response?.headers();
   ```

#### Slow Network Requests
**Symptoms:** Tests timeout waiting for API responses

**Solutions:**
1. Increase navigation timeout:
   ```typescript
   await page.goto(url, { timeout: 60000 });
   ```

2. Use `waitForNetworkIdle`:
   ```typescript
   await waitForNetworkIdle(page, { timeout: 30000 });
   ```

3. Mock slow APIs in tests:
   ```typescript
   await page.route('**/api/**', route => {
     setTimeout(() => route.continue(), 1000);
   });
   ```

### Browser Issues

#### Firefox Not Found
**Symptoms:** Error: "Browser not found"

**Solutions:**
1. Install Playwright browsers:
   ```bash
   npx playwright install firefox
   ```

2. Install all browsers:
   ```bash
   npx playwright install
   ```

#### Browser Crashes
**Symptoms:** Browser crashes during test execution

**Solutions:**
1. Reduce memory usage:
   ```typescript
   // In playwright.config.ts
   use: {
     headless: true,
   }
   ```

2. Increase browser timeout:
   ```typescript
   timeout: 120 * 1000,
   ```

3. Check for memory leaks in application code

### CI/CD Issues

#### Tests Fail in CI but Pass Locally
**Symptoms:** Tests work locally but fail in GitHub Actions

**Solutions:**
1. Check CI environment variables:
   ```yaml
   env:
     NEXT_PUBLIC_THIRDWEB_CLIENT_ID: ${{ secrets.THIRDWEB_CLIENT_ID }}
   ```

2. Verify server is ready before tests:
   ```yaml
   - name: Wait for server
     run: |
       timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'
   ```

3. Check CI logs for specific errors

#### Artifacts Not Uploaded
**Symptoms:** Test artifacts missing in CI

**Solutions:**
1. Verify artifact paths in workflow:
   ```yaml
   - uses: actions/upload-artifact@v3
     with:
       path: playwright-report/
   ```

2. Check artifact size limits (GitHub: 10GB per artifact)

3. Verify paths exist before upload:
   ```yaml
   - run: ls -la playwright-report/
   ```

### Performance Issues

#### Tests Run Too Slowly
**Symptoms:** Test suite takes too long to complete

**Solutions:**
1. Increase parallel workers:
   ```bash
   TEST_WORKERS=4 npm run test:e2e
   ```

2. Use test sharding in CI:
   ```yaml
   strategy:
     matrix:
       shard: [1, 2, 3, 4]
   ```

3. Skip slow tests during development:
   ```typescript
   test.skip('slow test', async ({ page }) => {
     // Test code
   });
   ```

#### High Memory Usage
**Symptoms:** Tests consume too much memory

**Solutions:**
1. Reduce parallel workers:
   ```bash
   TEST_WORKERS=1 npm run test:e2e
   ```

2. Close pages after tests:
   ```typescript
   test.afterEach(async ({ page }) => {
     await page.close();
   });
   ```

3. Use headless mode:
   ```typescript
   use: { headless: true }
   ```

### Debugging Tips

#### Enable Debug Mode
```bash
npm run test:e2e:debug
```

#### Enable UI Mode
```bash
npm run test:e2e:ui
```

#### Run Single Test
```bash
npm run test:e2e -- tests/e2e/landing-page.spec.ts -g "should load landing page"
```

#### Capture Screenshots on Failure
Already configured in `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

#### View Test Report
```bash
npx playwright show-report
```

### Getting Help

1. **Check Documentation:**
   - `README.md` - Main guide
   - `QUICK_REFERENCE.md` - Quick commands
   - `INDEX.md` - Documentation index

2. **Verify Setup:**
   ```bash
   npm run test:e2e:verify
   ```

3. **Check Test Status:**
   ```bash
   npm run test:e2e:coverage
   ```

4. **Review Logs:**
   - Check browser console logs
   - Check network requests
   - Check server logs

---

**Still having issues?** Review the test output and error messages for specific guidance.
