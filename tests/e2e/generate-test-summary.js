/**
 * Generate Test Summary from Playwright Results
 * 
 * Parses test results and generates a summary for CI/CD
 */

const fs = require('fs');
const path = require('path');

function generateTestSummary() {
  const resultsPath = path.join(__dirname, '..', '..', 'test-results', 'results.json');
  
  if (!fs.existsSync(resultsPath)) {
    console.log('⚠️ Test results file not found');
    return {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };
  }

  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let total = 0;

    if (results.suites) {
      results.suites.forEach(suite => {
        if (suite.specs) {
          suite.specs.forEach(spec => {
            total++;
            if (spec.tests && spec.tests.length > 0) {
              const test = spec.tests[0];
              if (test.results && test.results.length > 0) {
                const status = test.results[0].status;
                if (status === 'passed') passed++;
                else if (status === 'failed') failed++;
                else if (status === 'skipped') skipped++;
              }
            }
          });
        }
      });
    }

    const summary = {
      passed,
      failed,
      skipped,
      total,
      success: failed === 0,
    };

    // Write summary to file
    const summaryPath = path.join(__dirname, '..', '..', 'test-results', 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('📊 Test Summary:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
    console.log(`   📊 Total: ${total}`);
    console.log(`   ${summary.success ? '✅' : '❌'} Status: ${summary.success ? 'Success' : 'Failed'}`);

    return summary;
  } catch (error) {
    console.error('❌ Error parsing test results:', error.message);
    return {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      success: false,
    };
  }
}

if (require.main === module) {
  generateTestSummary();
}

module.exports = { generateTestSummary };

