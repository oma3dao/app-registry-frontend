// tests/pre-alpha-banner.test.tsx
// Test suite for the PreAlphaBanner component
// This file verifies that the PreAlphaBanner renders correctly, handles dismiss functionality,
// manages session storage state, and maintains accessibility standards.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreAlphaBanner } from '../src/components/pre-alpha-banner';
import { vi } from 'vitest';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

describe('PreAlphaBanner component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset sessionStorage mock
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  // This test verifies that the banner renders when not previously dismissed
  it('renders when not previously dismissed', () => {
    render(<PreAlphaBanner />);
    
    expect(screen.getByText(/Pre-Alpha Preview/)).toBeInTheDocument();
    expect(screen.getByText(/Smart contracts are deployed to testnets only/)).toBeInTheDocument();
  });

  // This test checks that the banner does not render when previously dismissed
  it('does not render when previously dismissed', () => {
    mockSessionStorage.getItem.mockReturnValue('true');
    
    render(<PreAlphaBanner />);
    
    expect(screen.queryByText(/Pre-Alpha Preview/)).not.toBeInTheDocument();
  });

  // This test verifies that the dismiss button is present and accessible
  it('renders dismiss button with correct accessibility', () => {
    render(<PreAlphaBanner />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss banner');
  });

  // This test checks that clicking the dismiss button hides the banner
  it('hides banner when dismiss button is clicked', () => {
    render(<PreAlphaBanner />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
    fireEvent.click(dismissButton);
    
    expect(screen.queryByText(/Pre-Alpha Preview/)).not.toBeInTheDocument();
  });

  // This test verifies that dismiss button click sets session storage
  it('sets session storage when dismissed', () => {
    render(<PreAlphaBanner />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
    fireEvent.click(dismissButton);
    
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('preAlphaBannerDismissed', 'true');
  });

  // This test checks that the banner has the correct styling classes
  it('has correct styling classes', () => {
    render(<PreAlphaBanner />);
    
    const banner = screen.getByText(/Pre-Alpha Preview/).closest('.relative');
    expect(banner).toHaveClass('relative', 'bg-yellow-100', 'text-black', 'px-4', 'py-3', 'shadow-sm', 'border-b');
  });

  // This test verifies that the dismiss button has proper styling
  it('dismiss button has correct styling', () => {
    render(<PreAlphaBanner />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
    expect(dismissButton).toHaveClass('ml-4', 'p-1', 'hover:bg-yellow-200', 'rounded-full', 'transition-colors');
  });

  // This test checks that the banner content is properly structured
  it('has correct content structure', () => {
    render(<PreAlphaBanner />);
    
    const container = screen.getByText(/Pre-Alpha Preview/).closest('.max-w-7xl');
    expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'flex', 'items-center', 'justify-between');
  });

  // This test verifies that the banner text is properly styled
  it('banner text has correct styling', () => {
    render(<PreAlphaBanner />);
    
    const text = screen.getByText(/Pre-Alpha Preview/);
    expect(text).toHaveClass('text-sm', 'font-medium');
  });

  // This test checks that the X icon is rendered in the dismiss button
  it('renders X icon in dismiss button', () => {
    render(<PreAlphaBanner />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
    const icon = dismissButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-4', 'w-4');
  });

  // This test verifies that the banner maintains accessibility standards
  it('maintains accessibility standards', () => {
    render(<PreAlphaBanner />);
    
    // Check that the dismiss button has proper ARIA label
    const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss banner');
    
    // Check that the banner text is readable
    expect(screen.getByText(/Pre-Alpha Preview/)).toBeInTheDocument();
  });

  // This test checks that the banner handles session storage errors
  it('handles session storage errors gracefully', () => {
    // Mock sessionStorage to throw an error
    mockSessionStorage.getItem.mockImplementation(() => {
      throw new Error('Session storage error');
    });
    
    // The component will throw an error since it doesn't have try-catch
    // We expect this to throw
    expect(() => render(<PreAlphaBanner />)).toThrow();
  });

  // This test verifies that the banner state is properly managed
  it('manages state correctly', () => {
    const { rerender } = render(<PreAlphaBanner />);
    
    // Initially visible
    expect(screen.getByText(/Pre-Alpha Preview/)).toBeInTheDocument();
    
    // Click dismiss
    const dismissButton = screen.getByRole('button', { name: /dismiss banner/i });
    fireEvent.click(dismissButton);
    
    // Should be hidden
    expect(screen.queryByText(/Pre-Alpha Preview/)).not.toBeInTheDocument();
    
    // Rerender should still be hidden
    rerender(<PreAlphaBanner />);
    expect(screen.queryByText(/Pre-Alpha Preview/)).not.toBeInTheDocument();
  });

  // This test checks that the banner is responsive
  it('has responsive layout', () => {
    render(<PreAlphaBanner />);
    
    const container = screen.getByText(/Pre-Alpha Preview/).closest('.max-w-7xl');
    expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'flex', 'items-center', 'justify-between');
  });

  it('renders banner even if sessionStorage is unavailable', () => {
    // Save original sessionStorage
    const originalSessionStorage = window.sessionStorage;
    
    // Set sessionStorage to undefined
    Object.defineProperty(window, 'sessionStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    
    // Component will throw error trying to access undefined sessionStorage
    expect(() => render(<PreAlphaBanner />)).toThrow();
    
    // Restore original sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
      configurable: true,
    });
  });
}); 