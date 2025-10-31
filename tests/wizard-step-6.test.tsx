/**
 * Tests for Wizard Step 6 - Review
 * 
 * Tests the final review step that displays all collected data
 * before submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Step6_Review from '@/components/wizard-steps/step-6-review';
import type { StepRenderContext } from '@/lib/wizard';

// Mock environment
vi.mock('@/config/env', () => ({
  env: {
    appBaseUrl: 'https://test.app.com',
    chainId: 84532,
  },
}));

// Mock validation
vi.mock('@/lib/validation', () => ({
  validateUrl: vi.fn(() => true),
}));

// Mock thirdweb
vi.mock('thirdweb/react', () => ({
  useActiveAccount: () => ({ address: '0x1234567890123456789012345678901234567890' }),
}));

describe('Wizard Step 6 - Review', () => {
  let mockContext: StepRenderContext;

  beforeEach(() => {
    mockContext = {
      state: {
        did: 'did:web:example.com',
        version: '1.0.0',
        name: 'Test App',
        dataUrl: 'https://test.app.com/api/data-url/did:web:example.com/v/1.0.0',
        description: 'Test app description',
        external_url: 'https://example.com',
        image: 'https://example.com/icon.png',
        interfaceFlags: { human: true, api: false, smartContract: false },
        traits: ['pay:x402', 'social'],
      },
      updateField: vi.fn(),
      errors: {},
    };
  });

  /**
   * Test: renders review summary
   */
  it('renders review summary with all data', () => {
    render(<Step6_Review {...mockContext} />);

    // Check that key data is displayed (text appears in review UI + JSON preview)
    expect(screen.getAllByText(/Test App/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument(); // Specific match in review section
  });

  /**
   * Test: displays onchain data
   */
  it('displays onchain registry data', () => {
    render(<Step6_Review {...mockContext} />);

    // Check data URL is shown
    expect(screen.getByText(/data-url/i)).toBeInTheDocument();
  });

  /**
   * Test: displays metadata fields
   */
  it('displays off-chain metadata', () => {
    render(<Step6_Review {...mockContext} />);

    // Check for specific UI pattern to avoid JSON preview match
    expect(screen.getByText('Description: Test app description')).toBeInTheDocument();
  });

  /**
   * Test: displays traits
   */
  it('displays traits when present', () => {
    render(<Step6_Review {...mockContext} />);

    // Check traits section specifically
    expect(screen.getByText('pay:x402, social')).toBeInTheDocument();
  });

  /**
   * Test: handles minimal data
   */
  it('handles minimal required data gracefully', () => {
    mockContext.state = {
      did: 'did:web:minimal.com',
      version: '0.1.0',
      name: 'Minimal App',
      interfaceFlags: { human: true, api: false, smartContract: false },
    };

    render(<Step6_Review {...mockContext} />);

    // Check specific UI pattern
    expect(screen.getByText('Name: Minimal App')).toBeInTheDocument();
  });
});

