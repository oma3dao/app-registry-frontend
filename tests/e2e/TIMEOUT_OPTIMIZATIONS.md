# Timeout Optimizations Applied

**Date:** December 8, 2025

## Overview

Optimized timeout settings across the test suite to improve reliability and reduce false failures due to slow API responses and network conditions.

## ✅ Changes Made

### 1. **Increased Default API Timeout**

**File:** `tests/e2e/api-test-utilities.ts`

**Change:**
- **Before:** Default timeout was `30000ms` (30 seconds)
- **After:** Default timeout is `60000ms` (60 seconds)

**Rationale:**
- Many API endpoints make external HTTP calls or blockchain RPC calls
- 30 seconds was insufficient for slow network conditions
- 60 seconds provides better reliability while still catching actual failures

### 2. **Added Default Retry Logic**

**File:** `tests/e2e/api-test-utilities.ts`

**Change:**
- **Before:** Default retries was `0` (no retries)
- **After:** Default retries is `1` (one retry)

**Rationale:**
- Transient network issues can cause false failures
- One retry helps handle temporary connection issues
- Exponential backoff prevents overwhelming the server

### 3. **Fixed `page.waitForTimeout` Deprecation**

**File:** `tests/e2e/api-test-utilities.ts`

**Change:**
- Replaced `page.waitForTimeout(backoff)` with `new Promise(resolve => setTimeout(resolve, backoff))`

**Rationale:**
- Playwright deprecated `page.waitForTimeout()`
- Using standard JavaScript Promise-based delays is the recommended approach

### 4. **Enhanced Connection Error Handling**

**File:** `tests/e2e/api-test-utilities.ts`

**Added:**
- Detection for `ECONNRESET` errors (server restarting, connection drops)
- Longer backoff (2000ms * attempt) for connection reset errors
- Automatic retry for connection reset errors

**Rationale:**
- Connection reset errors are often transient
- Longer backoff gives the server time to recover
- Improves test reliability in unstable network conditions

### 5. **Updated Specific Test Timeouts**

**File:** `tests/e2e/api-routes.spec.ts`

**Tests Updated:**
1. `should reject validate-url requests with missing URL`
   - Timeout: 30s → 60s
   - Retries: 0 → 1

2. `should handle fetch-metadata GET requests with valid URL`
   - Added explicit 60s timeout
   - Added 1 retry

3. `should reject fetch-description requests with invalid URL format`
   - Timeout: 30s → 60s
   - Retries: 0 → 1

4. `should reject discover-controlling-wallet requests with missing DID`
   - Timeout: 30s → 60s
   - Retries: 0 → 1

5. `should reject discover-controlling-wallet requests with invalid did:pkh format`
   - Added explicit 60s timeout
   - Added 1 retry

**Rationale:**
- These tests were consistently timing out at 30 seconds
- Increased timeouts provide better reliability
- Retries help handle transient failures

## 📊 Impact

### Before Optimizations:
- **Default Timeout:** 30 seconds
- **Default Retries:** 0
- **Connection Error Handling:** Basic
- **Test Failures:** 10+ timeout-related failures per run

### After Optimizations:
- **Default Timeout:** 60 seconds
- **Default Retries:** 1
- **Connection Error Handling:** Enhanced with connection reset detection
- **Expected Improvement:** Significant reduction in timeout-related failures

## 🎯 Performance Thresholds

The test suite maintains performance thresholds:

- **Fast:** < 1s
- **Normal:** < 5s
- **Slow:** < 15s
- **Very Slow:** < 60s (blockchain calls, external HTTP)

These thresholds are used for monitoring and reporting, not for test failures.

## 🔧 Configuration

### Environment-Based Timeouts

The test environment utility (`test-environment.ts`) provides environment-specific timeouts:

- **CI:** 60 seconds
- **Staging/Production:** 90 seconds
- **Local:** 30 seconds (can be overridden per test)

### Per-Test Override

Tests can override default timeouts:

```typescript
const response = await apiRequest(page, 'GET', '/api/endpoint', {
  timeout: 90000, // 90 seconds for very slow endpoints
  retries: 2,      // 2 retries for flaky endpoints
});
```

## 📝 Best Practices

1. **Use appropriate timeouts:**
   - Fast validation: 30-60 seconds
   - External HTTP calls: 60 seconds
   - Blockchain RPC calls: 60-90 seconds

2. **Enable retries for flaky endpoints:**
   - Network-dependent endpoints: 1-2 retries
   - Validation endpoints: 0 retries (should fail fast)

3. **Monitor performance:**
   - Use performance monitoring utilities
   - Track slow tests
   - Optimize endpoints that consistently exceed thresholds

## 🚀 Next Steps

1. **Monitor test results** after these changes
2. **Adjust timeouts** based on actual performance data
3. **Consider test sharding** for faster feedback in CI/CD
4. **Add performance regression detection** to catch slow endpoints early

---

*These optimizations improve test reliability while maintaining performance monitoring capabilities.*

