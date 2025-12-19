/**
 * Test Coverage Analysis Script
 * 
 * Analyzes test coverage by:
 * 1. Parsing all test files
 * 2. Mapping tests to application features
 * 3. Identifying coverage gaps
 * 4. Generating coverage report
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestInfo {
  file: string;
  testName: string;
  tags: string[];
  description?: string;
}

interface FeatureCoverage {
  feature: string;
  route?: string;
  tests: TestInfo[];
  coverage: 'covered' | 'partial' | 'missing';
  notes?: string;
}

interface CoverageReport {
  totalTests: number;
  totalTestFiles: number;
  features: FeatureCoverage[];
  gaps: string[];
  summary: {
    covered: number;
    partial: number;
    missing: number;
  };
}

// Application features and routes to check coverage for
const APPLICATION_FEATURES: Array<{
  name: string;
  route?: string;
  keywords: string[];
  priority: 'high' | 'medium' | 'low';
}> = [
  // Pages
  {
    name: 'Landing Page',
    route: '/',
    keywords: ['landing', 'home', 'hero', 'features'],
    priority: 'high',
  },
  {
    name: 'Dashboard',
    route: '/dashboard',
    keywords: ['dashboard', 'applications', 'registered'],
    priority: 'high',
  },
  
  // API Routes
  {
    name: 'Portal URL API',
    route: '/api/portal-url',
    keywords: ['portal-url', 'portal', 'iwps'],
    priority: 'high',
  },
  {
    name: 'Verify and Attest API',
    route: '/api/verify-and-attest',
    keywords: ['verify-and-attest', 'verify', 'attest'],
    priority: 'high',
  },
  {
    name: 'Validate URL API',
    route: '/api/validate-url',
    keywords: ['validate-url', 'validate'],
    priority: 'medium',
  },
  {
    name: 'Fetch Metadata API',
    route: '/api/fetch-metadata',
    keywords: ['fetch-metadata', 'metadata'],
    priority: 'medium',
  },
  {
    name: 'Fetch Description API',
    route: '/api/fetch-description',
    keywords: ['fetch-description', 'description'],
    priority: 'medium',
  },
  {
    name: 'Discover Controlling Wallet API',
    route: '/api/discover-controlling-wallet',
    keywords: ['discover-controlling-wallet', 'wallet', 'controlling'],
    priority: 'medium',
  },
  {
    name: 'Data URL API',
    route: '/api/data-url',
    keywords: ['data-url', 'data'],
    priority: 'low',
  },
  {
    name: 'IWPS Query Proxy API',
    route: '/api/iwps-query-proxy',
    keywords: ['iwps-query-proxy', 'iwps', 'proxy'],
    priority: 'low',
  },
  
  // Features
  {
    name: 'Registration Wizard',
    route: '/dashboard',
    keywords: ['wizard', 'register', 'registration', 'mint', 'modal'],
    priority: 'high',
  },
  {
    name: 'Authentication',
    keywords: ['auth', 'authenticated', 'wallet', 'connect'],
    priority: 'high',
  },
  {
    name: 'Navigation',
    keywords: ['navigation', 'nav', 'link', 'route'],
    priority: 'medium',
  },
  {
    name: 'Error Handling',
    keywords: ['error', 'boundary', 'error-boundary', 'error handling'],
    priority: 'medium',
  },
  {
    name: 'Accessibility',
    keywords: ['accessibility', 'a11y', 'aria', 'keyboard'],
    priority: 'medium',
  },
  {
    name: 'Visual Regression',
    keywords: ['visual', 'screenshot', 'regression', 'visual-regression'],
    priority: 'medium',
  },
  {
    name: 'Performance',
    keywords: ['performance', 'load', 'speed', 'budget'],
    priority: 'medium',
  },
  {
    name: 'Network',
    keywords: ['network', 'request', 'fetch', 'api'],
    priority: 'low',
  },
];

/**
 * Parse test file to extract test information
 */
function parseTestFile(filePath: string): TestInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const tests: TestInfo[] = [];
  
  // Extract test names and tags
  const testRegex = /test\(['"]([^'"]+)['"]([^)]*)\)/g;
  const describeRegex = /test\.describe\(['"]([^'"]+)['"]/g;
  
  let match;
  const testMatches: Array<{ name: string; line: string }> = [];
  
  // Find all test() calls
  while ((match = testRegex.exec(content)) !== null) {
    const testName = match[1];
    const testBody = match[2];
    
    // Extract tags (e.g., @api, @slow)
    const tags: string[] = [];
    const tagMatch = testName.match(/@(\w+)/g);
    if (tagMatch) {
      tags.push(...tagMatch.map(t => t.substring(1)));
    }
    
    // Extract description from comments
    let description: string | undefined;
    const lines = content.split('\n');
    const testLineIndex = content.substring(0, match.index).split('\n').length - 1;
    for (let i = testLineIndex - 1; i >= Math.max(0, testLineIndex - 10); i--) {
      const commentMatch = lines[i].match(/\/\*\*?\s*(.+?)\s*\*\/?/);
      if (commentMatch) {
        description = commentMatch[1].trim();
        break;
      }
    }
    
    tests.push({
      file: path.basename(filePath),
      testName,
      tags,
      description,
    });
  }
  
  return tests;
}

/**
 * Map tests to features
 */
