/**
 * Tests for Wizard Step 3 - Common Metadata
 * 
 * Tests the step that collects common metadata fields like:
 * - Description, marketing URL, image URL
 * - Summary, publisher, legal/support URLs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Step3_Common from '@/components/wizard-steps/step-3-common';
import type { StepRenderContext } from '@/lib/wizard';

// Mock field requirements
vi.mock('@/lib/wizard/field-requirements', () => ({
  isFieldRequired: vi.fn(() => true),
}));

// Mock validation
vi.mock('@/lib/validation', () => ({
  validateUrl: vi.fn(() => true),
}));

describe('Wizard Step 3 - Common Metadata', () => {
  let mockContext: StepRenderContext;

  beforeEach(() => {
    mockContext = {
      state: {
        did: 'did:web:example.com',
        version: '1.0.0',
        metadata: {},
        interfaceFlags: { human: true, api: false, smartContract: false },
      },
      updateField: vi.fn(),
      errors: {},
    };
  });

  afterEach(async () => {
    cleanup();
    // Wait for any pending async operations (debounced validations)
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  /**
   * Test: renders all common metadata fields
   */
  it('renders all common metadata fields', () => {
    render(<Step3_Common {...mockContext} />);

    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Marketing URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Icon.*URL/i)).toBeInTheDocument();
  });

  /**
   * Test: updates description field
   */
  it('updates description field', async () => {
    const user = userEvent.setup();
    render(<Step3_Common {...mockContext} />);

    const descInput = screen.getByLabelText(/Description/i);
    await user.type(descInput, 'Test app description');

    expect(mockContext.updateField).toHaveBeenCalled();
  });

  /**
   * Test: updates marketing URL field
   */
  it('updates marketing URL field', async () => {
    const user = userEvent.setup();
    render(<Step3_Common {...mockContext} />);

    const urlInput = screen.getByLabelText(/Marketing URL/i);
    await user.type(urlInput, 'https://example.com');

    expect(mockContext.updateField).toHaveBeenCalled();
  });

  /**
   * Test: updates image URL field
   */
  it('updates image URL field', async () => {
    const user = userEvent.setup();
    render(<Step3_Common {...mockContext} />);

    const imageInput = screen.getByLabelText(/Icon.*URL/i);
    await user.type(imageInput, 'https://example.com/icon.png');

    expect(mockContext.updateField).toHaveBeenCalled();
  });

  /**
   * Test: displays pre-populated data
   */
  it('displays pre-populated metadata', () => {
    mockContext.state.description = 'Existing description';
    mockContext.state.external_url = 'https://example.com';
    mockContext.state.image = 'https://example.com/icon.png';

    render(<Step3_Common {...mockContext} />);

    const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
    expect(descInput.value).toBe('Existing description');

    const urlInput = screen.getByLabelText(/Marketing URL/i) as HTMLInputElement;
    expect(urlInput.value).toBe('https://example.com');
  });

  /**
   * Test: displays validation errors
   */
  it('displays validation errors when present', () => {
    mockContext.errors = {
      'description': 'Description is required',
      'external_url': 'Invalid URL',
    };

    render(<Step3_Common {...mockContext} />);

    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid URL')).toBeInTheDocument();
  });

  /**
   * Test: handles empty metadata object
   */
  it('handles empty metadata gracefully', () => {
    mockContext.state.metadata = undefined;

    render(<Step3_Common {...mockContext} />);

    // Should render without errors
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });
});

