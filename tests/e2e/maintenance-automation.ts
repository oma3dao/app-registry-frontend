/**
 * Test Suite Maintenance Automation
 * 
 * This script automates regular maintenance tasks for the Playwright test suite:
 * - Health checks
 * - Performance monitoring
 * - Coverage reports
 * - Trend analysis
 * 
 * Usage:
 *   npx tsx tests/e2e/maintenance-automation.ts [task]
 * 
 * Tasks:
 *   health       - Run health check
 *   coverage     - Generate coverage report
 *   performance  - Analyze performance metrics
 *   all          - Run all maintenance tasks
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TASKS = {
  health: 'Run health check',
  coverage: 'Generate coverage report',
  performance: 'Analyze performance metrics',
  all: 'Run all maintenance tasks',
} as const;

type Task = keyof typeof TASKS;

interface MaintenanceResult {
  task: string;
  success: boolean;
  output?: string;
  error?: string;
  timestamp: string;
}

class MaintenanceAutomation {
  private results: MaintenanceResult[] = [];
  private outputDir = path.join(__dirname, 'maintenance-reports');

  constructor() {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Run health check
   */
  async runHealthCheck(): Promise<MaintenanceResult> {
    console.log('🔍 Running health check...');
    const timestamp = new Date().toISOString();
    
    try {
      const output = execSync('npm run test:e2e:health', {
        encoding: 'utf-8',
        cwd: path.join(__dirname, '..', '..'),
      });

      const result: MaintenanceResult = {
        task: 'health',
        success: true,
        output: output,
        timestamp,
      };

      // Save health check report
      const healthCheckPath = path.join(__dirname, 'TEST_HEALTH_CHECK.md');
      if (fs.existsSync(healthCheckPath)) {
        const reportContent = fs.readFileSync(healthCheckPath, 'utf-8');
        const reportPath = path.join(
          this.outputDir,
          `health-check-${new Date().toISOString().split('T')[0]}.md`
        );
        fs.writeFileSync(reportPath, reportContent);
        console.log(`✅ Health check report saved to: ${reportPath}`);
      }

      this.results.push(result);
      return result;
    } catch (error: any) {
      const result: MaintenanceResult = {
        task: 'health',
        success: false,
        error: error.message,
        timestamp,
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport(): Promise<MaintenanceResult> {
    console.log('📊 Generating coverage report...');
    const timestamp = new Date().toISOString();
    
    try {
      const output = execSync('npm run test:e2e:coverage', {
        encoding: 'utf-8',
        cwd: path.join(__dirname, '..', '..'),
      });

      const result: MaintenanceResult = {
        task: 'coverage',
        success: true,
        output: output,
        timestamp,
      };

      // Save coverage report
      const coveragePath = path.join(__dirname, 'COVERAGE_REPORT.md');
      if (fs.existsSync(coveragePath)) {
        const reportContent = fs.readFileSync(coveragePath, 'utf-8');
        const reportPath = path.join(
          this.outputDir,
          `coverage-report-${new Date().toISOString().split('T')[0]}.md`
        );
        fs.writeFileSync(reportPath, reportContent);
        console.log(`✅ Coverage report saved to: ${reportPath}`);
      }

      this.results.push(result);
      return result;
    } catch (error: any) {
      const result: MaintenanceResult = {
        task: 'coverage',
        success: false,
        error: error.message,
        timestamp,
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Analyze performance metrics
   */
  async analyzePerformance(): Promise<MaintenanceResult> {
    console.log('⚡ Analyzing performance metrics...');
    const timestamp = new Date().toISOString();
    
    try {
      // Run tests and capture performance summaries
      const output = execSync('npm run test:e2e 2>&1 | grep -A 10 "Performance Summary" || true', {
        encoding: 'utf-8',
        cwd: path.join(__dirname, '..', '..'),
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      });

      const result: MaintenanceResult = {
        task: 'performance',
        success: true,
        output: output || 'No performance summaries found. Run tests to generate metrics.',
        timestamp,
      };

      // Save performance analysis
      const performancePath = path.join(
        this.outputDir,
        `performance-analysis-${new Date().toISOString().split('T')[0]}.txt`
      );
      fs.writeFileSync(performancePath, result.output);
      console.log(`✅ Performance analysis saved to: ${performancePath}`);

      this.results.push(result);
      return result;
    } catch (error: any) {
      const result: MaintenanceResult = {
        task: 'performance',
        success: false,
        error: error.message,
        timestamp,
      };
      this.results.push(result);
      return result;
    }
  }

  /**
   * Run all maintenance tasks
   */
  async runAll(): Promise<void> {
    console.log('🚀 Running all maintenance tasks...\n');
    
    await this.runHealthCheck();
    console.log('');
    
    await this.generateCoverageReport();
    console.log('');
    
    await this.analyzePerformance();
    console.log('');

    this.generateSummary();
  }

  /**
   * Generate summary report
   */
  private generateSummary(): void {
    const summary = {
      timestamp: new Date().toISOString(),
      tasks: this.results,
      summary: {
        total: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
      },
    };

    const summaryPath = path.join(
      this.outputDir,
      `maintenance-summary-${new Date().toISOString().split('T')[0]}.json`
    );
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('📋 Maintenance Summary:');
    console.log(`  Total Tasks: ${summary.summary.total}`);
    console.log(`  Successful: ${summary.summary.successful}`);
    console.log(`  Failed: ${summary.summary.failed}`);
    console.log(`\n📄 Summary saved to: ${summaryPath}`);
  }

  /**
   * Get results
   */
  getResults(): MaintenanceResult[] {
    return this.results;
  }
}

// Main execution
async function main() {
  const task = (process.argv[2] || 'all') as Task;

  if (!TASKS[task]) {
    console.error(`❌ Unknown task: ${task}`);
    console.log('\nAvailable tasks:');
    Object.entries(TASKS).forEach(([key, desc]) => {
      console.log(`  ${key.padEnd(12)} - ${desc}`);
    });
    process.exit(1);
  }

  const automation = new MaintenanceAutomation();

  console.log(`\n🎯 Running task: ${task} - ${TASKS[task]}\n`);

  switch (task) {
    case 'health':
      await automation.runHealthCheck();
      break;
    case 'coverage':
      await automation.generateCoverageReport();
      break;
    case 'performance':
      await automation.analyzePerformance();
      break;
    case 'all':
      await automation.runAll();
      break;
  }

  const results = automation.getResults();
  const failed = results.filter(r => !r.success);

  if (failed.length > 0) {
    console.log('\n⚠️  Some tasks failed:');
    failed.forEach(r => {
      console.log(`  - ${r.task}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All maintenance tasks completed successfully!');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error running maintenance automation:', error);
    process.exit(1);
  });
}

export { MaintenanceAutomation, TASKS };