function mapTestsToFeatures(tests: TestInfo[]): FeatureCoverage[] {
  const featureMap = new Map<string, TestInfo[]>();
  
  // Initialize feature map
  APPLICATION_FEATURES.forEach(feature => {
    featureMap.set(feature.name, []);
  });
  
  // Map tests to features
  tests.forEach(test => {
    const testText = `${test.testName} ${test.description || ''} ${test.file}`.toLowerCase();
    
    APPLICATION_FEATURES.forEach(feature => {
      const matches = feature.keywords.some(keyword => 
        testText.includes(keyword.toLowerCase())
      );
      
      if (matches) {
        featureMap.get(feature.name)!.push(test);
      }
    });
  });
  
  // Convert to FeatureCoverage array
  return APPLICATION_FEATURES.map(feature => {
    const featureTests = featureMap.get(feature.name) || [];
    let coverage: 'covered' | 'partial' | 'missing';
    let notes: string | undefined;
    
    if (featureTests.length === 0) {
      coverage = 'missing';
      notes = 'No tests found';
    } else if (featureTests.length >= 3) {
      coverage = 'covered';
    } else {
      coverage = 'partial';
      notes = `Only ${featureTests.length} test(s) found`;
    }
    
    return {
      feature: feature.name,
      route: feature.route,
      tests: featureTests,
      coverage,
      notes,
      priority: feature.priority,
    };
  });
}

/**
 * Generate coverage report
 */
function generateCoverageReport(): CoverageReport {
  const testDir = path.join(__dirname);
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.endsWith('.spec.ts'))
    .map(file => path.join(testDir, file));
  
  // Parse all test files
  const allTests: TestInfo[] = [];
  testFiles.forEach(file => {
    try {
      const tests = parseTestFile(file);
      allTests.push(...tests);
    } catch (error) {
      console.warn(`Failed to parse ${file}:`, error);
    }
  });
  
  // Map tests to features
  const features = mapTestsToFeatures(allTests);
  
  // Identify gaps
  const gaps = features
    .filter(f => f.coverage === 'missing' && f.priority === 'high')
    .map(f => `${f.feature} (${f.route || 'N/A'})`);
  
  // Calculate summary
  const summary = {
    covered: features.filter(f => f.coverage === 'covered').length,
    partial: features.filter(f => f.coverage === 'partial').length,
    missing: features.filter(f => f.coverage === 'missing').length,
  };
  
  return {
    totalTests: allTests.length,
    totalTestFiles: testFiles.length,
    features,
    gaps,
    summary,
  };
}

/**
 * Format coverage report as markdown
 */
function formatReport(report: CoverageReport): string {
  let markdown = `# Test Coverage Report\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- **Total Tests:** ${report.totalTests}\n`;
  markdown += `- **Total Test Files:** ${report.totalTestFiles}\n`;
  markdown += `- **Features Covered:** ${report.summary.covered}\n`;
  markdown += `- **Features Partially Covered:** ${report.summary.partial}\n`;
  markdown += `- **Features Missing:** ${report.summary.missing}\n\n`;
  
  markdown += `## Coverage by Feature\n\n`;
  markdown += `| Feature | Route | Tests | Coverage | Priority | Notes |\n`;
  markdown += `|---------|-------|-------|----------|----------|-------|\n`;
  
  report.features.forEach(feature => {
    const coverageIcon = 
      feature.coverage === 'covered' ? '✅' :
      feature.coverage === 'partial' ? '⚠️' : '❌';
    const priorityIcon = 
      feature.priority === 'high' ? '🔴' :
      feature.priority === 'medium' ? '🟡' : '🟢';
    
    markdown += `| ${feature.feature} | ${feature.route || 'N/A'} | ${feature.tests.length} | ${coverageIcon} ${feature.coverage} | ${priorityIcon} ${feature.priority} | ${feature.notes || '-'} |\n`;
  });
  
  if (report.gaps.length > 0) {
    markdown += `\n## ⚠️ High Priority Coverage Gaps\n\n`;
    report.gaps.forEach(gap => {
      markdown += `- ${gap}\n`;
    });
  }
  
  markdown += `\n## Test Details by Feature\n\n`;
  report.features.forEach(feature => {
    if (feature.tests.length > 0) {
      markdown += `### ${feature.feature}\n\n`;
      feature.tests.forEach(test => {
        markdown += `- **${test.testName}** (${test.file})\n`;
        if (test.tags.length > 0) {
          markdown += `  - Tags: ${test.tags.join(', ')}\n`;
        }
        if (test.description) {
          markdown += `  - Description: ${test.description}\n`;
        }
      });
      markdown += `\n`;
    }
  });
  
  return markdown;
}

// Main execution
if (require.main === module) {
  console.log('🔍 Analyzing test coverage...\n');
  
  const report = generateCoverageReport();
  const markdown = formatReport(report);
  
  // Write report to file
  const reportPath = path.join(__dirname, 'COVERAGE_REPORT.md');
  fs.writeFileSync(reportPath, markdown);
  
  console.log('✅ Coverage report generated:', reportPath);
  console.log('\n📊 Summary:');
  console.log(`  Total Tests: ${report.totalTests}`);
  console.log(`  Test Files: ${report.totalTestFiles}`);
  console.log(`  Covered: ${report.summary.covered}`);
  console.log(`  Partial: ${report.summary.partial}`);
  console.log(`  Missing: ${report.summary.missing}`);
  
  if (report.gaps.length > 0) {
    console.log('\n⚠️  High Priority Gaps:');
    report.gaps.forEach(gap => console.log(`  - ${gap}`));
  }
}

export { generateCoverageReport, formatReport, parseTestFile };

