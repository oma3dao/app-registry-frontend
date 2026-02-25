/**
 * Test Execution Analytics
 * 
 * Analyzes test execution data to provide insights on:
 * - Test execution times
 * - Test flakiness
 * - Slow tests
 * - Test dependencies
 * - Execution patterns
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestExecutionData {
  file: string;
  testName: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped';
  retries?: number;
  tags?: string[];
}

interface ExecutionAnalytics {
  totalTests: number;
  totalDuration: number;
  averageDuration: number;
  slowTests: TestExecutionData[];
  fastTests: TestExecutionData[];
  flakyTests: TestExecutionData[];
  testsByTag: Record<string, TestExecutionData[]>;
  testsByFile: Record<string, TestExecutionData[]>;
  executionPatterns: {
    slowestFile: string;
    fastestFile: string;
    mostFlakyFile: string;
    averageTestsPerFile: number;
  };
}

/**
 * Parse Playwright JSON test results
 */
function parseTestResults(jsonPath: string): TestExecutionData[] {
  if (!fs.existsSync(jsonPath)) {
    console.warn(`Test results file not found: ${jsonPath}`);
    return [];
  }

  const content = fs.readFileSync(jsonPath, 'utf-8');
  const results = JSON.parse(content);

  const testData: TestExecutionData[] = [];

  results.suites?.forEach((suite: any) => {
    suite.specs?.forEach((spec: any) => {
      spec.tests?.forEach((test: any) => {
        const testName = test.title;
        const file = spec.file || 'unknown';
        const results = test.results || [];
        
        // Get the last result (after retries)
        const lastResult = results[results.length - 1];
        if (!lastResult) return;

        const duration = lastResult.duration || 0;
        const status = lastResult.status === 'passed' ? 'passed' :
                      lastResult.status === 'failed' ? 'failed' : 'skipped';
        const retries = results.length > 1 ? results.length - 1 : 0;

        // Extract tags from test name
        const tags: string[] = [];
        const tagMatch = testName.match(/@(\w+)/g);
        if (tagMatch) {
          tags.push(...tagMatch.map(t => t.substring(1)));
        }

        testData.push({
          file: path.basename(file),
          testName,
          duration,
          status,
          retries,
          tags,
        });
      });
    });
  });

  return testData;
}

/**
 * Analyze test execution data
 */
function analyzeExecution(testData: TestExecutionData[]): ExecutionAnalytics {
  const totalTests = testData.length;
  const totalDuration = testData.reduce((sum, test) => sum + test.duration, 0);
  const averageDuration = totalDuration / totalTests || 0;

  // Identify slow tests (>5 seconds)
  const slowTests = testData
    .filter(test => test.duration > 5000)
    .sort((a, b) => b.duration - a.duration);

  // Identify fast tests (<1 second)
  const fastTests = testData
    .filter(test => test.duration < 1000)
    .sort((a, b) => a.duration - b.duration);

  // Identify flaky tests (had retries)
  const flakyTests = testData
    .filter(test => test.retries && test.retries > 0)
    .sort((a, b) => (b.retries || 0) - (a.retries || 0));

  // Group tests by tag
  const testsByTag: Record<string, TestExecutionData[]> = {};
  testData.forEach(test => {
    test.tags?.forEach(tag => {
      if (!testsByTag[tag]) {
        testsByTag[tag] = [];
      }
      testsByTag[tag].push(test);
    });
  });

  // Group tests by file
  const testsByFile: Record<string, TestExecutionData[]> = {};
  testData.forEach(test => {
    if (!testsByFile[test.file]) {
      testsByFile[test.file] = [];
    }
    testsByFile[test.file].push(test);
  });

  // Calculate file-level metrics
  const fileMetrics = Object.entries(testsByFile).map(([file, tests]) => {
    const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);
    const retries = tests.reduce((sum, t) => sum + (t.retries || 0), 0);
    return {
      file,
      totalDuration,
      testCount: tests.length,
      retries,
    };
  });

  const slowestFile = fileMetrics.sort((a, b) => b.totalDuration - a.totalDuration)[0]?.file || 'unknown';
  const fastestFile = fileMetrics.sort((a, b) => a.totalDuration - b.totalDuration)[0]?.file || 'unknown';
  const mostFlakyFile = fileMetrics.sort((a, b) => b.retries - a.retries)[0]?.file || 'unknown';
  const averageTestsPerFile = totalTests / Object.keys(testsByFile).length || 0;

  return {
    totalTests,
    totalDuration,
    averageDuration,
    slowTests,
    fastTests,
    flakyTests,
    testsByTag,
    testsByFile,
    executionPatterns: {
      slowestFile,
      fastestFile,
      mostFlakyFile,
      averageTestsPerFile,
    },
  };
}

/**
 * Format analytics as markdown report
 */
