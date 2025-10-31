// tests/image-preview.test.tsx
// Test suite for the ImagePreview component
// This file verifies that the ImagePreview renders an image correctly and handles its props as expected.

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ImagePreview } from '../src/components/image-preview';
import * as utils from '../src/lib/utils';
import * as validation from '../src/lib/validation';
import { vi, beforeEach, afterEach } from 'vitest';

// Mock validation module
vi.mock('../src/lib/validation', () => ({
  validateUrl: vi.fn()
}));

describe('ImagePreview component', () => {
  let mockImage: any;
  let originalImage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock debounce to call immediately for most tests
    vi.spyOn(utils, 'debounce').mockImplementation((fn: any) => fn);
    
    // Mock validateUrl to return true by default
    vi.mocked(validation.validateUrl).mockReturnValue(true);
    
    // Store original Image constructor
    originalImage = global.Image;
    
    // Create a mock Image class
    mockImage = vi.fn().mockImplementation(() => ({
      onload: null,
      onerror: null,
      naturalWidth: 800,
      naturalHeight: 600,
      set src(url: string) {
        // Simulate async image loading
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    }));
    
    global.Image = mockImage;
  });

  afterEach(() => {
    global.Image = originalImage;
    vi.restoreAllMocks();
  });

  // This test checks if the ImagePreview component renders an image with the given src and alt props.
  it('renders image with correct src and alt', async () => {
    const url = 'https://example.com/image.png';
    const alt = 'Test Image';
    render(<ImagePreview url={url} alt={alt} />);
    
    // Wait for the image to appear
    const img = await screen.findByAltText(alt, {}, { timeout: 2000 });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', url);
  });

  // This test verifies that the loading state is displayed initially
  it('shows loading state initially', () => {
    const url = 'https://example.com/image.png';
    render(<ImagePreview url={url} />);
    
    expect(screen.getByText('Loading image...')).toBeInTheDocument();
    // Check for the SVG loader icon by its class
    expect(document.querySelector('.lucide-loader-circle')).toBeInTheDocument();
  });

  // This test verifies that image dimensions are displayed after successful load
  it('displays image dimensions after successful load', async () => {
    const url = 'https://example.com/image.png';
    render(<ImagePreview url={url} />);
    
    // Wait for image to load and dimensions to appear
    await waitFor(() => {
      expect(screen.getByText('800 × 600 px')).toBeInTheDocument();
    });
  });

  // This test verifies that the external link is rendered correctly
  it('renders external link to view full image', async () => {
    const url = 'https://example.com/image.png';
    render(<ImagePreview url={url} />);
    
    // Wait for image to load
    await screen.findByAltText('Image preview');
    
    const link = screen.getByRole('link', { name: /view full image/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // This test verifies error handling when image fails to load
  it('shows error state when image fails to load', async () => {
    // Mock Image to trigger onerror
    mockImage.mockImplementation(() => ({
      onload: null,
      onerror: null,
      set src(url: string) {
        setTimeout(() => {
          if (this.onerror) this.onerror();
        }, 0);
      }
    }));
    
    const url = 'https://example.com/broken-image.png';
    render(<ImagePreview url={url} />);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
    
    // Should show error icon (SVG) and styling
    expect(document.querySelector('.lucide-circle-alert')).toBeInTheDocument(); // AlertCircleIcon
  });

  // This test verifies that invalid URLs are handled correctly
  it('returns null for invalid URLs', () => {
    vi.mocked(validation.validateUrl).mockReturnValue(false);
    
    const { container } = render(<ImagePreview url="invalid-url" />);
    expect(container.firstChild).toBeNull();
  });

  // This test verifies that empty URLs are handled correctly
  it('returns null for empty URLs', () => {
    const { container } = render(<ImagePreview url="" />);
    expect(container.firstChild).toBeNull();
  });

  // This test verifies that the component handles URL changes with debouncing
  it('handles URL changes with debouncing', async () => {
    // Mock debounce to actually debounce for this test
    let debouncedCallback: any;
    vi.mocked(utils.debounce).mockImplementation((fn: any, delay: number) => {
      return (...args: any[]) => {
        debouncedCallback = () => fn(...args);
        // Return the debounced function but don't call it immediately
      };
    });
    
    const { rerender } = render(<ImagePreview url="https://example.com/image1.png" />);
    
    // Change URL - this should trigger debouncing
    rerender(<ImagePreview url="https://example.com/image2.png" />);
    
    // Since debounce is mocked to not call immediately, should not show loading yet
    expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
    
    // Now manually trigger the debounced callback
    if (debouncedCallback) {
      act(() => {
        debouncedCallback();
      });
    }
    
    // Should now show loading
    expect(screen.getByText('Loading image...')).toBeInTheDocument();
  });

  // This test verifies that the component handles the case when no dimensions are available
  it('handles missing dimensions gracefully', async () => {
    // Mock Image without naturalWidth/naturalHeight
    mockImage.mockImplementation(() => ({
      onload: null,
      onerror: null,
      set src(url: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    }));
    
    const url = 'https://example.com/image.png';
    render(<ImagePreview url={url} />);
    
    // Wait for image to load
    await screen.findByAltText('Image preview');
    
    // Should not show dimensions
    expect(screen.queryByText(/× .* px/)).not.toBeInTheDocument();
  });

  // This test verifies that custom className is applied
  it('applies custom className', () => {
    const url = 'https://example.com/image.png';
    const customClass = 'custom-preview-class';
    
    const { container } = render(<ImagePreview url={url} className={customClass} />);
    
    expect(container.querySelector(`.${customClass}`)).toBeInTheDocument();
  });

  // This test verifies that the component handles URL validation during debounced updates
  it('handles URL validation in debounced updates', async () => {
    const url = 'https://example.com/image.png';
    render(<ImagePreview url={url} />);
    
    // Initially should show loading
    expect(screen.getByText('Loading image...')).toBeInTheDocument();
    
    // Mock validateUrl to return false for the debounced URL
    vi.mocked(validation.validateUrl).mockImplementation((url: string) => {
      return url !== 'https://example.com/image.png';
    });
    
    // Wait for the validation to take effect
    await waitFor(() => {
      // Should not be loading anymore since URL is invalid
      expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
    });
  });

  // This test verifies that state is reset when URL changes
  it('resets state when URL changes', async () => {
    const { rerender } = render(<ImagePreview url="https://example.com/image1.png" />);
    
    // Wait for first image to load
    await screen.findByAltText('Image preview');
    
    // Change to a URL that will cause an error
    mockImage.mockImplementation(() => ({
      onload: null,
      onerror: null,
      set src(url: string) {
        setTimeout(() => {
          if (this.onerror) this.onerror();
        }, 0);
      }
    }));
    
    rerender(<ImagePreview url="https://example.com/broken-image.png" />);
    
    // Should show loading first, then error
    expect(screen.getByText('Loading image...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
  });

  // This test verifies that the component handles the case when debouncedUrl is empty but url is valid
  it('handles empty debouncedUrl with valid url', () => {
    // Mock debounce to not call the function immediately
    vi.mocked(utils.debounce).mockImplementation((fn: any) => {
      return () => {}; // Don't call the function
    });
    
    const url = 'https://example.com/image.png';
    render(<ImagePreview url={url} />);
    
    // Should not show loading since debouncedUrl is empty
    expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
  });
}); 