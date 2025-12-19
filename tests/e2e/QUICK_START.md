# Quick Start Guide

## 🚀 Run Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI (recommended for debugging)
npm run test:e2e:ui

# Run specific test file
npm run test:e2e -- tests/e2e/api-integration.spec.ts

# Run in headed mode (see browser)
npm run test:e2e:headed
```

## 📊 Generate Reports

```bash
# Generate coverage report
npm run test:e2e:coverage

# View test report
npx playwright show-report
```

## ✅ Verify Setup

```bash
# Verify all files and configurations
npm run test:e2e:verify
```

## 🖼️ Visual Regression

```bash
# Run visual tests
npm run test:e2e:visual

# Update visual baselines
npm run test:e2e:visual:update
```

## 📁 Test Files

### Core Tests
- `landing-page.spec.ts` - Landing page
- `dashboard.spec.ts` - Dashboard
- `wizard-flow.spec.ts` - Registration wizard

### Quality Tests
- `accessibility.spec.ts` - Accessibility
- `performance.spec.ts` - Performance
- `visual-regression.spec.ts` - Visual tests
- `network.spec.ts` - Network

### Integration Tests ✨ NEW
- `api-integration.spec.ts` - API endpoints
- `error-boundary.spec.ts` - Error handling
- `additional-scenarios.spec.ts` - Edge cases

## 📚 Documentation

- `README.md` - Main guide
- `QUICK_REFERENCE.md` - All commands
- `FINAL_COMPLETE_SUMMARY.md` - Complete overview
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Implementation details

## 🎯 Test Statistics

- **Total Tests:** 68+ tests
- **Test Files:** 18 files
- **Status:** ✅ Production Ready

## 🔧 Configuration

- **Timeout:** 60s per test
- **Workers:** 3 (local), 1 (CI)
- **Browser:** Firefox (default)
- **Retries:** 0 (local), 2 (CI)

---

**Need Help?** See `README_MASTER.md` for complete documentation.

