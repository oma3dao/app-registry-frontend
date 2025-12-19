/**
 * Test Trend Analysis
 * 
 * Analyzes test execution trends over time to identify:
 * - Performance regressions
 * - Pass rate trends
 * - Flakiness trends
 * - Test suite growth
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/test-trend-analysis.ts [test-results-directory]
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestTrend {
  test: string;
  file: string;
  trends: {
    passRate: Array<{ date: string; value: number }>;
    duration: Array<{ date: string; value: number }>;
    flakiness: Array<{ date: string; value: number }>;
  };
  regression: {
    performance: boolean;
    reliability: boolean;
  };
}

interface TrendSummary {
  overallPassRate: Array<{ date: string; value: number }>;
  averageDuration: Array<{ date: string; value: number }>;
  totalTests: Array<{ date: string; value: number }>;
  flakyTests: Array<{ date: string; value: number }>;
  performanceRegressions: string[];
  reliabilityRegressions: string[];
}

/**
 * Find all result files in directory
 */
function findResultFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  function walkDir(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name === 'results.json' || entry.name.endsWith('.json')) {
        const stats = fs.statSync(fullPath);
        // Only include files modified in last 30 days
        const daysSinceModified = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (daysSinceModified <= 30) {
          files.push(fullPath);
        }
      }
    }
  }

  walkDir(dir);
  
  // Sort by modification time (newest first)
  return files.sort((a, b) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtimeMs - statA.mtimeMs;
  });
}

/**
 * Parse test results from JSON file
 */
function parseTestResults(jsonPath: string): {
  date: string;
  tests: Array<{
    test: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
  }>;
} {
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content);
  const stats = fs.statSync(jsonPath);
  const date = new Date(stats.mtimeMs).toISOString().split('T')[0];

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

  return { date, tests };
}

/**
 * Analyze trends
 */
