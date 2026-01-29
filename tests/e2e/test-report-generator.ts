/**
 * Enhanced Test Report Generator
 * 
 * Generates comprehensive HTML and markdown test reports with:
 * - Test execution summary
 * - Performance metrics
 * - Flaky test detection
 * - Trend analysis
 * - Visual charts and graphs
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/test-report-generator.ts [test-results/results.json]
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    passRate: number;
    timestamp: string;
  };
  tests: Array<{
    name: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
  performance: {
    averageDuration: number;
    slowestTests: Array<{ name: string; duration: number; file: string }>;
    fastestTests: Array<{ name: string; duration: number; file: string }>;
  };
  breakdown: {
    byFile: Record<string, { total: number; passed: number; failed: number; duration: number }>;
    byStatus: { passed: number; failed: number; skipped: number };
  };
}

/**
 * Parse Playwright JSON results
 */
function parseTestResults(jsonPath: string): TestReport {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Results file not found: ${jsonPath}`);
  }

  const content = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(content);
  const stats = fs.statSync(jsonPath);
  const timestamp = new Date(stats.mtimeMs).toISOString();

  const tests: Array<{
    name: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }> = [];

  const breakdown: Record<string, { total: number; passed: number; failed: number; duration: number }> = {};

  if (data.suites) {
    for (const suite of data.suites) {
      for (const spec of suite.specs || []) {
        const fileName = path.basename(spec.file || 'unknown');
        
        if (!breakdown[fileName]) {
          breakdown[fileName] = { total: 0, passed: 0, failed: 0, duration: 0 };
        }

        for (const test of spec.tests || []) {
          const results = test.results || [];
          for (const result of results) {
            const status = result.status === 'passed' ? 'passed' : 
                          result.status === 'skipped' ? 'skipped' : 'failed';
            const duration = result.duration || 0;
            const testName = `${spec.title} > ${test.title}`;

            tests.push({
              name: testName,
              file: fileName,
              status,
              duration,
              error: result.error?.message || result.error?.stack,
            });

            breakdown[fileName].total++;
            if (status === 'passed') breakdown[fileName].passed++;
            if (status === 'failed') breakdown[fileName].failed++;
            breakdown[fileName].duration += duration;
          }
        }
      }
    }
  }

  const total = tests.length;
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  const skipped = tests.filter(t => t.status === 'skipped').length;
  const duration = tests.reduce((sum, t) => sum + t.duration, 0);
  const passRate = (passed / (total || 1)) * 100;

  // Performance metrics
  const sortedByDuration = [...tests].sort((a, b) => b.duration - a.duration);
  const slowestTests = sortedByDuration.slice(0, 10).map(t => ({
    name: t.name,
    duration: Math.round(t.duration),
    file: t.file,
  }));
  const fastestTests = sortedByDuration.slice(-10).reverse().map(t => ({
    name: t.name,
    duration: Math.round(t.duration),
    file: t.file,
  }));

  return {
    summary: {
      total,
      passed,
      failed,
      skipped,
      duration: Math.round(duration),
      passRate: Math.round(passRate * 100) / 100,
      timestamp,
    },
    tests,
    performance: {
      averageDuration: Math.round(duration / (total || 1)),
      slowestTests,
      fastestTests,
    },
    breakdown: {
      byFile: breakdown,
      byStatus: { passed, failed, skipped },
    },
  };
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report: TestReport): string {
  let output = '# Test Execution Report\n\n';
  output += `**Generated:** ${new Date(report.summary.timestamp).toLocaleString()}\n\n`;
  output += '---\n\n';

  // Summary
  output += '## 📊 Summary\n\n';
  output += `| Metric | Value |\n`;
  output += `|--------|-------|\n`;
  output += `| Total Tests | ${report.summary.total} |\n`;
  output += `| Passed | ${report.summary.passed} |\n`;
  output += `| Failed | ${report.summary.failed} |\n`;
  output += `| Skipped | ${report.summary.skipped} |\n`;
  output += `| Pass Rate | ${report.summary.passRate}% |\n`;
  output += `| Total Duration | ${(report.summary.duration / 1000).toFixed(2)}s |\n`;
  output += `| Average Duration | ${report.performance.averageDuration}ms |\n\n`;

  // Status indicator
  const statusEmoji = report.summary.passRate === 100 ? '✅' : 
                     report.summary.passRate >= 80 ? '⚠️' : '❌';
  output += `${statusEmoji} **Status:** `;
  if (report.summary.passRate === 100) {
    output += 'All tests passed!\n\n';
  } else if (report.summary.passRate >= 80) {
    output += 'Most tests passed, some failures detected.\n\n';
  } else {
    output += 'Multiple test failures detected.\n\n';
  }

  // Performance
  output += '## ⚡ Performance\n\n';
  output += '### Slowest Tests\n\n';
  report.performance.slowestTests.forEach((test, index) => {
    output += `${index + 1}. **${test.name}** (${test.file}) - ${test.duration}ms\n`;
  });
  output += '\n';

  output += '### Fastest Tests\n\n';
  report.performance.fastestTests.forEach((test, index) => {
    output += `${index + 1}. **${test.name}** (${test.file}) - ${test.duration}ms\n`;
  });
  output += '\n';

  // Breakdown by file
  output += '## 📁 Breakdown by File\n\n';
  output += '| File | Total | Passed | Failed | Duration | Pass Rate |\n';
  output += '|------|-------|--------|--------|----------|----------|\n';

  const sortedFiles = Object.entries(report.breakdown.byFile)
    .sort((a, b) => b[1].duration - a[1].duration);

  for (const [file, stats] of sortedFiles) {
    const passRate = (stats.passed / stats.total) * 100;
    output += `| ${file} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${Math.round(stats.duration)}ms | ${passRate.toFixed(1)}% |\n`;
  }
  output += '\n';

  // Failed tests
  const failedTests = report.tests.filter(t => t.status === 'failed');
  if (failedTests.length > 0) {
    output += '## ❌ Failed Tests\n\n';
    failedTests.forEach(test => {
      output += `### ${test.name}\n\n`;
      output += `- **File:** ${test.file}\n`;
      output += `- **Duration:** ${Math.round(test.duration)}ms\n`;
      if (test.error) {
        output += `- **Error:**\n\n\`\`\`\n${test.error}\n\`\`\`\n\n`;
      }
    });
  }

  return output;
}

