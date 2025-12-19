/**
 * Test Health Check Script
 * 
 * Analyzes test suite health by checking for:
 * - Unused utilities
 * - Duplicate code patterns
 * - Outdated patterns (waitForTimeout, etc.)
 * - Missing best practices
 * - Test organization issues
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/test-health-check.ts
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface HealthCheckResult {
  unusedUtilities: string[];
  duplicatePatterns: Array<{ pattern: string; files: string[]; count: number }>;
  outdatedPatterns: Array<{ pattern: string; file: string; line: number }>;
  missingBestPractices: Array<{ file: string; issue: string }>;
  testOrganization: {
    totalTests: number;
    totalFiles: number;
    averageTestsPerFile: number;
    filesWithManyTests: string[];
    filesWithFewTests: string[];
  };
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs-improvement';
  score: number;
}

/**
 * Get all test files
 */
function getTestFiles(): string[] {
  const testDir = path.join(__dirname);
  const files: string[] = [];

  function walkDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(testDir);
  return files;
}

/**
 * Get all utility files
 */
function getUtilityFiles(): string[] {
  const testDir = path.join(__dirname);
  const files: string[] = [];
  const utilityFiles = [
    'test-helpers.ts',
    'wait-utilities.ts',
    'test-performance.ts',
    'test-data-factories.ts',
    'mock-utilities.ts',
    'test-environment.ts',
    'test-cleanup.ts',
    'test-isolation.ts',
    'test-debugging.ts',
    'test-fixtures.ts',
    'test-retry-strategies.ts',
    'test-validation.ts',
  ];

  for (const file of utilityFiles) {
    const fullPath = path.join(testDir, file);
    if (fs.existsSync(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract exported functions from a file
 */
function extractExports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exports: string[] = [];

  // Match export function/const/class declarations
  const patterns = [
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+const\s+(\w+)/g,
    /export\s+class\s+(\w+)/g,
    /export\s+enum\s+(\w+)/g,
    /export\s+interface\s+(\w+)/g,
    /export\s+type\s+(\w+)/g,
    /export\s*\{\s*([^}]+)\s*\}/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        // Handle named exports from object
        const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
        exports.push(...names);
      }
    }
  }

  return [...new Set(exports)];
}

/**
 * Check for unused utilities
 */
function checkUnusedUtilities(): string[] {
  const utilityFiles = getUtilityFiles();
  const testFiles = getTestFiles();
  const unused: string[] = [];

  for (const utilFile of utilityFiles) {
    const exports = extractExports(utilFile);
    const utilName = path.basename(utilFile, '.ts');

    for (const exportName of exports) {
      let isUsed = false;

      for (const testFile of testFiles) {
        const content = fs.readFileSync(testFile, 'utf-8');
        
        // Check for import or usage
        if (
          content.includes(exportName) ||
          content.includes(`from './${utilName}'`) ||
          content.includes(`from '../${utilName}'`) ||
          content.includes(`from './test-helpers'`)
        ) {
          isUsed = true;
          break;
        }
      }

      if (!isUsed && exportName !== 'default') {
        unused.push(`${utilName}.${exportName}`);
      }
    }
  }

  return unused;
}

/**
 * Check for duplicate code patterns
 */
function checkDuplicatePatterns(): Array<{ pattern: string; files: string[]; count: number }> {
  const testFiles = getTestFiles();
  const duplicates: Array<{ pattern: string; files: string[]; count: number }> = [];
  const patternCounts = new Map<string, Set<string>>();

  // Common duplicate patterns
  const patterns = [
    /await\s+page\.goto\([^)]+\)/g,
    /await\s+page\.waitForSelector\([^)]+\)/g,
    /await\s+page\.click\([^)]+\)/g,
    /await\s+setupTestPage\([^)]+\)/g,
  ];

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8');
    const fileName = path.basename(testFile);

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 3) {
        const patternKey = pattern.source;
        if (!patternCounts.has(patternKey)) {
          patternCounts.set(patternKey, new Set());
        }
        patternCounts.get(patternKey)!.add(fileName);
      }
    }
  }

  for (const [pattern, files] of patternCounts.entries()) {
    if (files.size > 1) {
      duplicates.push({
        pattern: pattern.replace(/[\\^$.*+?()[\]{}|]/g, ''),
        files: Array.from(files),
        count: files.size,
      });
    }
  }

  return duplicates;
}

