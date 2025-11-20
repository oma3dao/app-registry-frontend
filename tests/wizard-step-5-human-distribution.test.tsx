import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step5_HumanDistribution from '@/components/wizard-steps/step-5-human-distribution';
import type { StepRenderContext } from '@/lib/wizard';

// Mock the UrlValidator component
vi.mock('@/components/url-validator', () => ({
  UrlValidator: ({ url }: { url: string }) => (
    <div data-testid="url-validator" data-url={url}>
      {url ? 'Validating...' : 'No URL'}
    </div>
  ),
}));

// Mock the field requirements function
vi.mock('@/lib/wizard/field-requirements', () => ({
  isFieldRequired: vi.fn((path: string) => path === 'iwpsPortalUrl'),
}));

describe('Step5_HumanDistribution component', () => {
  const mockUpdateField = vi.fn();
  const mockContext: StepRenderContext = {
    state: {
      interfaceFlags: { human: true },
      iwpsPortalUrl: '',
      platforms: {},
    },
    updateField: mockUpdateField,
    errors: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders IWPS Portal URL input field', () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    expect(screen.getByLabelText('IWPS Portal URL *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://iwps.example.com/app/xyz')).toBeInTheDocument();
  });

  it('renders all platform sections', () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    const platforms = ['web', 'ios', 'android', 'windows', 'macos', 'meta', 'playstation', 'xbox', 'nintendo'];
    
    platforms.forEach(platform => {
      expect(screen.getByText(platform)).toBeInTheDocument();
    });
  });

  it('renders correct number of platform inputs', () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    // Each platform has 3 inputs: downloadUrl, launchUrl, supported
    const downloadInputs = screen.getAllByPlaceholderText('Download URL');
    const launchInputs = screen.getAllByPlaceholderText('Launch URL');
    const supportedInputs = screen.getAllByPlaceholderText('Supported features (comma-separated)');
    
    expect(downloadInputs).toHaveLength(9); // 9 platforms
    expect(launchInputs).toHaveLength(9);
    expect(supportedInputs).toHaveLength(9);
  });

  it('handles IWPS Portal URL updates', async () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    const iwpsInput = screen.getByLabelText('IWPS Portal URL *');
    fireEvent.change(iwpsInput, { target: { value: 'https://iwps.example.com/app/123' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('iwpsPortalUrl', 'https://iwps.example.com/app/123');
  });

  it('handles platform download URL updates', async () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    const webDownloadInput = screen.getAllByPlaceholderText('Download URL')[0]; // First platform (web)
    fireEvent.change(webDownloadInput, { target: { value: 'https://example.com/download' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('platforms', {
      web: { downloadUrl: 'https://example.com/download' }
    });
  });

  it('handles platform launch URL updates', async () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    const webLaunchInput = screen.getAllByPlaceholderText('Launch URL')[0]; // First platform (web)
    fireEvent.change(webLaunchInput, { target: { value: 'https://example.com/launch' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('platforms', {
      web: { launchUrl: 'https://example.com/launch' }
    });
  });

  it('handles platform supported features updates', async () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    const webSupportedInput = screen.getAllByPlaceholderText('Supported features (comma-separated)')[0];
    fireEvent.change(webSupportedInput, { target: { value: 'VR, AR, Multiplayer' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('platforms', {
      web: { supported: ['VR', 'AR', 'Multiplayer'] }
    });
  });

  it('preserves existing platform data when updating', async () => {
    const contextWithData: StepRenderContext = {
      ...mockContext,
      state: {
        ...mockContext.state,
        platforms: {
          web: {
            downloadUrl: 'https://example.com/download',
            launchUrl: 'https://example.com/launch',
            supported: ['VR'],
          },
          ios: {
            downloadUrl: 'https://apps.apple.com/app',
          },
        },
      },
    };
    
    render(<Step5_HumanDistribution {...contextWithData} />);
    
    // Update web platform's supported features
    const webSupportedInput = screen.getAllByPlaceholderText('Supported features (comma-separated)')[0];
    fireEvent.change(webSupportedInput, { target: { value: 'VR, AR' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('platforms', {
      web: {
        downloadUrl: 'https://example.com/download',
        launchUrl: 'https://example.com/launch',
        supported: ['VR', 'AR'],
      },
      ios: {
        downloadUrl: 'https://apps.apple.com/app',
      },
    });
  });

  it('displays error message for platforms validation', () => {
    const contextWithError: StepRenderContext = {
      ...mockContext,
      errors: {
        'platforms': 'At least one platform URL is required',
      },
    };
    
    render(<Step5_HumanDistribution {...contextWithError} />);
    
    expect(screen.getByText('At least one platform URL is required')).toBeInTheDocument();
    expect(screen.getByText('At least one platform URL is required')).toHaveClass('text-red-700');
  });

  it('displays error message for IWPS Portal URL validation', () => {
    const contextWithError: StepRenderContext = {
      ...mockContext,
      errors: {
        iwpsPortalUrl: 'IWPS Portal URL is required',
      },
    };
    
    render(<Step5_HumanDistribution {...contextWithError} />);
    
    expect(screen.getByText('IWPS Portal URL is required')).toBeInTheDocument();
    expect(screen.getByText('IWPS Portal URL is required')).toHaveClass('text-red-500');
  });

  it('applies error styling to IWPS Portal URL input when there is an error', () => {
    const contextWithError: StepRenderContext = {
      ...mockContext,
      errors: {
        iwpsPortalUrl: 'IWPS Portal URL is required',
      },
    };
    
    render(<Step5_HumanDistribution {...contextWithError} />);
    
    const iwpsInput = screen.getByLabelText('IWPS Portal URL *');
    expect(iwpsInput).toHaveClass('border-red-500');
  });

  it('renders UrlValidator components for IWPS Portal URL and platform URLs', () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    // Should have UrlValidator for IWPS Portal URL and all platform URLs (1 + 9*2 = 19 total)
    const urlValidators = screen.getAllByTestId('url-validator');
    expect(urlValidators).toHaveLength(19);
  });

  it('handles empty platforms metadata gracefully', () => {
    const contextWithEmptyPlatforms: StepRenderContext = {
      ...mockContext,
      state: {
        ...mockContext.state,
        platforms: undefined,
      },
    };
    
    render(<Step5_HumanDistribution {...contextWithEmptyPlatforms} />);
    
    // Should not crash and should render all platform inputs
    expect(screen.getAllByPlaceholderText('Download URL')).toHaveLength(9);
    expect(screen.getAllByPlaceholderText('Launch URL')).toHaveLength(9);
    expect(screen.getAllByPlaceholderText('Supported features (comma-separated)')).toHaveLength(9);
  });

  it('handles partial platform data correctly', () => {
    const contextWithPartialPlatforms: StepRenderContext = {
      ...mockContext,
      state: {
        ...mockContext.state,
        platforms: {
          web: {
            downloadUrl: 'https://example.com/download',
            // launchUrl and supported are undefined
          },
        },
      },
    };
    
    render(<Step5_HumanDistribution {...contextWithPartialPlatforms} />);
    
    // Should not crash and should render all platform inputs
    expect(screen.getAllByPlaceholderText('Download URL')).toHaveLength(9);
    expect(screen.getAllByPlaceholderText('Launch URL')).toHaveLength(9);
    expect(screen.getAllByPlaceholderText('Supported features (comma-separated)')).toHaveLength(9);
  });

  it('shows correct platform labels with proper capitalization', () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    expect(screen.getByText('web')).toBeInTheDocument();
    expect(screen.getByText('ios')).toBeInTheDocument();
    expect(screen.getByText('android')).toBeInTheDocument();
    expect(screen.getByText('windows')).toBeInTheDocument();
    expect(screen.getByText('macos')).toBeInTheDocument();
    expect(screen.getByText('meta')).toBeInTheDocument();
    expect(screen.getByText('playstation')).toBeInTheDocument();
    expect(screen.getByText('xbox')).toBeInTheDocument();
    expect(screen.getByText('nintendo')).toBeInTheDocument();
  });

  it('handles supported features as array correctly', () => {
    const contextWithArraySupported: StepRenderContext = {
      ...mockContext,
      state: {
        ...mockContext.state,
        platforms: {
          web: {
            supported: ['VR', 'AR', 'Multiplayer'],
          },
        },
      },
    };
    
    render(<Step5_HumanDistribution {...contextWithArraySupported} />);
    
    const webSupportedInput = screen.getAllByPlaceholderText('Supported features (comma-separated)')[0];
    expect(webSupportedInput).toHaveValue('VR, AR, Multiplayer');
  });

  it('converts supported features string to array correctly', async () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    const webSupportedInput = screen.getAllByPlaceholderText('Supported features (comma-separated)')[0];
    fireEvent.change(webSupportedInput, { target: { value: 'VR, AR, Multiplayer' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('platforms', {
      web: { supported: ['VR', 'AR', 'Multiplayer'] }
    });
  });

  it('filters out empty supported features', async () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    const webSupportedInput = screen.getAllByPlaceholderText('Supported features (comma-separated)')[0];
    fireEvent.change(webSupportedInput, { target: { value: 'VR, , AR, , Multiplayer' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('platforms', {
      web: { supported: ['VR', 'AR', 'Multiplayer'] }
    });
  });

  it('handles trimming of supported features', async () => {
    render(<Step5_HumanDistribution {...mockContext} />);
    
    const webSupportedInput = screen.getAllByPlaceholderText('Supported features (comma-separated)')[0];
    fireEvent.change(webSupportedInput, { target: { value: ' VR , AR , Multiplayer ' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('platforms', {
      web: { supported: ['VR', 'AR', 'Multiplayer'] }
    });
  });
});