function analyzeTrends(resultFiles: string[]): {
  testTrends: Map<string, TestTrend>;
  summary: TrendSummary;
} {
  const testTrends = new Map<string, TestTrend>();
  const summary: TrendSummary = {
    overallPassRate: [],
    averageDuration: [],
    totalTests: [],
    flakyTests: [],
    performanceRegressions: [],
    reliabilityRegressions: [],
  };

  // Group results by date
  const resultsByDate = new Map<string, Array<ReturnType<typeof parseTestResults>>>();

  for (const file of resultFiles) {
    try {
      const result = parseTestResults(file);
      if (!resultsByDate.has(result.date)) {
        resultsByDate.set(result.date, []);
      }
      resultsByDate.get(result.date)!.push(result);
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${file}: ${error}`);
    }
  }

  // Analyze each date
  const dates = Array.from(resultsByDate.keys()).sort();

  for (const date of dates) {
    const results = resultsByDate.get(date)!;
    const allTests: Array<{ test: string; file: string; status: string; duration: number }> = [];

    for (const result of results) {
      allTests.push(...result.tests);
    }

    // Calculate overall metrics
    const passed = allTests.filter(t => t.status === 'passed').length;
    const total = allTests.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const avgDuration = allTests.reduce((sum, t) => sum + t.duration, 0) / (total || 1);
    const flaky = allTests.filter(t => t.status === 'failed' || t.status === 'passed').length > 0 ? 
      allTests.filter(t => t.status === 'failed').length : 0;

    summary.overallPassRate.push({ date, value: Math.round(passRate) });
    summary.averageDuration.push({ date, value: Math.round(avgDuration) });
    summary.totalTests.push({ date, value: total });
    summary.flakyTests.push({ date, value: flaky });

    // Track individual test trends
    const testMap = new Map<string, Array<{ status: string; duration: number }>>();

    for (const test of allTests) {
      const key = `${test.file}::${test.test}`;
      if (!testMap.has(key)) {
        testMap.set(key, []);
      }
      testMap.get(key)!.push({ status: test.status, duration: test.duration });
    }

    for (const [key, executions] of testMap.entries()) {
      if (!testTrends.has(key)) {
        const [file, test] = key.split('::');
        testTrends.set(key, {
          test,
          file: path.basename(file),
          trends: {
            passRate: [],
            duration: [],
            flakiness: [],
          },
          regression: {
            performance: false,
            reliability: false,
          },
        });
      }

      const trend = testTrends.get(key)!;
      const passCount = executions.filter(e => e.status === 'passed').length;
      const passRate = (passCount / executions.length) * 100;
      const avgDuration = executions.reduce((sum, e) => sum + e.duration, 0) / executions.length;
      const flakiness = passCount > 0 && executions.some(e => e.status === 'failed') ? 50 : passRate < 80 ? 30 : 0;

      trend.trends.passRate.push({ date, value: Math.round(passRate) });
      trend.trends.duration.push({ date, value: Math.round(avgDuration) });
      trend.trends.flakiness.push({ date, value: flakiness });
    }
  }

  // Detect regressions
  for (const [key, trend] of testTrends.entries()) {
    const durationTrend = trend.trends.duration;
    if (durationTrend.length >= 2) {
      const recent = durationTrend.slice(-3);
      const older = durationTrend.slice(0, -3);
      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;
        if (recentAvg > olderAvg * 1.5) { // 50% slower
          trend.regression.performance = true;
          summary.performanceRegressions.push(key);
        }
      }
    }

    const passRateTrend = trend.trends.passRate;
    if (passRateTrend.length >= 2) {
      const recent = passRateTrend.slice(-3);
      const older = passRateTrend.slice(0, -3);
      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
        const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;
        if (recentAvg < olderAvg - 20) { // 20% drop in pass rate
          trend.regression.reliability = true;
          summary.reliabilityRegressions.push(key);
        }
      }
    }
  }

  return { testTrends, summary };
}

/**
 * Format trend analysis results
 */
function formatTrendResults(
  testTrends: Map<string, TestTrend>,
  summary: TrendSummary
): string {
  let output = '\n📊 Test Trend Analysis\n';
  output += '='.repeat(50) + '\n\n';

  // Overall trends
  output += '📈 Overall Trends:\n';
  if (summary.overallPassRate.length > 0) {
    const latest = summary.overallPassRate[summary.overallPassRate.length - 1];
    const previous = summary.overallPassRate.length > 1 ? 
      summary.overallPassRate[summary.overallPassRate.length - 2] : null;
    
    output += `  Pass Rate: ${latest.value}%`;
    if (previous) {
      const change = latest.value - previous.value;
      output += ` (${change >= 0 ? '+' : ''}${change}% from previous)\n`;
    } else {
      output += '\n';
    }
  }

  if (summary.averageDuration.length > 0) {
    const latest = summary.averageDuration[summary.averageDuration.length - 1];
    const previous = summary.averageDuration.length > 1 ? 
      summary.averageDuration[summary.averageDuration.length - 2] : null;
    
    output += `  Average Duration: ${latest.value}ms`;
    if (previous) {
      const change = latest.value - previous.value;
      output += ` (${change >= 0 ? '+' : ''}${change}ms from previous)\n`;
    } else {
      output += '\n';
    }
  }

  output += `  Total Tests: ${summary.totalTests[summary.totalTests.length - 1]?.value || 0}\n`;
  output += `  Flaky Tests: ${summary.flakyTests[summary.flakyTests.length - 1]?.value || 0}\n\n`;

  // Regressions
  if (summary.performanceRegressions.length > 0) {
    output += `⚠️  Performance Regressions (${summary.performanceRegressions.length}):\n`;
    summary.performanceRegressions.slice(0, 10).forEach(key => {
      const [file, test] = key.split('::');
      output += `  - ${test} (${path.basename(file)})\n`;
    });
    if (summary.performanceRegressions.length > 10) {
      output += `  ... and ${summary.performanceRegressions.length - 10} more\n`;
    }
    output += '\n';
  }

  if (summary.reliabilityRegressions.length > 0) {
    output += `⚠️  Reliability Regressions (${summary.reliabilityRegressions.length}):\n`;
    summary.reliabilityRegressions.slice(0, 10).forEach(key => {
      const [file, test] = key.split('::');
      output += `  - ${test} (${path.basename(file)})\n`;
    });
    if (summary.reliabilityRegressions.length > 10) {
      output += `  ... and ${summary.reliabilityRegressions.length - 10} more\n`;
    }
    output += '\n';
  }

  if (summary.performanceRegressions.length === 0 && summary.reliabilityRegressions.length === 0) {
    output += '✅ No regressions detected!\n\n';
  }

  return output;
}

/**
 * Run trend analysis
 */
export function analyzeTrendsFromResults(resultDir?: string): {
  testTrends: Map<string, TestTrend>;
  summary: TrendSummary;
} {
  console.log('📊 Analyzing test trends...\n');

  const dir = resultDir || path.join(__dirname, '..', '..', 'test-results');
  const resultFiles = findResultFiles(dir);

  if (resultFiles.length === 0) {
    console.warn('⚠️  No test result files found. Run tests multiple times to generate trend data.');
    return {
      testTrends: new Map(),
      summary: {
        overallPassRate: [],
        averageDuration: [],
        totalTests: [],
        flakyTests: [],
        performanceRegressions: [],
        reliabilityRegressions: [],
      },
    };
  }

  console.log(`📊 Analyzing ${resultFiles.length} result file(s)...\n`);

  return analyzeTrends(resultFiles);
}

// Run if executed directly
if (require.main === module) {
  const resultDir = process.argv[2];
  const { testTrends, summary } = analyzeTrendsFromResults(resultDir);

  console.log(formatTrendResults(testTrends, summary));

  // Write to file
  const outputPath = path.join(__dirname, 'TEST_TRENDS.md');
  fs.writeFileSync(outputPath, formatTrendResults(testTrends, summary));
  console.log(`\n📄 Results saved to: ${outputPath}\n`);
}

