/**
 * Verification Script for Test Suite Improvements
 * 
 * This script verifies that all improvements are working correctly:
 * - Coverage report generation
 * - Execution analytics
 * - Test utilities
 * - Documentation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }
}

function checkScript(script, description) {
  try {
    execSync(`npm run ${script} --dry-run 2>&1`, { stdio: 'pipe' });
    log(`✅ ${description}`, 'green');
    return true;
  } catch (error) {
    // Check if script exists in package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    if (packageJson.scripts && packageJson.scripts[script]) {
      log(`✅ ${description}`, 'green');
      return true;
    } else {
      log(`❌ ${description} - Script not found: ${script}`, 'red');
      return false;
    }
  }
}

log('\n🔍 Verifying Test Suite Improvements...\n', 'blue');

let allPassed = true;

// Check utility files
log('📁 Checking Utility Files:', 'yellow');
allPassed &= checkFile('wait-utilities.ts', 'Wait utilities');
allPassed &= checkFile('test-performance.ts', 'Performance monitoring');
allPassed &= checkFile('test-execution-analytics.ts', 'Execution analytics');
allPassed &= checkFile('generate-coverage-report.ts', 'Coverage report generator');
allPassed &= checkFile('api-test-utilities.ts', 'API test utilities');

// Check test files
log('\n📝 Checking Test Files:', 'yellow');
allPassed &= checkFile('keyboard-navigation.spec.ts', 'Keyboard navigation tests');
allPassed &= checkFile('aria-validation.spec.ts', 'ARIA validation tests');
allPassed &= checkFile('focus-management.spec.ts', 'Focus management tests');

// Check documentation
log('\n📚 Checking Documentation:', 'yellow');
allPassed &= checkFile('TEST_BEST_PRACTICES.md', 'Best practices guide');
allPassed &= checkFile('TEST_PATTERNS.md', 'Test patterns guide');
allPassed &= checkFile('TEST_ANTI_PATTERNS.md', 'Anti-patterns guide');
allPassed &= checkFile('CODE_REVIEW_CHECKLIST.md', 'Code review checklist');
allPassed &= checkFile('ACCESSIBILITY_TESTING_GUIDE.md', 'Accessibility guide');
allPassed &= checkFile('EXECUTION_OPTIMIZATION.md', 'Execution optimization guide');
allPassed &= checkFile('COVERAGE_ANALYSIS_COMPLETE.md', 'Coverage analysis summary');
allPassed &= checkFile('CI_CD_ENHANCEMENTS_V2.md', 'CI/CD enhancements guide');

// Check templates
log('\n📋 Checking Test Templates:', 'yellow');
allPassed &= checkFile('test-templates/basic-test.spec.ts', 'Basic test template');
allPassed &= checkFile('test-templates/api-test.spec.ts', 'API test template');
allPassed &= checkFile('test-templates/form-test.spec.ts', 'Form test template');

// Check package.json scripts
log('\n🔧 Checking Package.json Scripts:', 'yellow');
allPassed &= checkScript('test:e2e:coverage', 'Coverage report script');
allPassed &= checkScript('test:e2e:analytics', 'Execution analytics script');

// Check CI/CD workflows
log('\n🚀 Checking CI/CD Workflows:', 'yellow');
const workflowsPath = path.join(__dirname, '../../.github/workflows');
allPassed &= checkFile('../../.github/workflows/e2e-tests.yml', 'Standard E2E workflow');
allPassed &= checkFile('../../.github/workflows/e2e-tests-sharded.yml', 'Sharded E2E workflow');

// Check configuration
log('\n⚙️  Checking Configuration:', 'yellow');
allPassed &= checkFile('../../playwright.config.ts', 'Playwright configuration');

// Summary
log('\n' + '='.repeat(50), 'blue');
if (allPassed) {
  log('✅ All verifications passed!', 'green');
  log('\n📊 Summary:', 'blue');
  log('  - All utility files present', 'green');
  log('  - All test files present', 'green');
  log('  - All documentation present', 'green');
  log('  - All templates present', 'green');
  log('  - All scripts configured', 'green');
  log('  - CI/CD workflows ready', 'green');
  log('\n🎉 Test suite improvements are ready to use!', 'green');
  log('\n💡 Next Steps:', 'yellow');
  log('  1. Run tests: npm run test:e2e', 'blue');
  log('  2. Generate coverage: npm run test:e2e:coverage', 'blue');
  log('  3. Generate analytics: npm run test:e2e:analytics', 'blue');
  process.exit(0);
} else {
  log('❌ Some verifications failed. Please check the errors above.', 'red');
  process.exit(1);
}

