/**
 * Test Duplicate Detector
 * 
 * Detects duplicate code patterns across test files to identify
 * opportunities for refactoring and utility extraction.
 * 
 * Usage:
 * ```bash
 * npx tsx tests/e2e/test-duplicate-detector.ts
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

interface DuplicatePattern {
  code: string;
  files: Array<{ file: string; line: number }>;
  similarity: number;
  suggestion: string;
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
 * Extract code blocks from a file
 */
function extractCodeBlocks(filePath: string): Array<{ code: string; line: number }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const blocks: Array<{ code: string; line: number }> = [];

  // Extract common patterns
  const patterns = [
    // Function calls
    /await\s+\w+\([^)]*\)/g,
    // Multi-line blocks (3+ lines)
    /(?:await\s+[^\n]+\n){3,}/g,
    // Test setup patterns
    /test\.beforeEach\([^)]*\)/gs,
    // Assertion patterns
    /await\s+expect\([^)]+\)\.\w+\([^)]*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const code = match[0].trim();
      if (code.length > 20) { // Only consider substantial blocks
        const lineNumber = content.substring(0, match.index).split('\n').length;
        blocks.push({ code, line: lineNumber });
      }
    }
  }

  return blocks;
}

/**
 * Calculate similarity between two code blocks
 */
function calculateSimilarity(code1: string, code2: string): number {
  // Normalize whitespace
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const norm1 = normalize(code1);
  const norm2 = normalize(code2);

  if (norm1 === norm2) return 100;

  // Calculate Levenshtein-like similarity
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;
  
  if (longer.length === 0) return 100;

  // Simple similarity based on common substrings
  let commonChars = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      commonChars++;
    }
  }

  return (commonChars / longer.length) * 100;
}

/**
 * Find duplicate patterns
 */
function findDuplicates(minSimilarity: number = 80): DuplicatePattern[] {
  const testFiles = getTestFiles();
  const allBlocks: Array<{ file: string; code: string; line: number }> = [];
  const duplicates: DuplicatePattern[] = [];

  // Extract all code blocks
  for (const file of testFiles) {
    const blocks = extractCodeBlocks(file);
    const fileName = path.basename(file);
    blocks.forEach(block => {
      allBlocks.push({
        file: fileName,
        code: block.code,
        line: block.line,
      });
    });
  }

  // Compare blocks
  for (let i = 0; i < allBlocks.length; i++) {
    const block1 = allBlocks[i];
    const matches: Array<{ file: string; line: number }> = [];

    for (let j = i + 1; j < allBlocks.length; j++) {
      const block2 = allBlocks[j];
      const similarity = calculateSimilarity(block1.code, block2.code);

      if (similarity >= minSimilarity && block1.file !== block2.file) {
        matches.push({ file: block2.file, line: block2.line });
      }
    }

    if (matches.length > 0) {
      matches.unshift({ file: block1.file, line: block1.line });
      
      // Generate suggestion
      let suggestion = 'Consider extracting to a utility function';
      if (block1.code.includes('await page.')) {
        suggestion = 'Consider creating a helper function in test-helpers.ts';
      } else if (block1.code.includes('test.beforeEach')) {
        suggestion = 'Consider using test fixtures or setup utilities';
      } else if (block1.code.includes('expect(')) {
        suggestion = 'Consider creating a custom assertion helper';
      }

      duplicates.push({
        code: block1.code.substring(0, 200), // Truncate for display
        files: matches,
        similarity: minSimilarity,
        suggestion,
      });
    }
  }

  // Remove duplicates (same pattern found multiple times)
  const unique: DuplicatePattern[] = [];
  const seen = new Set<string>();

  for (const dup of duplicates) {
    const key = dup.code.substring(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(dup);
    }
  }

  return unique;
}

/**
 * Format duplicate results
 */
function formatDuplicateResults(duplicates: DuplicatePattern[]): string {
  let output = '\n🔍 Duplicate Code Detection Results\n';
  output += '='.repeat(50) + '\n\n';

  if (duplicates.length === 0) {
    output += '✅ No significant duplicates found!\n\n';
    return output;
  }

  output += `Found ${duplicates.length} duplicate patterns:\n\n`;

  duplicates.forEach((dup, index) => {
    output += `${index + 1}. Similarity: ${dup.similarity}%\n`;
    output += `   Code: ${dup.code}\n`;
    output += `   Found in ${dup.files.length} locations:\n`;
    dup.files.forEach(file => {
      output += `     - ${file.file}:${file.line}\n`;
    });
    output += `   💡 Suggestion: ${dup.suggestion}\n\n`;
  });

  return output;
}

/**
 * Run duplicate detection
 */
export function detectDuplicates(minSimilarity: number = 80): DuplicatePattern[] {
  console.log('🔍 Detecting duplicate code patterns...\n');
  return findDuplicates(minSimilarity);
}

// Run if executed directly
if (require.main === module) {
  const duplicates = detectDuplicates(80);
  console.log(formatDuplicateResults(duplicates));

  // Write to file
  const outputPath = path.join(__dirname, 'DUPLICATE_DETECTION.md');
  fs.writeFileSync(outputPath, formatDuplicateResults(duplicates));
  console.log(`\n📄 Results saved to: ${outputPath}\n`);
}

