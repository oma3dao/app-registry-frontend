/**
 * Test Dependency Checker
 * 
 * Checks for outdated dependencies, missing dependencies,
 * and compatibility issues in the test suite.
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/test-dependency-checker.ts
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface DependencyIssue {
  package: string;
  currentVersion: string;
  latestVersion?: string;
  issue: 'outdated' | 'missing' | 'incompatible' | 'deprecated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

interface DependencyCheckResult {
  outdated: DependencyIssue[];
  missing: DependencyIssue[];
  incompatible: DependencyIssue[];
  deprecated: DependencyIssue[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs-improvement';
  score: number;
}

/**
 * Read package.json
 */
function readPackageJson(): { dependencies: Record<string, string>; devDependencies: Record<string, string> } {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  const data = JSON.parse(content);
  
  return {
    dependencies: data.dependencies || {},
    devDependencies: data.devDependencies || {},
  };
}

/**
 * Get test-related dependencies
 */
function getTestDependencies(): Record<string, string> {
  const { dependencies, devDependencies } = readPackageJson();
  
  // Test-related packages
  const testPackages = [
    'playwright',
    '@playwright/test',
    'vitest',
    '@vitest/ui',
    'typescript',
    'tsx',
    '@types/node',
  ];

  const testDeps: Record<string, string> = {};

  for (const pkg of testPackages) {
    if (devDependencies[pkg]) {
      testDeps[pkg] = devDependencies[pkg];
    } else if (dependencies[pkg]) {
      testDeps[pkg] = dependencies[pkg];
    }
  }

  return testDeps;
}

/**
 * Check for required test dependencies
 */
function checkRequiredDependencies(): DependencyIssue[] {
  const { dependencies, devDependencies } = readPackageJson();
  const allDeps = { ...dependencies, ...devDependencies };
  const issues: DependencyIssue[] = [];

  // Required test dependencies
  const required = [
    { name: '@playwright/test', type: 'devDependencies' as const, critical: true },
    { name: 'playwright', type: 'devDependencies' as const, critical: true },
    { name: 'typescript', type: 'devDependencies' as const, critical: false },
  ];

  for (const req of required) {
    const exists = req.type === 'devDependencies' ? 
      devDependencies[req.name] : dependencies[req.name];

    if (!exists) {
      issues.push({
        package: req.name,
        currentVersion: 'missing',
        issue: 'missing',
        severity: req.critical ? 'critical' : 'high',
        description: `Required test dependency ${req.name} is not installed`,
        recommendation: `Install ${req.name}: npm install --save-dev ${req.name}`,
      });
    }
  }

  return issues;
}

/**
 * Check for outdated dependencies
 */
function checkOutdatedDependencies(): DependencyIssue[] {
  const testDeps = getTestDependencies();
  const issues: DependencyIssue[] = [];

  // Known version patterns and recommendations
  const versionChecks: Record<string, { min: string; recommended?: string }> = {
    '@playwright/test': { min: '1.40.0', recommended: 'latest' },
    'playwright': { min: '1.40.0', recommended: 'latest' },
    'vitest': { min: '1.0.0', recommended: 'latest' },
    'typescript': { min: '5.0.0', recommended: 'latest' },
  };

  for (const [pkg, version] of Object.entries(testDeps)) {
    const check = versionChecks[pkg];
    if (check) {
      // Extract version number (remove ^, ~, etc.)
      const versionNum = version.replace(/[^0-9.]/g, '');
      const minNum = check.min.replace(/[^0-9.]/g, '');

      // Simple version comparison (basic)
      if (compareVersions(versionNum, minNum) < 0) {
        issues.push({
          package: pkg,
          currentVersion: version,
          latestVersion: check.recommended || 'latest',
          issue: 'outdated',
          severity: 'medium',
          description: `${pkg} version ${version} may be outdated. Minimum recommended: ${check.min}`,
          recommendation: `Update ${pkg}: npm install --save-dev ${pkg}@latest`,
        });
      }
    }
  }

  return issues;
}

/**
 * Simple version comparison
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}

/**
 * Check for incompatible dependencies
 */
function checkIncompatibleDependencies(): DependencyIssue[] {
  const { dependencies, devDependencies } = readPackageJson();
  const allDeps = { ...dependencies, ...devDependencies };
  const issues: DependencyIssue[] = [];

  // Known incompatibilities
  const incompatibilities: Array<{ pkg1: string; pkg2: string; reason: string }> = [
    {
      pkg1: '@playwright/test',
      pkg2: 'jest',
      reason: 'Playwright and Jest can conflict. Use Playwright test runner instead.',
    },
  ];

  for (const incompat of incompatibilities) {
    if (allDeps[incompat.pkg1] && allDeps[incompat.pkg2]) {
      issues.push({
        package: `${incompat.pkg1} + ${incompat.pkg2}`,
        currentVersion: `${allDeps[incompat.pkg1]} + ${allDeps[incompat.pkg2]}`,
        issue: 'incompatible',
        severity: 'high',
        description: `Incompatible packages: ${incompat.reason}`,
        recommendation: `Remove one of the conflicting packages or use separate test configurations`,
      });
    }
  }

  return issues;
}

/**
 * Check for deprecated packages
 */
function checkDeprecatedDependencies(): DependencyIssue[] {
  const testDeps = getTestDependencies();
  const issues: DependencyIssue[] = [];

  // Known deprecated packages
  const deprecated: Record<string, { replacement: string; reason: string }> = {
    // Add known deprecated packages here
  };

  for (const [pkg, info] of Object.entries(deprecated)) {
    if (testDeps[pkg]) {
      issues.push({
        package: pkg,
        currentVersion: testDeps[pkg],
        issue: 'deprecated',
        severity: 'medium',
        description: `${pkg} is deprecated: ${info.reason}`,
        recommendation: `Migrate to ${info.replacement}`,
      });
    }
  }

  return issues;
}

