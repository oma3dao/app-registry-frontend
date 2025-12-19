/**
 * Test Performance Monitoring Utilities
 * 
 * Tracks test execution times, identifies slow tests, and provides
 * performance insights for optimization.
 */

import { Page } from '@playwright/test';

export interface TestPerformanceMetrics {
  testName: string;
  duration: number;
  category: 'fast' | 'normal' | 'slow' | 'very-slow';
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  fast: number;      // < 1s
  normal: number;     // < 5s
  slow: number;       // < 15s
  verySlow: number;  // < 60s
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fast: 1000,
  normal: 5000,
  slow: 15000,
  verySlow: 60000,
};

/**
 * Performance monitor for tracking test execution
 */
export class TestPerformanceMonitor {
  private metrics: TestPerformanceMetrics[] = [];
  private currentTestStartTime: number | null = null;
  private currentTestName: string | null = null;

  /**
   * Start tracking a test
   */
  startTest(testName: string): void {
    this.currentTestName = testName;
    this.currentTestStartTime = Date.now();
  }

  /**
   * End tracking a test and record metrics
   */
  endTest(metadata?: Record<string, any>): TestPerformanceMetrics | null {
    if (!this.currentTestStartTime || !this.currentTestName) {
      return null;
    }

    const duration = Date.now() - this.currentTestStartTime;
    const category = this.categorizeDuration(duration);

    const metric: TestPerformanceMetrics = {
      testName: this.currentTestName,
      duration,
      category,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    this.currentTestStartTime = null;
    this.currentTestName = null;

    return metric;
  }

  /**
   * Categorize test duration
   */
  private categorizeDuration(duration: number): 'fast' | 'normal' | 'slow' | 'very-slow' {
    if (duration < DEFAULT_THRESHOLDS.fast) return 'fast';
    if (duration < DEFAULT_THRESHOLDS.normal) return 'normal';
    if (duration < DEFAULT_THRESHOLDS.slow) return 'slow';
    return 'very-slow';
  }

  /**
   * Get all metrics
   */
  getMetrics(): TestPerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get slow tests (above normal threshold)
   */
  getSlowTests(threshold: PerformanceThresholds = DEFAULT_THRESHOLDS): TestPerformanceMetrics[] {
    return this.metrics.filter(m => m.duration >= threshold.normal);
  }

  /**
   * Get average test duration
   */
  getAverageDuration(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / this.metrics.length;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    total: number;
    average: number;
    fast: number;
    normal: number;
    slow: number;
    verySlow: number;
    slowestTests: TestPerformanceMetrics[];
  } {
    const slowestTests = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      total: this.metrics.length,
      average: this.getAverageDuration(),
      fast: this.metrics.filter(m => m.category === 'fast').length,
      normal: this.metrics.filter(m => m.category === 'normal').length,
      slow: this.metrics.filter(m => m.category === 'slow').length,
      verySlow: this.metrics.filter(m => m.category === 'very-slow').length,
      slowestTests,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.currentTestStartTime = null;
    this.currentTestName = null;
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new TestPerformanceMonitor();

/**
 * Measure page load performance
 */
export async function measurePageLoadPerformance(
  page: Page,
  url: string,
  options: {
    waitForNetworkIdle?: boolean;
    waitForReact?: boolean;
  } = {}
): Promise<{
  navigationTime: number;
  loadTime: number;
  domContentLoaded: number;
  networkIdle?: number;
  reactReady?: number;
}> {
  const startTime = Date.now();
  let domContentLoaded = 0;
  let loadTime = 0;
  let networkIdle: number | undefined;
  let reactReady: number | undefined;

  // Track navigation
  page.on('domcontentloaded', () => {
    domContentLoaded = Date.now() - startTime;
  });

  page.on('load', () => {
    loadTime = Date.now() - startTime;
  });

  // Navigate
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const navigationTime = Date.now() - startTime;

  // Wait for network idle if requested
  if (options.waitForNetworkIdle) {
    const networkStart = Date.now();
    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      networkIdle = Date.now() - networkStart;
    } catch {
      // Network might not be idle
    }
  }

  // Wait for React if requested
  if (options.waitForReact) {
    const reactStart = Date.now();
    try {
      await page.waitForSelector('nav, main, h1', { state: 'attached', timeout: 10000 });
      reactReady = Date.now() - reactStart;
    } catch {
      // React might not be ready
    }
  }

  return {
    navigationTime,
    loadTime,
    domContentLoaded,
    networkIdle,
    reactReady,
  };
}

/**
 * Measure API request performance
 */
export async function measureApiRequestPerformance<T>(
  requestFn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await requestFn();
  const duration = Date.now() - startTime;

  return { result, duration };
}

/**
 * Log performance metrics
 */
export function logPerformanceMetrics(metrics: TestPerformanceMetrics[]): void {
  if (metrics.length === 0) {
    console.log('No performance metrics to display');
    return;
  }

  const summary = {
    total: metrics.length,
    average: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
    fast: metrics.filter(m => m.duration < DEFAULT_THRESHOLDS.fast).length,
    normal: metrics.filter(m => m.duration >= DEFAULT_THRESHOLDS.fast && m.duration < DEFAULT_THRESHOLDS.normal).length,
    slow: metrics.filter(m => m.duration >= DEFAULT_THRESHOLDS.normal && m.duration < DEFAULT_THRESHOLDS.slow).length,
    verySlow: metrics.filter(m => m.duration >= DEFAULT_THRESHOLDS.slow).length,
  };

  console.log('\n📊 Test Performance Summary:');
  console.log(`  Total Tests: ${summary.total}`);
  console.log(`  Average Duration: ${summary.average.toFixed(2)}ms`);
  console.log(`  Fast (<1s): ${summary.fast}`);
  console.log(`  Normal (1-5s): ${summary.normal}`);
  console.log(`  Slow (5-15s): ${summary.slow}`);
  console.log(`  Very Slow (>15s): ${summary.verySlow}`);

  // Show slowest tests
  const slowest = [...metrics]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  if (slowest.length > 0) {
    console.log('\n🐌 Slowest Tests:');
    slowest.forEach((metric, index) => {
      console.log(`  ${index + 1}. ${metric.testName}: ${metric.duration}ms (${metric.category})`);
    });
  }
}