function formatAnalytics(analytics: ExecutionAnalytics): string {
  let markdown = `# Test Execution Analytics\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total Tests:** ${analytics.totalTests}\n`;
  markdown += `- **Total Duration:** ${(analytics.totalDuration / 1000).toFixed(2)}s\n`;
  markdown += `- **Average Duration:** ${(analytics.averageDuration / 1000).toFixed(2)}s\n`;
  markdown += `- **Slow Tests:** ${analytics.slowTests.length}\n`;
  markdown += `- **Fast Tests:** ${analytics.fastTests.length}\n`;
  markdown += `- **Flaky Tests:** ${analytics.flakyTests.length}\n\n`;

  // Execution Patterns
  markdown += `## Execution Patterns\n\n`;
  markdown += `- **Slowest File:** ${analytics.executionPatterns.slowestFile}\n`;
  markdown += `- **Fastest File:** ${analytics.executionPatterns.fastestFile}\n`;
  markdown += `- **Most Flaky File:** ${analytics.executionPatterns.mostFlakyFile}\n`;
  markdown += `- **Average Tests Per File:** ${analytics.executionPatterns.averageTestsPerFile.toFixed(1)}\n\n`;

  // Slow Tests
  if (analytics.slowTests.length > 0) {
    markdown += `## 🐌 Slow Tests (>5s)\n\n`;
    markdown += `| Test | File | Duration | Status |\n`;
    markdown += `|------|------|----------|--------|\n`;
    analytics.slowTests.slice(0, 20).forEach(test => {
      markdown += `| ${test.testName} | ${test.file} | ${(test.duration / 1000).toFixed(2)}s | ${test.status} |\n`;
    });
    markdown += `\n`;
  }

  // Flaky Tests
  if (analytics.flakyTests.length > 0) {
    markdown += `## ⚠️ Flaky Tests (Had Retries)\n\n`;
    markdown += `| Test | File | Retries | Duration | Status |\n`;
    markdown += `|------|------|---------|----------|--------|\n`;
    analytics.flakyTests.forEach(test => {
      markdown += `| ${test.testName} | ${test.file} | ${test.retries} | ${(test.duration / 1000).toFixed(2)}s | ${test.status} |\n`;
    });
    markdown += `\n`;
  }

  // Tests by Tag
  if (Object.keys(analytics.testsByTag).length > 0) {
    markdown += `## Tests by Tag\n\n`;
    markdown += `| Tag | Count | Avg Duration |\n`;
    markdown += `|-----|-------|--------------|\n`;
    Object.entries(analytics.testsByTag).forEach(([tag, tests]) => {
      const avgDuration = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;
      markdown += `| @${tag} | ${tests.length} | ${(avgDuration / 1000).toFixed(2)}s |\n`;
    });
    markdown += `\n`;
  }

  // Tests by File
  markdown += `## Tests by File\n\n`;
  markdown += `| File | Tests | Total Duration | Avg Duration |\n`;
  markdown += `|------|-------|----------------|--------------|\n`;
  Object.entries(analytics.testsByFile)
    .sort((a, b) => b[1].reduce((sum, t) => sum + t.duration, 0) - a[1].reduce((sum, t) => sum + t.duration, 0))
    .forEach(([file, tests]) => {
      const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);
      const avgDuration = totalDuration / tests.length;
      markdown += `| ${file} | ${tests.length} | ${(totalDuration / 1000).toFixed(2)}s | ${(avgDuration / 1000).toFixed(2)}s |\n`;
    });

  return markdown;
}

/**
 * Generate execution analytics report
 */
function generateAnalyticsReport(jsonPath: string = 'test-results/results.json'): ExecutionAnalytics | null {
  console.log('📊 Analyzing test execution data...\n');

  const testData = parseTestResults(jsonPath);
  
  if (testData.length === 0) {
    console.warn('⚠️  No test data found. Run tests first to generate analytics.');
    return null;
  }

  const analytics = analyzeExecution(testData);
  const markdown = formatAnalytics(analytics);

  // Write report
  const reportPath = path.join(__dirname, 'EXECUTION_ANALYTICS.md');
  fs.writeFileSync(reportPath, markdown);

  console.log('✅ Analytics report generated:', reportPath);
  console.log('\n📊 Summary:');
  console.log(`  Total Tests: ${analytics.totalTests}`);
  console.log(`  Total Duration: ${(analytics.totalDuration / 1000).toFixed(2)}s`);
  console.log(`  Average Duration: ${(analytics.averageDuration / 1000).toFixed(2)}s`);
  console.log(`  Slow Tests: ${analytics.slowTests.length}`);
  console.log(`  Flaky Tests: ${analytics.flakyTests.length}`);

  if (analytics.slowTests.length > 0) {
    console.log('\n🐌 Top 5 Slow Tests:');
    analytics.slowTests.slice(0, 5).forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.testName} (${(test.duration / 1000).toFixed(2)}s)`);
    });
  }

  return analytics;
}

// Main execution
if (require.main === module) {
  const jsonPath = process.argv[2] || 'test-results/results.json';
  generateAnalyticsReport(jsonPath);
}

export { generateAnalyticsReport, analyzeExecution, parseTestResults };

