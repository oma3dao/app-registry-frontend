/**
 * Verification Script for E2E Test Suite
 * 
 * Verifies that all test files, helpers, and configurations are in place
 */

const fs = require('fs');
const path = require('path');

const testDir = __dirname;
const requiredFiles = [
  // Test files
  'api-integration.spec.ts',
  'error-boundary.spec.ts',
  'accessibility.spec.ts',
  'performance.spec.ts',
  'visual-regression.spec.ts',
  'network.spec.ts',
  'dashboard.spec.ts',
  'wizard-flow.spec.ts',
  'landing-page.spec.ts',
  
  // Helper files
  'test-helpers.ts',
  'auth-helpers.ts',
  'fixtures.ts',
  'test-data.ts',
  
  // Scripts
  'generate-coverage-report.js',
  'generate-test-summary.js',
];

const requiredWorkflows = [
  '.github/workflows/e2e-tests.yml',
  '.github/workflows/e2e-test-summary.yml',
];

const requiredDocs = [
  'README.md',
  'RUNNING_TESTS.md',
  'GETTING_STARTED.md',
];

console.log('🔍 Verifying E2E Test Suite Setup...\n');

let allPassed = true;

// Check test files
console.log('📁 Checking test files...');
requiredFiles.forEach(file => {
  const filePath = path.join(testDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allPassed = false;
  }
});

// Check workflows
console.log('\n🔧 Checking CI/CD workflows...');
const projectRoot = path.join(testDir, '..', '..');
requiredWorkflows.forEach(workflow => {
  const filePath = path.join(projectRoot, workflow);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${workflow}`);
  } else {
    console.log(`  ❌ ${workflow} - MISSING`);
    allPassed = false;
  }
});

// Check documentation
console.log('\n📚 Checking documentation...');
requiredDocs.forEach(doc => {
  const filePath = path.join(testDir, doc);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${doc}`);
  } else {
    console.log(`  ⚠️  ${doc} - Optional but recommended`);
  }
});

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJsonPath = path.join(projectRoot, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const requiredScripts = [
    'test:e2e',
    'test:e2e:ui',
    'test:e2e:coverage',
    'test:e2e:visual',
  ];
  
  requiredScripts.forEach(script => {
    if (scripts[script]) {
      console.log(`  ✅ ${script}`);
    } else {
      console.log(`  ❌ ${script} - MISSING`);
      allPassed = false;
    }
  });
} else {
  console.log('  ❌ package.json not found');
  allPassed = false;
}

// Check visual snapshots
console.log('\n🖼️  Checking visual regression snapshots...');
const snapshotsDir = path.join(testDir, 'visual-regression.spec.ts-snapshots');
if (fs.existsSync(snapshotsDir)) {
  const snapshots = fs.readdirSync(snapshotsDir);
  console.log(`  ✅ Found ${snapshots.length} snapshot(s)`);
  snapshots.forEach(snapshot => {
    console.log(`     • ${snapshot}`);
  });
} else {
  console.log('  ⚠️  No snapshots found (run visual tests to generate)');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✅ All required files and configurations are in place!');
  console.log('\n🎯 Test suite is ready to use.');
  console.log('\nQuick start:');
  console.log('  npm run test:e2e          # Run all tests');
  console.log('  npm run test:e2e:coverage # Generate coverage');
  console.log('  npm run test:e2e:ui       # Run with UI');
} else {
  console.log('❌ Some required files are missing.');
  console.log('Please review the errors above and ensure all files are created.');
  process.exit(1);
}

