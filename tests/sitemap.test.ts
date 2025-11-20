/**
 * Test file: Sitemap Route
 * Tests the Next.js sitemap route to ensure it generates the correct sitemap structure.
 */

import { describe, it, expect } from 'vitest';
import sitemap from '../src/app/sitemap';

describe('sitemap route', () => {
  it('should generate a sitemap with correct structure', () => {
    const result = sitemap();
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    const entry = result[0];
    expect(entry).toHaveProperty('url');
    expect(entry).toHaveProperty('lastModified');
    expect(entry).toHaveProperty('changeFrequency');
    expect(entry).toHaveProperty('priority');
    
    expect(entry.url).toBe('https://registry.omatrust.org');
    expect(entry.changeFrequency).toBe('daily');
    expect(entry.priority).toBe(1);
    expect(entry.lastModified).toBeInstanceOf(Date);
  });

  it('should return a valid MetadataRoute.Sitemap structure', () => {
    const result = sitemap();
    
    // Verify all required fields are present
    result.forEach(entry => {
      expect(typeof entry.url).toBe('string');
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).toContain(entry.changeFrequency);
      expect(typeof entry.priority).toBe('number');
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    });
  });
});

