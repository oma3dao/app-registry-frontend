/**
 * Test Metrics Collector
 * 
 * Collects and stores test execution metrics for historical analysis,
 * trend tracking, and reporting.
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/test-metrics-collector.ts [test-results/results.json]
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestMetrics {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  averageDuration: number;
  slowestTest: { name: string; duration: number; file: string };
  fastestTest: { name: string; duration: number; file: string };
  passRate: number;
  flakyTests: string[];
  testBreakdown: {
    file: string;
    tests: number;
    passed: number;
    failed: number;
    duration: number;
  }[];
}

interface MetricsHistory {
  metrics: TestMetrics[];
  summary: {
    totalRuns: number;
    averagePassRate: number;
    averageDuration: number;
    mostFlakyTests: Array<{ test: string; flakinessCount: number }>;
    slowestTests: Array<{ test: string; averageDuration: number }>;
  };
}

/**
 * Parse Playwright JSON results
 */
function parseTestResults(jsonPath: string): {
  timestamp: string;
  tests: Array<{
    test: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
  }>;
} {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Results file not found: ${jsonPath}`);
  }

  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content);
  const stats = fs.statSync(jsonPath);
  const timestamp = new Date(stats.mtimeMs).toISOString();

  const tests: Array<{
    test: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
  }> = [];

  if (data.suites) {
    for (const suite of data.suites) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const results = test.results || [];
          for (const result of results) {
            tests.push({
              test: `${spec.title} > ${test.title}`,
              file: spec.file || 'unknown',
              status: result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed',
              duration: result.duration || 0,
            });
          }
        }
      }
    }
  }

  return { timestamp, tests };
}

/**
 * Collect metrics from test results
 */
function collectMetrics(resultPath: string): TestMetrics {
  const { timestamp, tests } = parseTestResults(resultPath);

  const totalTests = tests.length;
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const skipped = tests.filter(t => t.status === 'skipped').length;
  const duration = tests.reduce((sum, t) => sum + t.duration, 0);
  const averageDuration = duration / (totalTests || 1);
  const passRate = (passed / (totalTests || 1)) * 100;

  // Find slowest and fastest tests
  const sortedByDuration = [...tests].sort((a, b) => b.duration - a.duration);
  const slowestTest = sortedByDuration[0] || { test: 'N/A', file: 'N/A', duration: 0 };
  const fastestTest = sortedByDuration[sortedByDuration.length - 1] || { test: 'N/A', file: 'N/A', duration: 0 };

  // Test breakdown by file
  const fileMap = new Map<string, { tests: number; passed: number; failed: number; duration: number }>();
  
  for (const test of tests) {
    const fileName = path.basename(test.file);
    if (!fileMap.has(fileName)) {
      fileMap.set(fileName, { tests: 0, passed: 0, failed: 0, duration: 0 });
    }
    const fileStats = fileMap.get(fileName)!;
    fileStats.tests++;
    if (test.status === 'passed') fileStats.passed++;
    if (test.status === 'failed') fileStats.failed++;
    fileStats.duration += test.duration;
  }

  const testBreakdown = Array.from(fileMap.entries()).map(([file, stats]) => ({
    file,
    ...stats,
  }));

  // Flaky tests (simplified - would need history for accurate detection)
  const flakyTests: string[] = [];

  return {
    timestamp,
    totalTests,
    passed,
    failed,
    skipped,
    duration: Math.round(duration),
    averageDuration: Math.round(averageDuration),
    slowestTest: {
      name: slowestTest.test,
      duration: Math.round(slowestTest.duration),
      file: path.basename(slowestTest.file),
    },
    fastestTest: {
      name: fastestTest.test,
      duration: Math.round(fastestTest.duration),
      file: path.basename(fastestTest.file),
    },
    passRate: Math.round(passRate * 100) / 100,
    flakyTests,
    testBreakdown,
  };
}

/**
 * Load metrics history
 */
function loadMetricsHistory(): MetricsHistory {
  const metricsPath = path.join(__dirname, 'test-metrics-history.json');
  
  if (!fs.existsSync(metricsPath)) {
    return {
      metrics: [],
      summary: {
        totalRuns: 0,
        averagePassRate: 0,
        averageDuration: 0,
        mostFlakyTests: [],
        slowestTests: [],
      },
    };
  }

  const content = fs.readFileSync(metricsPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Save metrics to history
 */
function saveMetrics(metrics: TestMetrics): void {
  const history = loadMetricsHistory();
  
  // Add new metrics
  history.metrics.push(metrics);
  
  // Keep only last 100 runs
  if (history.metrics.length > 100) {
    history.metrics = history.metrics.slice(-100);
  }

  // Update summary
  const totalRuns = history.metrics.length;
  const averagePassRate = history.metrics.reduce((sum, m) => sum + m.passRate, 0) / totalRuns;
  const averageDuration = history.metrics.reduce((sum, m) => sum + m.averageDuration, 0) / totalRuns;

  // Calculate most flaky tests (simplified)
  const testFlakiness = new Map<string, number>();
  for (const metric of history.metrics) {
    for (const flaky of metric.flakyTests) {
      testFlakiness.set(flaky, (testFlakiness.get(flaky) || 0) + 1);
    }
  }

  const mostFlakyTests = Array.from(testFlakiness.entries())
    .map(([test, count]) => ({ test, flakinessCount: count }))
    .sort((a, b) => b.flakinessCount - a.flakinessCount)
    .slice(0, 10);

  // Calculate slowest tests
  const testDurations = new Map<string, number[]>();
  for (const metric of history.metrics) {
    for (const breakdown of metric.testBreakdown) {
      if (!testDurations.has(breakdown.file)) {
        testDurations.set(breakdown.file, []);
      }
      testDurations.get(breakdown.file)!.push(breakdown.duration / breakdown.tests);
    }
  }

  const slowestTests = Array.from(testDurations.entries())
    .map(([test, durations]) => ({
      test,
      averageDuration: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
    }))
    .sort((a, b) => b.averageDuration - a.averageDuration)
    .slice(0, 10);

  history.summary = {
    totalRuns,
    averagePassRate: Math.round(averagePassRate * 100) / 100,
    averageDuration: Math.round(averageDuration),
    mostFlakyTests,
    slowestTests,
  };

  // Save to file
  const metricsPath = path.join(__dirname, 'test-metrics-history.json');
  fs.writeFileSync(metricsPath, JSON.stringify(history, null, 2));
}

/**
 * Format metrics report
 */
function formatMetricsReport(metrics: TestMetrics, history: MetricsHistory): string {
  let output = '\n📊 Test Metrics Report\n';
  output += '='.repeat(50) + '\n\n';

  // Current run metrics
  output += '📈 Current Run:\n';
  output += `  Timestamp: ${new Date(metrics.timestamp).toLocaleString()}\n`;
  output += `  Total Tests: ${metrics.totalTests}\n`;
  output += `  Passed: ${metrics.passed} (${metrics.passRate}%)\n`;
  output += `  Failed: ${metrics.failed}\n`;
  output += `  Skipped: ${metrics.skipped}\n`;
  output += `  Total Duration: ${metrics.duration}ms (${(metrics.duration / 1000).toFixed(2)}s)\n`;
  output += `  Average Duration: ${metrics.averageDuration}ms\n`;
  output += `  Slowest Test: ${metrics.slowestTest.name} (${metrics.slowestTest.file}) - ${metrics.slowestTest.duration}ms\n`;
  output += `  Fastest Test: ${metrics.fastestTest.name} (${metrics.fastestTest.file}) - ${metrics.fastestTest.duration}ms\n\n`;

  // Historical summary
  if (history.summary.totalRuns > 0) {
    output += '📊 Historical Summary:\n';
    output += `  Total Runs: ${history.summary.totalRuns}\n`;
    output += `  Average Pass Rate: ${history.summary.averagePassRate}%\n`;
    output += `  Average Duration: ${history.summary.averageDuration}ms\n\n`;

    if (history.summary.mostFlakyTests.length > 0) {
      output += '⚠️  Most Flaky Tests:\n';
      history.summary.mostFlakyTests.forEach((item, index) => {
        output += `  ${index + 1}. ${item.test} (${item.flakinessCount} occurrences)\n`;
      });
      output += '\n';
    }

    if (history.summary.slowestTests.length > 0) {
      output += '🐌 Slowest Tests (Average):\n';
      history.summary.slowestTests.forEach((item, index) => {
        output += `  ${index + 1}. ${item.test} - ${item.averageDuration}ms\n`;
      });
      output += '\n';
    }
  }

  // Test breakdown by file
  output += '📁 Test Breakdown by File:\n';
  metrics.testBreakdown
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .forEach(breakdown => {
      const passRate = (breakdown.passed / breakdown.tests) * 100;
      output += `  ${breakdown.file}:\n`;
      output += `    Tests: ${breakdown.tests} | Passed: ${breakdown.passed} | Failed: ${breakdown.failed}\n`;
      output += `    Duration: ${breakdown.duration}ms | Pass Rate: ${passRate.toFixed(1)}%\n`;
    });
  output += '\n';

  return output;
}

/**
 * Collect and save metrics
 */
export function collectAndSaveMetrics(resultPath: string): TestMetrics {
  console.log('📊 Collecting test metrics...\n');

  const metrics = collectMetrics(resultPath);
  saveMetrics(metrics);

  const history = loadMetricsHistory();
  console.log(formatMetricsReport(metrics, history));

  return metrics;
}

// Run if executed directly
if (require.main === module) {
  const resultPath = process.argv[2] || path.join(__dirname, '..', '..', 'test-results', 'results.json');
  
  try {
    const metrics = collectAndSaveMetrics(resultPath);
    
    // Write report to file
    const history = loadMetricsHistory();
    const outputPath = path.join(__dirname, 'TEST_METRICS.md');
    fs.writeFileSync(outputPath, formatMetricsReport(metrics, history));
    console.log(`\n📄 Metrics saved to: test-metrics-history.json\n`);
    console.log(`📄 Report saved to: ${outputPath}\n`);
  } catch (error) {
    console.error(`❌ Error collecting metrics: ${error}`);
    process.exit(1);
  }
}

