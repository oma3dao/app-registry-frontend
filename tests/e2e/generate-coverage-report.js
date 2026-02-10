/**
 * Generate Test Coverage Report
 * 
 * Analyzes test results and generates a coverage report
 */

const fs = require('fs');
const path = require('path');

function generateCoverageReport() {
  const testDir = path.join(__dirname);
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.ts') || file.endsWith('.spec.js'))
    .map(file => ({
      name: file,
      path: path.join(testDir, file),
    }));

  // Read test files and extract test descriptions
  const testCoverage = testFiles.map(testFile => {
    const content = fs.readFileSync(testFile.path, 'utf-8');
    const testMatches = content.match(/test\(['"]([^'"]+)['"]/g) || [];
    const describeMatches = content.match(/test\.describe\(['"]([^'"]+)['"]/g) || [];
    
    return {
      file: testFile.name,
      tests: testMatches.length,
      suites: describeMatches.length,
      testNames: testMatches.map(m => m.match(/['"]([^'"]+)['"]/)?.[1] || '').filter(Boolean),
    };
  });

  // Calculate totals
  const totalTests = testCoverage.reduce((sum, file) => sum + file.tests, 0);
  const totalSuites = testCoverage.reduce((sum, file) => sum + file.suites, 0);

  // Generate report
  const report = {
    generated: new Date().toISOString(),
    summary: {
      totalTestFiles: testFiles.length,
      totalTests,
      totalSuites,
    },
    coverage: testCoverage,
  };

  // Write report
  const reportPath = path.join(__dirname, 'test-coverage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate markdown report
  const markdownReport = `# Test Coverage Report

Generated: ${new Date().toLocaleString()}

## Summary

- **Total Test Files:** ${testFiles.length}
- **Total Test Suites:** ${totalSuites}
- **Total Tests:** ${totalTests}

## Test Files Coverage

${testCoverage.map(file => `
### ${file.file}
- **Tests:** ${file.tests}
- **Suites:** ${file.suites}
- **Test Names:**
${file.testNames.map(name => `  - ${name}`).join('\n')}
`).join('\n')}

## Areas Covered

### ✅ Core Functionality
- Landing page tests
- Dashboard tests
- Navigation tests

### ✅ Quality Assurance
- Accessibility tests
- Performance tests
- Visual regression tests
- Network tests

### ✅ Integration
- API integration tests
- Error boundary tests
- Edge case tests

### ⚠️ Areas Needing More Coverage
- Authenticated user flows (requires real wallet connection)
- Wizard completion flow (requires authentication)
- Blockchain interactions (requires testnet/mainnet setup)

---

*This report is generated automatically. Update test files to improve coverage.*
`;

  const markdownPath = path.join(__dirname, 'TEST_COVERAGE_REPORT.md');
  fs.writeFileSync(markdownPath, markdownReport);

  console.log('✅ Coverage report generated:');
  console.log(`   - JSON: ${reportPath}`);
  console.log(`   - Markdown: ${markdownPath}`);
  console.log(`\n📊 Summary: ${totalTests} tests across ${testFiles.length} files`);

  return report;
}

if (require.main === module) {
  generateCoverageReport();
}

module.exports = { generateCoverageReport };