/**
 * Check Node.js version compatibility
 */
function checkNodeVersion(): DependencyIssue[] {
  const issues: DependencyIssue[] = [];
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  // Playwright requires Node.js 18+
  if (majorVersion < 18) {
    issues.push({
      package: 'node',
      currentVersion: nodeVersion,
      issue: 'incompatible',
      severity: 'critical',
      description: `Node.js ${nodeVersion} is not compatible with Playwright. Requires Node.js 18+`,
      recommendation: 'Update Node.js to version 18 or higher',
    });
  }

  return issues;
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(result: Omit<DependencyCheckResult, 'overallHealth' | 'score'>): {
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs-improvement';
  score: number;
} {
  let score = 100;

  // Deduct points for issues
  result.missing.forEach(issue => {
    if (issue.severity === 'critical') score -= 20;
    else if (issue.severity === 'high') score -= 10;
    else if (issue.severity === 'medium') score -= 5;
    else score -= 2;
  });

  result.outdated.forEach(() => score -= 3);
  result.incompatible.forEach(issue => {
    if (issue.severity === 'critical') score -= 15;
    else if (issue.severity === 'high') score -= 10;
    else score -= 5;
  });
  result.deprecated.forEach(() => score -= 5);

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
 * Run dependency check
 */
export function checkDependencies(): DependencyCheckResult {
  console.log('🔍 Checking test dependencies...\n');

  const missing = checkRequiredDependencies();
  const outdated = checkOutdatedDependencies();
  const incompatible = [...checkIncompatibleDependencies(), ...checkNodeVersion()];
  const deprecated = checkDeprecatedDependencies();

  const result: Omit<DependencyCheckResult, 'overallHealth' | 'score'> = {
    outdated,
    missing,
    incompatible,
    deprecated,
  };

  const { overallHealth, score } = calculateHealthScore(result);

  return {
    ...result,
    overallHealth,
    score,
  };
}

/**
 * Format dependency check results
 */
function formatDependencyResults(result: DependencyCheckResult): string {
  let output = '\n🔍 Test Dependency Check Results\n';
  output += '='.repeat(50) + '\n\n';

  output += `Overall Health: ${result.overallHealth.toUpperCase()} (Score: ${result.score}/100)\n\n`;

  // Missing dependencies
  if (result.missing.length > 0) {
    output += `❌ Missing Dependencies (${result.missing.length}):\n`;
    result.missing.forEach(issue => {
      output += `  [${issue.severity.toUpperCase()}] ${issue.package}\n`;
      output += `    ${issue.description}\n`;
      output += `    💡 ${issue.recommendation}\n\n`;
    });
  } else {
    output += '✅ All required dependencies are installed\n\n';
  }

  // Outdated dependencies
  if (result.outdated.length > 0) {
    output += `⚠️  Outdated Dependencies (${result.outdated.length}):\n`;
    result.outdated.forEach(issue => {
      output += `  ${issue.package}: ${issue.currentVersion}`;
      if (issue.latestVersion) {
        output += ` → ${issue.latestVersion}`;
      }
      output += `\n    ${issue.description}\n`;
      output += `    💡 ${issue.recommendation}\n\n`;
    });
  } else {
    output += '✅ All dependencies are up to date\n\n';
  }

  // Incompatible dependencies
  if (result.incompatible.length > 0) {
    output += `⚠️  Incompatible Dependencies (${result.incompatible.length}):\n`;
    result.incompatible.forEach(issue => {
      output += `  [${issue.severity.toUpperCase()}] ${issue.package}\n`;
      output += `    ${issue.description}\n`;
      output += `    💡 ${issue.recommendation}\n\n`;
    });
  } else {
    output += '✅ No incompatible dependencies found\n\n';
  }

  // Deprecated dependencies
  if (result.deprecated.length > 0) {
    output += `⚠️  Deprecated Dependencies (${result.deprecated.length}):\n`;
    result.deprecated.forEach(issue => {
      output += `  ${issue.package}: ${issue.currentVersion}\n`;
      output += `    ${issue.description}\n`;
      output += `    💡 ${issue.recommendation}\n\n`;
    });
  } else {
    output += '✅ No deprecated dependencies found\n\n';
  }

  // Summary
  const totalIssues = result.missing.length + result.outdated.length + 
                      result.incompatible.length + result.deprecated.length;
  
  if (totalIssues === 0) {
    output += '🎉 All dependency checks passed!\n\n';
  } else {
    output += `📊 Total Issues: ${totalIssues}\n\n`;
    output += '💡 Recommendations:\n';
    output += '  1. Address critical and high severity issues first\n';
    output += '  2. Update outdated dependencies regularly\n';
    output += '  3. Remove incompatible packages\n';
    output += '  4. Migrate from deprecated packages\n\n';
  }

  return output;
}

// Run if executed directly
if (require.main === module) {
  const result = checkDependencies();
  console.log(formatDependencyResults(result));

  // Write to file
  const outputPath = path.join(__dirname, 'DEPENDENCY_CHECK.md');
  fs.writeFileSync(outputPath, formatDependencyResults(result));
  console.log(`\n📄 Results saved to: ${outputPath}\n`);

  // Exit with appropriate code
  process.exit(result.score >= 75 ? 0 : 1);
}

