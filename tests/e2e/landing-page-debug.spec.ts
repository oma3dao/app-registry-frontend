/**
 * Debug Test - Check if page loads and what's actually visible
 * 
 * Run this to see what's actually on the page
 */

import { test, expect } from '@playwright/test';

test('debug - check what is actually on the page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  // Take screenshot first
  await page.screenshot({ path: 'debug-page.png', fullPage: true });
  
  // Get page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Get page URL
  const url = page.url();
  console.log('Page URL:', url);
  
  // Get all text on page
  const allText = await page.evaluate(() => document.body.innerText);
  console.log('Page text (first 2000 chars):', allText.substring(0, 2000));
  
  // Get page HTML to see what's actually there
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('Body HTML length:', bodyHTML.length);
  console.log('Body HTML preview (first 1000 chars):', bodyHTML.substring(0, 1000));
  
  // Check for error messages
  const hasError = allText.includes('Error') || allText.includes('error') || allText.includes('missing');
  console.log('Has error text:', hasError);
  
  // Check if hero text exists in HTML
  const hasHeroText = bodyHTML.includes('OMATrust is Trust for') || allText.includes('OMATrust is Trust for');
  console.log('Has hero text:', hasHeroText);
  
  // Check for React hydration
  const hasReact = bodyHTML.includes('__next') || bodyHTML.includes('react');
  console.log('Has React markers:', hasReact);
  
  // Try to find elements
  const heroHeading = page.locator('text=/OMATrust is Trust for/i');
  const count = await heroHeading.count();
  console.log('Hero heading count:', count);
  
  if (count > 0) {
    const isVisible = await heroHeading.first().isVisible();
    console.log('Hero heading visible:', isVisible);
  }
  
  // Check navigation
  const nav = page.getByRole('navigation');
  const navCount = await nav.count();
  console.log('Navigation count:', navCount);
  
  // Check for any h1
  const h1Count = await page.locator('h1').count();
  console.log('H1 count:', h1Count);
  
  // Check for any buttons
  const buttonCount = await page.locator('button').count();
  console.log('Button count:', buttonCount);
  
  // Check console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  console.log('Console errors:', consoleErrors);
});

