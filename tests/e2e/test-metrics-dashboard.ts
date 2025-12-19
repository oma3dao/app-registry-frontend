/**
 * Test Metrics Dashboard Generator
 * 
 * Generates an HTML dashboard for visualizing test suite metrics over time,
 * including health scores, performance trends, coverage, and flakiness.
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/test-metrics-dashboard.ts
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface DashboardData {
  healthScores: Array<{ date: string; score: number }>;
  testCounts: Array<{ date: string; total: number; passed: number; failed: number }>;
  performance: Array<{ date: string; averageDuration: number; slowestTest: string }>;
  coverage: Array<{ date: string; coverage: number }>;
  flakyTests: Array<{ test: string; flakinessRate: number }>;
  summary: {
    currentHealthScore: number;
    totalTests: number;
    averagePassRate: number;
    averageDuration: number;
    mostFlakyTest: string;
  };
}

/**
 * Load health check history
 */
function loadHealthCheckHistory(): Array<{ date: string; score: number }> {
  const reportsDir = path.join(__dirname, 'maintenance-reports');
  const healthScores: Array<{ date: string; score: number }> = [];

  if (!fs.existsSync(reportsDir)) {
    return healthScores;
  }

  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('health-check-') && f.endsWith('.md'))
    .sort();

  for (const file of files) {
    const filePath = path.join(reportsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const scoreMatch = content.match(/Overall Health: (EXCELLENT|GOOD|NEEDS-IMPROVEMENT|POOR) \(Score: (\d+)\/100\)/);
    
    if (scoreMatch) {
      const date = file.replace('health-check-', '').replace('.md', '');
      const score = parseInt(scoreMatch[2], 10);
      healthScores.push({ date, score });
    }
  }

  return healthScores;
}

/**
 * Load metrics history
 */
function loadMetricsHistory(): Array<{ date: string; total: number; passed: number; failed: number; averageDuration: number; slowestTest: string }> {
  const metricsPath = path.join(__dirname, 'test-metrics-history.json');
  
  if (!fs.existsSync(metricsPath)) {
    return [];
  }

  const content = fs.readFileSync(metricsPath, 'utf-8');
  const history = JSON.parse(content);

  return history.metrics?.slice(-30).map((m: any) => ({
    date: m.timestamp?.split('T')[0] || '',
    total: m.totalTests || 0,
    passed: m.passed || 0,
    failed: m.failed || 0,
    averageDuration: m.averageDuration || 0,
    slowestTest: m.slowestTest?.name || 'N/A',
  })) || [];
}

/**
 * Load coverage history
 */
function loadCoverageHistory(): Array<{ date: string; coverage: number }> {
  const reportsDir = path.join(__dirname, 'maintenance-reports');
  const coverage: Array<{ date: string; coverage: number }> = [];

  if (!fs.existsSync(reportsDir)) {
    return coverage;
  }

  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('coverage-report-') && f.endsWith('.md'))
    .sort();

  for (const file of files) {
    const filePath = path.join(reportsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const totalMatch = content.match(/Total Tests:\s*(\d+)/);
    
    if (totalMatch) {
      const date = file.replace('coverage-report-', '').replace('.md', '');
      const totalTests = parseInt(totalMatch[1], 10);
      // Estimate coverage based on test count (simplified)
      const coverage = Math.min(100, (totalTests / 200) * 100);
      coverage.push({ date, coverage });
    }
  }

  return coverage;
}

/**
 * Get current health score
 */
