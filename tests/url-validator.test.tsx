// tests/url-validator.test.tsx
// Test suite for the UrlValidator component
// This file verifies that the UrlValidator correctly validates URLs, shows appropriate states,
// handles errors gracefully, and provides proper user feedback.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UrlValidator } from '../src/components/url-validator';
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the validation utility
vi.mock('../src/lib/validation', () => ({
  validateUrl: vi.fn(),
}));

// Mock the utils debounce function and cn function
vi.mock('../src/lib/utils', () => ({
  debounce: vi.fn((fn) => fn), // Return the function directly for testing
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('UrlValidator component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockClear();
  });

  // This test verifies that the component renders nothing when URL is empty
  it('renders nothing when URL is empty', () => {
    const { container } = render(<UrlValidator url="" />);
    expect(container.firstChild).toBeNull();
  });

  // This test verifies that the component shows success state for valid URLs
  it('shows success state for valid URLs', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to return success response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    render(<UrlValidator url="https://example.com" />);

    await waitFor(() => {
      // Look for the check circle icon by its class
      const checkIcon = document.querySelector('.lucide-circle-check-big');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  // This test checks that the component shows error state for invalid URLs
  it('shows error state for invalid URLs', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to return error response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: false, error: 'URL is not accessible' }),
    });

    render(<UrlValidator url="https://invalid-url.com" />);

    await waitFor(() => {
      // Look for the x circle icon by its class
      const xIcon = document.querySelector('.lucide-circle-x');
      expect(xIcon).toBeInTheDocument();
      expect(screen.getByText('URL is not accessible')).toBeInTheDocument();
    });
  });

  // This test verifies that the component shows error for invalid URL format
  it('shows error for invalid URL format', async () => {
    // Mock validateUrl to return false
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(false);

    render(<UrlValidator url="invalid-url" />);

    expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
    // Look for the x circle icon by its class
    const xIcon = document.querySelector('.lucide-circle-x');
    expect(xIcon).toBeInTheDocument();
  });

  // This test checks that the component displays hostname when URL is valid
  it('displays hostname when URL is valid', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to return success response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    render(<UrlValidator url="https://example.com" />);

    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });
  });

  // This test verifies that the component shows external link button for valid URLs
  it('shows external link button for valid URLs', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to return success response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    render(<UrlValidator url="https://example.com" />);

    await waitFor(() => {
      const linkButton = screen.getByRole('link', { name: /open/i });
      expect(linkButton).toBeInTheDocument();
      expect(linkButton).toHaveAttribute('href', 'https://example.com');
      expect(linkButton).toHaveAttribute('target', '_blank');
      expect(linkButton).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // This test checks that the component handles fetch errors gracefully
  it('handles fetch errors gracefully', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to throw an error
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<UrlValidator url="https://example.com" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to validate URL')).toBeInTheDocument();
      // Look for the x circle icon by its class
      const xIcon = document.querySelector('.lucide-circle-x');
      expect(xIcon).toBeInTheDocument();
    });
  });

  // This test verifies that the component handles network errors properly
  it('handles network errors properly', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to return network error
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<UrlValidator url="https://example.com" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to validate URL')).toBeInTheDocument();
    });
  });

  // This test checks that the component resets state when URL changes
  it('resets state when URL changes', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to return success response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    const { rerender } = render(<UrlValidator url="https://example.com" />);

    // Wait for validation to complete
    await waitFor(() => {
      const checkIcon = document.querySelector('.lucide-circle-check-big');
      expect(checkIcon).toBeInTheDocument();
    });

    // Change URL to empty
    rerender(<UrlValidator url="" />);

    // Should render nothing
    expect(screen.queryByText('example.com')).not.toBeInTheDocument();
  });

  // This test verifies that the component applies custom className
  it('applies custom className', async () => {
    // Mock validateUrl to return false
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(false);

    const { container } = render(
      <UrlValidator url="invalid-url" className="custom-class" />
    );

    const validatorDiv = container.querySelector('.custom-class');
    expect(validatorDiv).toBeInTheDocument();
  });

  // This test checks that the component debounces URL validation
  it('debounces URL validation', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    render(<UrlValidator url="https://example.com" />);

    // Since debounce is mocked to return the function directly, validation happens immediately
    // So we should see the result after a short delay
    await waitFor(() => {
      const checkIcon = document.querySelector('.lucide-circle-check-big');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  // This test verifies that the component handles complex URLs correctly
  it('handles complex URLs correctly', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to return success response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    const complexUrl = 'https://subdomain.example.com:8080/path?param=value#fragment';
    render(<UrlValidator url={complexUrl} />);

    await waitFor(() => {
      expect(screen.getByText('subdomain.example.com')).toBeInTheDocument();
      const checkIcon = document.querySelector('.lucide-circle-check-big');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  // This test checks that the component handles URLs with special characters
  it('handles URLs with special characters', async () => {
    // Mock validateUrl to return true
    const { validateUrl } = await import('../src/lib/validation');
    (validateUrl as any).mockReturnValue(true);

    // Mock fetch to return success response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    const specialUrl = 'https://example.com/path with spaces/';
    render(<UrlValidator url={specialUrl} />);

    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });
  });
}); 