# Running Tests Against Existing Server

If you have a dev server already running on port 3000, you can run tests directly:

```bash
# Run tests (Playwright will detect existing server)
npm run test:e2e

# Or disable webServer in playwright.config.ts temporarily
# by commenting out the webServer section
```

The tests will work against your existing dev server!