function getCurrentHealthScore(): number {
  const healthCheckPath = path.join(__dirname, 'TEST_HEALTH_CHECK.md');
  
  if (!fs.existsSync(healthCheckPath)) {
    return 0;
  }

  const content = fs.readFileSync(healthCheckPath, 'utf-8');
  const match = content.match(/Overall Health:.*?Score: (\d+)\/100/);
  
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Get flaky tests from metrics
 */
function getFlakyTests(): Array<{ test: string; flakinessRate: number }> {
  const metricsPath = path.join(__dirname, 'test-metrics-history.json');
  
  if (!fs.existsSync(metricsPath)) {
    return [];
  }

  const content = fs.readFileSync(metricsPath, 'utf-8');
  const history = JSON.parse(content);

  return history.summary?.mostFlakyTests?.slice(0, 10) || [];
}

/**
 * Generate dashboard data
 */
function generateDashboardData(): DashboardData {
  const healthScores = loadHealthCheckHistory();
  const testCounts = loadMetricsHistory();
  const coverage = loadCoverageHistory();
  const flakyTests = getFlakyTests();
  const currentHealthScore = getCurrentHealthScore();

  const latestMetrics = testCounts[testCounts.length - 1] || { total: 0, passed: 0, failed: 0, averageDuration: 0, slowestTest: 'N/A' };
  const averagePassRate = testCounts.length > 0
    ? testCounts.reduce((sum, m) => sum + (m.passed / m.total), 0) / testCounts.length * 100
    : 0;

  return {
    healthScores,
    testCounts,
    performance: testCounts.map(m => ({
      date: m.date,
      averageDuration: m.averageDuration,
      slowestTest: m.slowestTest,
    })),
    coverage,
    flakyTests,
    summary: {
      currentHealthScore,
      totalTests: latestMetrics.total,
      averagePassRate,
      averageDuration: latestMetrics.averageDuration,
      mostFlakyTest: flakyTests[0]?.test || 'N/A',
    },
  };
}

/**
 * Generate HTML dashboard
 */
function generateHTMLDashboard(data: DashboardData): string {
  const healthScoresJson = JSON.stringify(data.healthScores);
  const testCountsJson = JSON.stringify(data.testCounts);
  const performanceJson = JSON.stringify(data.performance);
  const coverageJson = JSON.stringify(data.coverage);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Suite Metrics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    
    h1 {
      color: #2563eb;
      margin-bottom: 10px;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .summary-card h3 {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 10px;
    }
    
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
    }
    
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .chart-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .chart-card h2 {
      color: #2563eb;
      margin-bottom: 20px;
      font-size: 20px;
    }
    
    .chart-container {
      position: relative;
      height: 300px;
    }
    
    .flaky-tests {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .flaky-tests h2 {
      color: #2563eb;
      margin-bottom: 20px;
    }
    
    .flaky-test-item {
      padding: 10px;
      border-left: 4px solid #ef4444;
      margin-bottom: 10px;
      background: #fef2f2;
    }
    
    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    
    .timestamp {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Test Suite Metrics Dashboard</h1>
      <p>Comprehensive overview of test suite health, performance, and trends</p>
      <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    </header>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Health Score</h3>
        <div class="value">${data.summary.currentHealthScore}/100</div>
      </div>
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${data.summary.totalTests}</div>
      </div>
      <div class="summary-card">
        <h3>Average Pass Rate</h3>
        <div class="value">${data.summary.averagePassRate.toFixed(1)}%</div>
      </div>
      <div class="summary-card">
        <h3>Avg Duration</h3>
        <div class="value">${(data.summary.averageDuration / 1000).toFixed(1)}s</div>
      </div>
    </div>
    
    <div class="charts">
      <div class="chart-card">
        <h2>Health Score Trend</h2>
        <div class="chart-container">
          <canvas id="healthChart"></canvas>
        </div>
      </div>
      
      <div class="chart-card">
        <h2>Test Count Trend</h2>
        <div class="chart-container">
          <canvas id="testCountChart"></canvas>
        </div>
      </div>
      
      <div class="chart-card">
        <h2>Performance Trend</h2>
        <div class="chart-container">
          <canvas id="performanceChart"></canvas>
        </div>
      </div>
      
      <div class="chart-card">
        <h2>Coverage Trend</h2>
        <div class="chart-container">
          <canvas id="coverageChart"></canvas>
        </div>
      </div>
    </div>
    
    <div class="flaky-tests">
      <h2>Most Flaky Tests</h2>
      ${data.flakyTests.length > 0 
        ? data.flakyTests.map(t => `
          <div class="flaky-test-item">
            <strong>${t.test}</strong>
            <div>Flakiness Rate: ${t.flakinessRate.toFixed(1)}%</div>
          </div>
        `).join('')
        : '<div class="no-data">No flaky test data available</div>'
      }
    </div>
  </div>
  
  <script>
    const healthScores = ${healthScoresJson};
    const testCounts = ${testCountsJson};
    const performance = ${performanceJson};
    const coverage = ${coverageJson};
    
    // Health Score Chart
    new Chart(document.getElementById('healthChart'), {
      type: 'line',
      data: {
        labels: healthScores.map(d => d.date),
        datasets: [{
          label: 'Health Score',
          data: healthScores.map(d => d.score),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });
    
    // Test Count Chart
    new Chart(document.getElementById('testCountChart'), {
      type: 'line',
      data: {
        labels: testCounts.map(d => d.date),
        datasets: [
          {
            label: 'Total',
            data: testCounts.map(d => d.total),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.4
          },
          {
            label: 'Passed',
            data: testCounts.map(d => d.passed),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
          },
          {
            label: 'Failed',
            data: testCounts.map(d => d.failed),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
    
    // Performance Chart
    new Chart(document.getElementById('performanceChart'), {
      type: 'line',
      data: {
        labels: performance.map(d => d.date),
        datasets: [{
          label: 'Average Duration (ms)',
          data: performance.map(d => d.averageDuration),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
    
    // Coverage Chart
    new Chart(document.getElementById('coverageChart'), {
      type: 'line',
      data: {
        labels: coverage.map(d => d.date),
        datasets: [{
          label: 'Coverage %',
          data: coverage.map(d => d.coverage),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Main execution
 */
function main() {
  console.log('📊 Generating test metrics dashboard...\n');

  try {
    const data = generateDashboardData();
    const html = generateHTMLDashboard(data);
    
    const outputPath = path.join(__dirname, 'TEST_METRICS_DASHBOARD.html');
    fs.writeFileSync(outputPath, html);
    
    console.log('✅ Dashboard generated successfully!');
    console.log(`📄 Location: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`  Health Score: ${data.summary.currentHealthScore}/100`);
    console.log(`  Total Tests: ${data.summary.totalTests}`);
    console.log(`  Average Pass Rate: ${data.summary.averagePassRate.toFixed(1)}%`);
    console.log(`  Average Duration: ${(data.summary.averageDuration / 1000).toFixed(1)}s`);
    console.log(`\n💡 Open ${outputPath} in your browser to view the dashboard.`);
  } catch (error: any) {
    console.error('❌ Error generating dashboard:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateDashboardData, generateHTMLDashboard };