/**
 * Check for outdated patterns
 */
function checkOutdatedPatterns(): Array<{ pattern: string; file: string; line: number }> {
  const testFiles = getTestFiles();
  const outdated: Array<{ pattern: string; file: string; line: number }> = [];

  const outdatedPatterns = [
    { pattern: /waitForTimeout\(/g, name: 'waitForTimeout' },
    { pattern: /page\.waitForTimeout\(/g, name: 'page.waitForTimeout' },
    { pattern: /\.wait\([0-9]+\)/g, name: 'arbitrary wait' },
  ];

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8');
    const lines = content.split('\n');
    const fileName = path.basename(testFile);

    for (const { pattern, name } of outdatedPatterns) {
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          outdated.push({
            pattern: name,
            file: fileName,
            line: index + 1,
          });
        }
      });
    }
  }

  return outdated;
}

/**
 * Check for missing best practices
 */
function checkMissingBestPractices(): Array<{ file: string; issue: string }> {
  const testFiles = getTestFiles();
  const issues: Array<{ file: string; issue: string }> = [];

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8');
    const fileName = path.basename(testFile);

    // Check for test descriptions
    if (!content.includes('test(') && !content.includes("test('")) {
      // No tests found, skip
      continue;
    }

    // Check for performance monitoring
    if (!content.includes('performanceMonitor') && content.includes('test.describe')) {
      issues.push({
        file: fileName,
        issue: 'Missing performance monitoring',
      });
    }

    // Check for proper error handling
    // Note: try-finally is valid (we use it for cleanup), only flag try without finally or catch
    if (content.includes('try') && !content.includes('catch') && !content.includes('finally')) {
      issues.push({
        file: fileName,
        issue: 'Incomplete try-catch block',
      });
    }

    // Check for test isolation
    if (content.includes('test(') && !content.includes('beforeEach') && !content.includes('ensureTestIsolation')) {
      issues.push({
        file: fileName,
        issue: 'Missing test isolation setup',
      });
    }
  }

  return issues;
}

/**
 * Analyze test organization
 */
