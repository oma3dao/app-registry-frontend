/**
 * Test Runner Helper Script
 * 
 * Provides utilities for running specific test suites and generating reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testFiles = {
  'api': 'api-integration.spec.ts',
  'api-routes': 'api-routes.spec.ts',
  'error': 'error-boundary.spec.ts',
  'accessibility': 'accessibility.spec.ts',
  'performance': 'performance.spec.ts',
  'visual': 'visual-regression.spec.ts',
  'network': 'network.spec.ts',
  'dashboard': 'dashboard.spec.ts',
  'wizard': 'wizard-flow.spec.ts',
  'landing': 'landing-page.spec.ts',
  'auth': 'enhanced-auth.spec.ts',
  'components': 'component-interactions.spec.ts',
  'navigation': 'navigation-tests.spec.ts',
};

function runTest(category, options = {}) {
  const testFile = testFiles[category];
  if (!testFile) {
    console.error(`❌ Unknown test category: ${category}`);
    console.log(`Available categories: ${Object.keys(testFiles).join(', ')}`);
    process.exit(1);
  }

  const testPath = path.join(__dirname, testFile);
  if (!fs.existsSync(testPath)) {
    console.error(`❌ Test file not found: ${testPath}`);
    process.exit(1);
  }

  let command = `npx playwright test ${testPath}`;
  
  if (options.ui) {
    command += ' --ui';
  }
  if (options.headed) {
    command += ' --headed';
  }
  if (options.debug) {
    command += ' --debug';
  }
  if (options.project) {
    command += ` --project=${options.project}`;
  }
  if (options.tag) {
    command += ` --grep "${options.tag}"`;
  }

  console.log(`\n🚀 Running ${category} tests...`);
  console.log(`Command: ${command}\n`);

  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`\n✅ ${category} tests completed successfully!`);
  } catch (error) {
    console.error(`\n❌ ${category} tests failed`);
    process.exit(1);
  }
}

function runByTag(tag, options = {}) {
  let command = `npx playwright test --grep "${tag}"`;
  
  if (options.invert) {
    command = `npx playwright test --grep "${tag}" --grep-invert`;
  }
  if (options.ui) {
    command += ' --ui';
  }
  if (options.headed) {
    command += ' --headed';
  }
  if (options.debug) {
    command += ' --debug';
  }
  if (options.project) {
    command += ` --project=${options.project}`;
  }

  console.log(`\n🚀 Running tests with tag: ${tag}${options.invert ? ' (inverted)' : ''}...`);
  console.log(`Command: ${command}\n`);

  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`\n✅ Tests with tag "${tag}" completed successfully!`);
  } catch (error) {
    console.error(`\n❌ Tests with tag "${tag}" failed`);
    process.exit(1);
  }
}

function listTests() {
  console.log('\n📋 Available Test Suites:\n');
  Object.entries(testFiles).forEach(([category, file]) => {
    const testPath = path.join(__dirname, file);
    const exists = fs.existsSync(testPath);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${category.padEnd(15)} - ${file}`);
  });
  
  console.log('\n🏷️  Available Test Tags:\n');
  const tags = ['@api', '@slow', '@ui', '@performance', '@security', '@accessibility', '@network', '@error', '@edge-case'];
  tags.forEach(tag => {
    console.log(`  • ${tag}`);
  });
  
  console.log('\nUsage:');
  console.log('  node test-runner.js <category> [options]');
  console.log('  node test-runner.js --tag <tag> [options]');
  console.log('  node test-runner.js --tag <tag> --invert [options]');
  console.log('\nOptions: --ui, --headed, --debug, --project=<browser>, --tag=<tag>, --invert\n');
}

function runAll(options = {}) {
  console.log('\n🚀 Running all E2E tests...\n');
  
  let command = 'npm run test:e2e';
  
  if (options.ui) {
    command = 'npm run test:e2e:ui';
  } else if (options.headed) {
    command = 'npm run test:e2e:headed';
  }

  try {
    execSync(command, { stdio: 'inherit' });
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Some tests failed');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const category = args[0];

if (!category || category === '--help' || category === '-h') {
  listTests();
  process.exit(0);
}

// Check if running by tag
const tagIndex = args.indexOf('--tag');
if (tagIndex !== -1 && args[tagIndex + 1]) {
  const tag = args[tagIndex + 1];
  const options = {
    ui: args.includes('--ui'),
    headed: args.includes('--headed'),
    debug: args.includes('--debug'),
    project: args.find(arg => arg.startsWith('--project='))?.split('=')[1],
    invert: args.includes('--invert'),
  };
  runByTag(tag, options);
} else if (category === 'all') {
  const options = {
    ui: args.includes('--ui'),
    headed: args.includes('--headed'),
  };
  runAll(options);
} else {
  const options = {
    ui: args.includes('--ui'),
    headed: args.includes('--headed'),
    debug: args.includes('--debug'),
    project: args.find(arg => arg.startsWith('--project='))?.split('=')[1],
    tag: args.find(arg => arg.startsWith('--tag='))?.split('=')[1],
  };
  runTest(category, options);
}

