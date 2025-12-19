# Test Tags Guide

## Overview

Test tags help organize and selectively run tests based on their characteristics. This guide explains all available tags and how to use them.

## Available Tags

### @api
**Purpose**: API endpoint tests  
**Files**: `api-routes.spec.ts`, `api-integration.spec.ts`, `network.spec.ts`  
**Usage**: Tests that verify API endpoint functionality

```bash
# Run all API tests
npx playwright test --grep "@api"
```

### @slow
**Purpose**: Tests with slow external calls  
**Files**: `api-routes.spec.ts`, `wizard-flow.spec.ts`  
**Usage**: Tests that make blockchain calls, external HTTP requests, or other slow operations

```bash
# Run only fast tests (exclude slow)
npx playwright test --grep "@slow" --grep-invert
```

### @ui
**Purpose**: UI interaction tests  
**Files**: `wizard-flow.spec.ts`, `component-interactions.spec.ts`  
**Usage**: Tests that verify user interface interactions

```bash
# Run UI tests
npx playwright test --grep "@ui"
```

### @performance
**Purpose**: Performance tests  
**Files**: `performance.spec.ts`, `api-integration.spec.ts`  
**Usage**: Tests that verify performance characteristics

```bash
# Run performance tests
npx playwright test --grep "@performance"
```

### @security
**Purpose**: Security-related tests  
**Files**: `api-integration.spec.ts`  
**Usage**: Tests that verify security headers, CORS, authentication, etc.

```bash
# Run security tests
npx playwright test --grep "@security"
```

### @accessibility
**Purpose**: Accessibility tests  
**Files**: `accessibility.spec.ts`  
**Usage**: Tests that verify accessibility requirements (a11y)

```bash
# Run accessibility tests
npx playwright test --grep "@accessibility"
```

### @network
**Purpose**: Network-related tests  
**Files**: `network.spec.ts`, `error-boundary.spec.ts`  
**Usage**: Tests that verify network requests, offline behavior, etc.

```bash
# Run network tests
npx playwright test --grep "@network"
```

### @error
**Purpose**: Error handling tests  
**Files**: `error-boundary.spec.ts`  
**Usage**: Tests that verify error handling and edge cases

```bash
# Run error handling tests
npx playwright test --grep "@error"
```

### @edge-case
**Purpose**: Edge case tests  
**Files**: `error-boundary.spec.ts`  
**Usage**: Tests that verify boundary conditions and edge cases

```bash
# Run edge case tests
npx playwright test --grep "@edge-case"
```

## Common Usage Patterns

### Run Fast Tests Only
```bash
# Exclude slow tests for quick feedback
npx playwright test --grep "@slow" --grep-invert
```

### Run API Tests Only
```bash
# Focus on API functionality
npx playwright test --grep "@api"
```

### Run UI Tests Only
```bash
# Focus on user interface
npx playwright test --grep "@ui"
```

### Run Performance Tests
```bash
# Check performance characteristics
npx playwright test --grep "@performance"
```

### Run Multiple Tags
```bash
# Run tests with both @api and @performance tags
npx playwright test --grep "@api" --grep "@performance"
```

### Exclude Specific Tags
```bash
# Run all tests except slow ones
npx playwright test --grep "@slow" --grep-invert
```

## CI/CD Integration

### Fast Feedback Pipeline
```yaml
# Run fast tests first for quick feedback
- name: Run Fast Tests
  run: npx playwright test --grep "@slow" --grep-invert
```

### Comprehensive Pipeline
```yaml
# Run all tests including slow ones
- name: Run All Tests
  run: npx playwright test
```

### Tagged Test Suites
```yaml
# Run specific test suites
- name: API Tests
  run: npx playwright test --grep "@api"
  
- name: Performance Tests
  run: npx playwright test --grep "@performance"
  
- name: Accessibility Tests
  run: npx playwright test --grep "@accessibility"
```

## Test Organization

### By Category
- **API**: `@api` - All API-related tests
- **UI**: `@ui` - User interface tests
- **Performance**: `@performance` - Performance tests
- **Security**: `@security` - Security tests
- **Accessibility**: `@accessibility` - A11y tests
- **Network**: `@network` - Network tests
- **Error Handling**: `@error`, `@edge-case` - Error tests

### By Speed
- **Fast**: All tests without `@slow` tag
- **Slow**: Tests with `@slow` tag (blockchain, external HTTP)

## Best Practices

1. **Tag Appropriately**: Use tags that accurately describe the test
2. **Multiple Tags**: Tests can have multiple tags (e.g., `@api @slow`)
3. **CI/CD Optimization**: Use tags to optimize CI/CD pipelines
4. **Selective Testing**: Use tags for focused testing during development
5. **Documentation**: Keep this guide updated as tags are added

## Tag Statistics

### Current Tag Distribution
- `@api`: ~25 tests
- `@slow`: ~5 tests
- `@ui`: ~10 tests
- `@performance`: ~8 tests
- `@security`: ~2 tests
- `@accessibility`: ~5 tests
- `@network`: ~8 tests
- `@error`: ~5 tests
- `@edge-case`: ~5 tests

## Adding New Tags

When adding a new tag:
1. Document it in this guide
2. Add it to relevant test files
3. Update tag statistics
4. Consider CI/CD integration

## Examples

### Example 1: Quick Development Feedback
```bash
# Run fast, non-API tests during development
npx playwright test --grep "@slow" --grep-invert --grep "@api" --grep-invert
```

### Example 2: Pre-commit Hook
```bash
# Run fast tests before commit
npx playwright test --grep "@slow" --grep-invert
```

### Example 3: Nightly Build
```bash
# Run all tests including slow ones
npx playwright test
```

## Related Documentation

- [OPTIMIZATIONS_APPLIED.md](./OPTIMIZATIONS_APPLIED.md) - Test optimizations
- [NEXT_STEPS_COMPLETE.md](./NEXT_STEPS_COMPLETE.md) - Implementation summary
- [INDEX.md](./INDEX.md) - Complete documentation index

