/**
 * Tests for Wizard Step 6 - Review
 * 
 * Tests the final review step that displays all collected data
 * before submission
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Step6_Review from '@/components/wizard-steps/step-6-review';
import type { StepRenderContext } from '@/lib/wizard';
import * as offchainJson from '@/lib/utils/offchain-json';
import * as dataurlUtils from '@/lib/utils/dataurl';

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(screen.getByText(/Data URL: —/)).toBeInTheDocument();
    expect(screen.getByText(/0 \(keccak256\)/)).toBeInTheDocument();
    expect(screen.getByText(/0x0{64}/)).toBeInTheDocument();
  });

  it('shows CAIP-10 owner and platform distribution details when present', () => {
    mockContext.state = {
      ...mockContext.state,
      platforms: {
        web: { downloadUrl: 'https://web', launchUrl: 'https://launch' },
        windows: { downloadUrl: 'https://win.exe' },
      },
      iwpsPortalUrl: 'https://portal.example',
    };

    render(<Step6_Review {...mockContext} />);

    const platformsSection = screen.getByText(/Platforms:/).parentElement!;
    const webRow = within(platformsSection).getAllByText(/web:/i)[0].parentElement!;
    const winRow = within(platformsSection).getAllByText(/windows:/i)[0].parentElement!;
    expect(webRow).toHaveTextContent('download=https://web, launch=https://launch');
    expect(winRow).toHaveTextContent('download=https://win.exe');
    expect(screen.getByText(/IWPS Portal URL: https:\/\/portal\.example/)).toBeInTheDocument();
    expect(screen.getByText(/eip155:84532:0x1234567890123456789012345678901234567890/i)).toBeInTheDocument();
  });

  it('renders fallback JSON when metadata builder throws', () => {
    vi.spyOn(offchainJson, 'buildOffchainMetadataObject').mockImplementation(() => {
      throw new Error('boom');
    });
    const canonicalSpy = vi.spyOn(dataurlUtils, 'canonicalizeForHash');
    canonicalSpy.mockReturnValue({ jcsJson: '{}', hash: '0x' + '0'.repeat(64) });

    render(<Step6_Review {...mockContext} />);

    expect(
      screen.getByText((_, node) => node?.textContent?.trim() === '{}')
    ).toBeInTheDocument();
    expect(canonicalSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to empty traits and media when none provided', () => {
    mockContext.state = {
      ...mockContext.state,
      traits: [],
      screenshotUrls: [],
      description: '',
    };

    render(<Step6_Review {...mockContext} />);

    const traitsValue = screen.getByText(/Traits/i).nextElementSibling!;
    const mediaValue = screen.getByText(/Screenshots/i);
    expect(traitsValue).toHaveTextContent('—');
    expect(mediaValue.parentElement).toHaveTextContent('Screenshots: —');
  });
});

