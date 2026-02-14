/**
 * Unused Utilities Finder
 * 
 * Finds unused test utilities and functions to help identify
 * dead code and opportunities for cleanup.
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/test-unused-utilities.ts
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface UnusedUtility {
  utility: string;
  file: string;
  exportType: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum';
  suggestion: string;
}

/**
 * Get all utility files
 */
function getUtilityFiles(): Array<{ file: string; path: string }> {
  const testDir = path.join(__dirname);
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

  return utilityFiles
    .map(file => ({
      file,
      path: path.join(testDir, file),
    }))
    .filter(item => fs.existsSync(item.path));
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
 * Extract exports from a file
 */
function extractExports(filePath: string): Array<{
  name: string;
  type: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum';
}> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exports: Array<{ name: string; type: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum' }> = [];

  // Match different export patterns
  const patterns = [
    { regex: /export\s+(?:async\s+)?function\s+(\w+)/g, type: 'function' as const },
    { regex: /export\s+class\s+(\w+)/g, type: 'class' as const },
    { regex: /export\s+const\s+(\w+)/g, type: 'const' as const },
    { regex: /export\s+type\s+(\w+)/g, type: 'type' as const },
    { regex: /export\s+interface\s+(\w+)/g, type: 'interface' as const },
    { regex: /export\s+enum\s+(\w+)/g, type: 'enum' as const },
  ];

  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      exports.push({ name: match[1], type });
    }
  }

  // Handle named exports from object
  const namedExports = /export\s*\{\s*([^}]+)\s*\}/g;
  let match;
  while ((match = namedExports.exec(content)) !== null) {
    const names = match[1].split(',').map(n => {
      const trimmed = n.trim();
      // Handle "name as alias" pattern
      const name = trimmed.split(' as ')[0].trim();
      return name;
    });
    names.forEach(name => {
      if (name && name !== 'default') {
        // Try to determine type from context (simplified)
        const type = content.includes(`function ${name}`) ? 'function' :
                    content.includes(`class ${name}`) ? 'class' :
                    content.includes(`const ${name}`) ? 'const' :
                    content.includes(`type ${name}`) ? 'type' :
                    content.includes(`interface ${name}`) ? 'interface' :
                    content.includes(`enum ${name}`) ? 'enum' : 'const';
        exports.push({ name, type });
      }
    });
  }

  return exports;
}

/**
 * Check if utility is used in test files
 */
function isUtilityUsed(
  utilityName: string,
  utilityFile: string,
  testFiles: string[]
): boolean {
  const utilityFileName = path.basename(utilityFile, '.ts');

  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8');

    // Check for direct usage
    if (content.includes(utilityName)) {
      // Check if it's actually imported/used (not just a comment)
      const importPattern = new RegExp(
        `import.*${utilityName}.*from|from.*['"]\\.?/?${utilityFileName}['"]`,
        'g'
      );
      if (importPattern.test(content)) {
        return true;
      }

      // Check for usage in code (not in comments)
      const usagePattern = new RegExp(
        `(?:^|[^/])\\b${utilityName}\\s*\\(|\\b${utilityName}\\s*[=:]`,
        'gm'
      );
      if (usagePattern.test(content)) {
        return true;
      }

      // Check for re-export from test-helpers
      if (utilityFileName !== 'test-helpers' && content.includes("from './test-helpers'")) {
        // Check if test-helpers re-exports this utility
        const helpersPath = path.join(__dirname, 'test-helpers.ts');
        if (fs.existsSync(helpersPath)) {
          const helpersContent = fs.readFileSync(helpersPath, 'utf-8');
          if (helpersContent.includes(utilityName)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Find unused utilities
 */
function findUnusedUtilities(): UnusedUtility[] {
  const utilityFiles = getUtilityFiles();
  const testFiles = getTestFiles();
  const unused: UnusedUtility[] = [];

  for (const { file, path: filePath } of utilityFiles) {
    const exports = extractExports(filePath);
    const utilityFileName = path.basename(file, '.ts');

    for (const exportItem of exports) {
      // Skip default exports and common patterns
      if (exportItem.name === 'default' || exportItem.name.startsWith('_')) {
        continue;
      }

      // Skip if it's a type/interface that might be used implicitly
      if (exportItem.type === 'type' || exportItem.type === 'interface') {
        // These are harder to detect, so we'll be more lenient
        const isUsed = isUtilityUsed(exportItem.name, filePath, testFiles);
        if (!isUsed) {
          unused.push({
            utility: exportItem.name,
            file: utilityFileName,
            exportType: exportItem.type,
            suggestion: 'Type/interface might be used implicitly. Review manually.',
          });
        }
        continue;
      }

      const isUsed = isUtilityUsed(exportItem.name, filePath, testFiles);

      if (!isUsed) {
        let suggestion = 'Consider removing if truly unused';
        if (exportItem.type === 'function') {
          suggestion = 'Function appears unused. Verify before removing.';
        } else if (exportItem.type === 'class') {
          suggestion = 'Class appears unused. May be used in future or for documentation.';
        }

        unused.push({
          utility: exportItem.name,
          file: utilityFileName,
          exportType: exportItem.type,
          suggestion,
        });
      }
    }
  }

  return unused;
}

/**
 * Format unused utilities results
 */
function formatUnusedUtilitiesResults(unused: UnusedUtility[]): string {
  let output = '\n🔍 Unused Utilities Detection Results\n';
  output += '='.repeat(50) + '\n\n';

  if (unused.length === 0) {
    output += '✅ No unused utilities found!\n\n';
    return output;
  }

  output += `Found ${unused.length} potentially unused utilities:\n\n`;

  // Group by file
  const byFile = new Map<string, UnusedUtility[]>();
  for (const item of unused) {
    if (!byFile.has(item.file)) {
      byFile.set(item.file, []);
    }
    byFile.get(item.file)!.push(item);
  }

  for (const [file, items] of byFile.entries()) {
    output += `📁 ${file}:\n`;
    items.forEach(item => {
      output += `  - ${item.utility} (${item.exportType})\n`;
      output += `    💡 ${item.suggestion}\n`;
    });
    output += '\n';
  }

  output += '⚠️  Note: This is a heuristic analysis. Some utilities might be:\n';
  output += '  - Used in ways not detected (dynamic imports, etc.)\n';
  output += '  - Planned for future use\n';
  output += '  - Used in documentation or examples\n';
  output += '  - Part of a public API\n\n';
  output += 'Please review manually before removing.\n\n';

  return output;
}

/**
 * Run unused utilities detection
 */
export function detectUnusedUtilities(): UnusedUtility[] {
  console.log('🔍 Detecting unused utilities...\n');
  return findUnusedUtilities();
}

// Run if executed directly
if (require.main === module) {
  const unused = detectUnusedUtilities();
  console.log(formatUnusedUtilitiesResults(unused));

  // Write to file
  const outputPath = path.join(__dirname, 'UNUSED_UTILITIES.md');
  fs.writeFileSync(outputPath, formatUnusedUtilitiesResults(unused));
  console.log(`\n📄 Results saved to: ${outputPath}\n`);
}

