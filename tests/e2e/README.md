# E2E Testing Documentation

**Last Updated:** December 19, 2025  
**Status:** 29 essential documentation files (cleaned from 131)

---

## 📚 Documentation Index

### Quick Start
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Start here for setup
- **[RUNNING_TESTS.md](RUNNING_TESTS.md)** - How to run tests (includes quick commands)

### Testing Guides
- **[ACCESSIBILITY_TESTING_GUIDE.md](ACCESSIBILITY_TESTING_GUIDE.md)** - Accessibility testing
- **[VISUAL_REGRESSION_GUIDE.md](VISUAL_REGRESSION_GUIDE.md)** - Visual regression testing
- **[TEST_TAGS_GUIDE.md](TEST_TAGS_GUIDE.md)** - Test tagging and organization
- **[TEST_PATTERNS.md](TEST_PATTERNS.md)** - Common test patterns
- **[TEST_ANTI_PATTERNS.md](TEST_ANTI_PATTERNS.md)** - What to avoid
- **[TEST_BEST_PRACTICES.md](TEST_BEST_PRACTICES.md)** - Best practices

### Implementation Guides
- **[AUTHENTICATION_GUIDE.md](AUTHENTICATION_GUIDE.md)** - Authentication in tests
- **[BROWSER_TOOLS_GUIDE.md](BROWSER_TOOLS_GUIDE.md)** - Browser automation tools
- **[EXECUTION_GUIDE.md](EXECUTION_GUIDE.md)** - Test execution strategies

### Advanced Topics
- **[CI_CD_INTEGRATION_GUIDE.md](CI_CD_INTEGRATION_GUIDE.md)** - CI/CD setup
- **[MAINTENANCE_AUTOMATION_GUIDE.md](MAINTENANCE_AUTOMATION_GUIDE.md)** - Test maintenance
- **[METRICS_DASHBOARD_GUIDE.md](METRICS_DASHBOARD_GUIDE.md)** - Test metrics
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Migration strategies

### Reference
- **[TEST_MATRIX.md](TEST_MATRIX.md)** - Test coverage matrix
- **[TEST_METRICS.md](TEST_METRICS.md)** - Metrics and KPIs
- **[TEST_UTILITIES_EXPANSION.md](TEST_UTILITIES_EXPANSION.md)** - Utility functions

### Setup & Configuration
- **[SETUP_VISUAL_BASELINES.md](SETUP_VISUAL_BASELINES.md)** - Visual baseline setup
- **[run-against-existing-server.md](run-against-existing-server.md)** - Run with existing server
- **[TIMEOUT_OPTIMIZATIONS.md](TIMEOUT_OPTIMIZATIONS.md)** - Timeout configurations

### Troubleshooting & Help
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions
- **[TEST_HEALTH_CHECK.md](TEST_HEALTH_CHECK.md)** - Test suite health checks
- **[HANDOFF_GUIDE.md](HANDOFF_GUIDE.md)** - Project handoff information

### Planning
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - Immediate next steps
- **[NEXT_STEPS_GUIDE.md](NEXT_STEPS_GUIDE.md)** - Long-term planning

---

## 🎯 Quick Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/visual-regression.spec.ts

# Run with UI
npx playwright test --ui

# Update visual baselines
npx playwright test --update-snapshots

# Debug specific test
npx playwright test --debug tests/e2e/landing-page.spec.ts
```

---

## 📊 Current Status

- **E2E Tests:** 166 tests (127 passing, 77%)
- **Test Files:** 26 spec files
- **Documentation:** 29 essential guides
- **Visual Baselines:** 7 screenshots

---

## 🚀 Getting Started

1. Read [GETTING_STARTED.md](GETTING_STARTED.md)
2. Run `npm run test:e2e`
3. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if issues arise
4. Review [TEST_BEST_PRACTICES.md](TEST_BEST_PRACTICES.md) before writing tests

---

## 📖 Documentation History

**December 19, 2025:** Major cleanup - reduced from 131 files to 29 essential guides
- Removed 102 duplicate/status/summary files
- Consolidated redundant documentation
- Organized remaining guides by category

---

For the latest test results and coverage, see **[README-TESTING.md](../../README-TESTING.md)** in the project root.
