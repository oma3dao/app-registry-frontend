/**
 * Flaky Test Detector
 * 
 * Analyzes test execution history to identify flaky tests
 * (tests that pass and fail intermittently).
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/flaky-test-detector.ts [test-results/results.json]
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestExecution {
  test: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  timestamp: string;
}

interface FlakyTest {
  test: string;
  file: string;
  passRate: number;
  totalRuns: number;
  passCount: number;
  failCount: number;
  averageDuration: number;
  lastStatus: 'passed' | 'failed';
  flakinessScore: number; // 0-100, higher = more flaky
}

/**
 * Parse Playwright JSON results
 */
function parseTestResults(jsonPath: string): TestExecution[] {
  if (!fs.existsSync(jsonPath)) {
    console.warn(`⚠️  Results file not found: ${jsonPath}`);
    return [];
  }

  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content);

  const executions: TestExecution[] = [];

  if (data.suites) {
    for (const suite of data.suites) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          const results = test.results || [];
          for (const result of results) {
            executions.push({
              test: `${spec.title} > ${test.title}`,
              file: spec.file || 'unknown',
              status: result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed',
              duration: result.duration || 0,
              timestamp: new Date(result.startTime || Date.now()).toISOString(),
            });
          }
        }
      }
    }
  }

  return executions;
}

/**
 * Analyze test history from multiple result files
 */
function analyzeTestHistory(resultFiles: string[]): Map<string, TestExecution[]> {
  const testHistory = new Map<string, TestExecution[]>();

  for (const file of resultFiles) {
    const executions = parseTestResults(file);
    for (const exec of executions) {
      const key = `${exec.file}::${exec.test}`;
      if (!testHistory.has(key)) {
        testHistory.set(key, []);
      }
      testHistory.get(key)!.push(exec);
    }
  }

  return testHistory;
}

/**
 * Detect flaky tests
 */
function detectFlakyTests(
  testHistory: Map<string, TestExecution[]>,
  minRuns: number = 3,
  flakinessThreshold: number = 0.8 // Tests with <80% pass rate are considered flaky
): FlakyTest[] {
  const flakyTests: FlakyTest[] = [];

  for (const [key, executions] of testHistory.entries()) {
    if (executions.length < minRuns) {
      continue; // Not enough data
    }

    const [file, test] = key.split('::');
    const passCount = executions.filter(e => e.status === 'passed').length;
    const failCount = executions.filter(e => e.status === 'failed').length;
    const totalRuns = executions.length;
    const passRate = passCount / totalRuns;

    // Calculate flakiness score
    // Higher score = more flaky (inconsistent results)
    const consistency = Math.abs(passRate - 0.5) * 2; // 0-1, where 1 is consistent
    const flakinessScore = (1 - consistency) * 100;

    // Consider flaky if:
    // 1. Pass rate is between 20% and 80% (inconsistent)
    // 2. Or has both passes and failures
    const isFlaky = (passRate < flakinessThreshold && passRate > 0.2) || (passCount > 0 && failCount > 0);

    if (isFlaky || flakinessScore > 30) {
      const averageDuration = executions.reduce((sum, e) => sum + e.duration, 0) / executions.length;
      const lastExecution = executions[executions.length - 1];

      flakyTests.push({
        test,
        file: path.basename(file),
        passRate: Math.round(passRate * 100),
        totalRuns,
        passCount,
        failCount,
        averageDuration: Math.round(averageDuration),
        lastStatus: lastExecution.status,
        flakinessScore: Math.round(flakinessScore),
      });
    }
  }

  // Sort by flakiness score (most flaky first)
  return flakyTests.sort((a, b) => b.flakinessScore - a.flakinessScore);
}

/**
 * Find result files in directory
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
        files.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

/**
 * Format flaky test results
 */
function formatFlakyTestResults(flakyTests: FlakyTest[]): string {
  let output = '\n🔍 Flaky Test Detection Results\n';
  output += '='.repeat(50) + '\n\n';

  if (flakyTests.length === 0) {
    output += '✅ No flaky tests detected!\n\n';
    return output;
  }

  output += `Found ${flakyTests.length} potentially flaky tests:\n\n`;

  // Group by flakiness score
  const critical = flakyTests.filter(t => t.flakinessScore >= 70);
  const high = flakyTests.filter(t => t.flakinessScore >= 50 && t.flakinessScore < 70);
  const medium = flakyTests.filter(t => t.flakinessScore >= 30 && t.flakinessScore < 50);

  if (critical.length > 0) {
    output += '🔴 Critical Flakiness (Score ≥70):\n';
    critical.forEach(test => {
      output += `  - ${test.test}\n`;
      output += `    File: ${test.file}\n`;
      output += `    Pass Rate: ${test.passRate}% (${test.passCount}/${test.totalRuns})\n`;
      output += `    Flakiness Score: ${test.flakinessScore}\n`;
      output += `    Avg Duration: ${test.averageDuration}ms\n`;
      output += `    Last Status: ${test.lastStatus}\n\n`;
    });
  }

  if (high.length > 0) {
    output += '🟡 High Flakiness (Score 50-69):\n';
    high.slice(0, 10).forEach(test => {
      output += `  - ${test.test} (${test.file}) - ${test.passRate}% pass rate, Score: ${test.flakinessScore}\n`;
    });
    if (high.length > 10) {
      output += `  ... and ${high.length - 10} more\n`;
    }
    output += '\n';
  }

  if (medium.length > 0) {
    output += '🟠 Medium Flakiness (Score 30-49):\n';
    output += `  Found ${medium.length} tests with moderate flakiness\n\n`;
  }

  // Recommendations
  output += '💡 Recommendations:\n';
  output += '  1. Review flaky tests and add retry logic\n';
  output += '  2. Use wait utilities instead of arbitrary timeouts\n';
  output += '  3. Ensure proper test isolation\n';
  output += '  4. Check for race conditions\n';
  output += '  5. Consider using test fixtures for setup\n\n';

  return output;
}

/**
 * Run flaky test detection
 */
export function detectFlakyTestsFromResults(
  resultPaths: string[],
  minRuns: number = 3,
  flakinessThreshold: number = 0.8
): FlakyTest[] {
  console.log('🔍 Detecting flaky tests...\n');

  // If no paths provided, search for result files
  if (resultPaths.length === 0) {
    const testResultsDir = path.join(__dirname, '..', '..', 'test-results');
    const resultsDir = path.join(__dirname, '..', '..', 'playwright-report');
    
    resultPaths.push(...findResultFiles(testResultsDir));
    resultPaths.push(...findResultFiles(resultsDir));
  }

  if (resultPaths.length === 0) {
    console.warn('⚠️  No test result files found. Run tests first to generate results.');
    return [];
  }

  console.log(`📊 Analyzing ${resultPaths.length} result file(s)...\n`);

  const testHistory = analyzeTestHistory(resultPaths);
  const flakyTests = detectFlakyTests(testHistory, minRuns, flakinessThreshold);

  return flakyTests;
}

// Run if executed directly
if (require.main === module) {
  const resultPaths = process.argv.slice(2);
  const flakyTests = detectFlakyTestsFromResults(resultPaths);

  console.log(formatFlakyTestResults(flakyTests));

  // Write to file
  const outputPath = path.join(__dirname, 'FLAKY_TESTS.md');
  fs.writeFileSync(outputPath, formatFlakyTestResults(flakyTests));
  console.log(`\n📄 Results saved to: ${outputPath}\n`);
}