function analyzeTestOrganization(): {
  totalTests: number;
  totalFiles: number;
  averageTestsPerFile: number;
  filesWithManyTests: string[];
  filesWithFewTests: string[];
} {
  const testFiles = getTestFiles();
  let totalTests = 0;
  const testCounts: Array<{ file: string; count: number }> = [];

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8');
    const testMatches = content.match(/test\(/g);
    const count = testMatches ? testMatches.length : 0;
    totalTests += count;
    testCounts.push({
      file: path.basename(testFile),
      count,
    });
  }

  const averageTestsPerFile = totalTests / testFiles.length;
  const filesWithManyTests = testCounts
    .filter(t => t.count > 15)
    .map(t => t.file);
  const filesWithFewTests = testCounts
    .filter(t => t.count < 3 && t.count > 0)
    .map(t => t.file);

  return {
    totalTests,
    totalFiles: testFiles.length,
    averageTestsPerFile: Math.round(averageTestsPerFile * 100) / 100,
    filesWithManyTests,
    filesWithFewTests,
  };
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(result: Omit<HealthCheckResult, 'overallHealth' | 'score'>): {
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs-improvement';
  score: number;
} {
  let score = 100;

  // Deduct points for issues
  score -= result.unusedUtilities.length * 2;
  score -= result.duplicatePatterns.length * 3;
  score -= result.outdatedPatterns.length * 5;
  score -= result.missingBestPractices.length * 3;

  // Bonus for good organization
  if (result.testOrganization.averageTestsPerFile >= 5 && result.testOrganization.averageTestsPerFile <= 10) {
    score += 5;
  }

  // Determine health level
  let overallHealth: 'excellent' | 'good' | 'fair' | 'needs-improvement';
  if (score >= 90) {
    overallHealth = 'excellent';
  } else if (score >= 75) {
    overallHealth = 'good';
  } else if (score >= 60) {
    overallHealth = 'fair';
  } else {
    overallHealth = 'needs-improvement';
  }

  return { overallHealth, score: Math.max(0, Math.min(100, score)) };
}

/**
 * Run health check
 */
export function runHealthCheck(): HealthCheckResult {
  console.log('🔍 Running test suite health check...\n');

  const unusedUtilities = checkUnusedUtilities();
  const duplicatePatterns = checkDuplicatePatterns();
  const outdatedPatterns = checkOutdatedPatterns();
  const missingBestPractices = checkMissingBestPractices();
  const testOrganization = analyzeTestOrganization();

  const result: Omit<HealthCheckResult, 'overallHealth' | 'score'> = {
    unusedUtilities,
    duplicatePatterns,
    outdatedPatterns,
    missingBestPractices,
    testOrganization,
  };

  const { overallHealth, score } = calculateHealthScore(result);

  return {
    ...result,
    overallHealth,
    score,
  };
}

/**
 * Format and display health check results
 */
function formatHealthCheckResults(result: HealthCheckResult): string {
  let output = '\n📊 Test Suite Health Check Results\n';
  output += '='.repeat(50) + '\n\n';

  output += `Overall Health: ${result.overallHealth.toUpperCase()} (Score: ${result.score}/100)\n\n`;

  // Test Organization
  output += '📁 Test Organization:\n';
  output += `  Total Tests: ${result.testOrganization.totalTests}\n`;
  output += `  Total Files: ${result.testOrganization.totalFiles}\n`;
  output += `  Average Tests per File: ${result.testOrganization.averageTestsPerFile}\n`;
  if (result.testOrganization.filesWithManyTests.length > 0) {
    output += `  ⚠️  Files with many tests (>15): ${result.testOrganization.filesWithManyTests.join(', ')}\n`;
  }
  if (result.testOrganization.filesWithFewTests.length > 0) {
    output += `  ⚠️  Files with few tests (<3): ${result.testOrganization.filesWithFewTests.join(', ')}\n`;
  }
  output += '\n';

  // Unused Utilities
  if (result.unusedUtilities.length > 0) {
    output += `⚠️  Unused Utilities (${result.unusedUtilities.length}):\n`;
    result.unusedUtilities.slice(0, 10).forEach(util => {
      output += `  - ${util}\n`;
    });
    if (result.unusedUtilities.length > 10) {
      output += `  ... and ${result.unusedUtilities.length - 10} more\n`;
    }
    output += '\n';
  } else {
    output += '✅ No unused utilities found\n\n';
  }

  // Duplicate Patterns
  if (result.duplicatePatterns.length > 0) {
    output += `⚠️  Duplicate Patterns (${result.duplicatePatterns.length}):\n`;
    result.duplicatePatterns.forEach(dup => {
      output += `  - ${dup.pattern}: found in ${dup.count} files\n`;
    });
    output += '\n';
  } else {
    output += '✅ No duplicate patterns found\n\n';
  }

  // Outdated Patterns
  if (result.outdatedPatterns.length > 0) {
    output += `⚠️  Outdated Patterns (${result.outdatedPatterns.length}):\n`;
    const grouped = result.outdatedPatterns.reduce((acc, item) => {
      if (!acc[item.pattern]) acc[item.pattern] = [];
      acc[item.pattern].push(item);
      return acc;
    }, {} as Record<string, typeof result.outdatedPatterns>);

    for (const [pattern, items] of Object.entries(grouped)) {
      output += `  - ${pattern}: ${items.length} occurrences\n`;
      items.slice(0, 3).forEach(item => {
        output += `    ${item.file}:${item.line}\n`;
      });
      if (items.length > 3) {
        output += `    ... and ${items.length - 3} more\n`;
      }
    }
    output += '\n';
  } else {
    output += '✅ No outdated patterns found\n\n';
  }

  // Missing Best Practices
  if (result.missingBestPractices.length > 0) {
    output += `⚠️  Missing Best Practices (${result.missingBestPractices.length}):\n`;
    result.missingBestPractices.slice(0, 10).forEach(issue => {
      output += `  - ${issue.file}: ${issue.issue}\n`;
    });
    if (result.missingBestPractices.length > 10) {
      output += `  ... and ${result.missingBestPractices.length - 10} more\n`;
    }
    output += '\n';
  } else {
    output += '✅ Best practices followed\n\n';
  }

  return output;
}

// Run if executed directly
if (require.main === module) {
  const result = runHealthCheck();
  console.log(formatHealthCheckResults(result));

  // Write to file
  const outputPath = path.join(__dirname, 'TEST_HEALTH_CHECK.md');
  fs.writeFileSync(outputPath, formatHealthCheckResults(result));
  console.log(`\n📄 Results saved to: ${outputPath}\n`);

  // Exit with appropriate code
  process.exit(result.score >= 75 ? 0 : 1);
}