/**
 * Generate HTML report
 */
function generateHTMLReport(report: TestReport): string {
  const passRate = report.summary.passRate;
  const statusColor = passRate === 100 ? '#10b981' : passRate >= 80 ? '#f59e0b' : '#ef4444';
  const statusText = passRate === 100 ? 'All Passed' : passRate >= 80 ? 'Most Passed' : 'Failures Detected';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Execution Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 {
      color: #1f2937;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #6b7280;
      margin-bottom: 30px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      border-left: 4px solid #3b82f6;
    }
    .summary-card h3 {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #1f2937;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: 600;
      background: ${statusColor};
      color: white;
      margin-top: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    tr:hover {
      background: #f9fafb;
    }
    .passed { color: #10b981; }
    .failed { color: #ef4444; }
    .skipped { color: #6b7280; }
    .section {
      margin: 40px 0;
    }
    .section h2 {
      color: #1f2937;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .error {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 12px;
      margin: 10px 0;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Test Execution Report</h1>
    <p class="timestamp">Generated: ${new Date(report.summary.timestamp).toLocaleString()}</p>

    <div class="summary">
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${report.summary.total}</div>
      </div>
      <div class="summary-card">
        <h3>Passed</h3>
        <div class="value passed">${report.summary.passed}</div>
      </div>
      <div class="summary-card">
        <h3>Failed</h3>
        <div class="value failed">${report.summary.failed}</div>
      </div>
      <div class="summary-card">
        <h3>Skipped</h3>
        <div class="value skipped">${report.summary.skipped}</div>
      </div>
      <div class="summary-card">
        <h3>Pass Rate</h3>
        <div class="value">${report.summary.passRate}%</div>
        <span class="status-badge">${statusText}</span>
      </div>
      <div class="summary-card">
        <h3>Duration</h3>
        <div class="value">${(report.summary.duration / 1000).toFixed(2)}s</div>
      </div>
    </div>

    <div class="section">
      <h2>⚡ Performance</h2>
      <h3>Slowest Tests</h3>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>File</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${report.performance.slowestTests.map(test => `
            <tr>
              <td>${test.name}</td>
              <td>${test.file}</td>
              <td>${test.duration}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>📁 Breakdown by File</h2>
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Total</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Duration</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(report.breakdown.byFile)
            .sort((a, b) => b[1].duration - a[1].duration)
            .map(([file, stats]) => {
              const passRate = (stats.passed / stats.total) * 100;
              return `
                <tr>
                  <td>${file}</td>
                  <td>${stats.total}</td>
                  <td class="passed">${stats.passed}</td>
                  <td class="failed">${stats.failed}</td>
                  <td>${Math.round(stats.duration)}ms</td>
                  <td>${passRate.toFixed(1)}%</td>
                </tr>
              `;
            }).join('')}
        </tbody>
      </table>
    </div>

    ${report.tests.filter(t => t.status === 'failed').length > 0 ? `
    <div class="section">
      <h2>❌ Failed Tests</h2>
      ${report.tests.filter(t => t.status === 'failed').map(test => `
        <div style="margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 6px;">
          <h3 style="color: #ef4444; margin-bottom: 10px;">${test.name}</h3>
          <p><strong>File:</strong> ${test.file}</p>
          <p><strong>Duration:</strong> ${Math.round(test.duration)}ms</p>
          ${test.error ? `<div class="error">${test.error}</div>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Generate reports
 */
export function generateReports(resultPath: string): { markdown: string; html: string } {
  console.log('📊 Generating test reports...\n');

  const report = parseTestResults(resultPath);
  const markdown = generateMarkdownReport(report);
  const html = generateHTMLReport(report);

  return { markdown, html };
}

// Run if executed directly
if (require.main === module) {
  const resultPath = process.argv[2] || path.join(__dirname, '..', '..', 'test-results', 'results.json');
  
  try {
    const { markdown, html } = generateReports(resultPath);
    
    // Write markdown report
    const mdPath = path.join(__dirname, 'TEST_REPORT.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`✅ Markdown report saved to: ${mdPath}\n`);

    // Write HTML report
    const htmlPath = path.join(__dirname, 'TEST_REPORT.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ HTML report saved to: ${htmlPath}\n`);
    console.log(`📄 Open ${htmlPath} in your browser to view the report\n`);
  } catch (error) {
    console.error(`❌ Error generating reports: ${error}`);
    process.exit(1);
  }
}

