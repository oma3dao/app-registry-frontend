import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Step4_HumanMedia from '@/components/wizard-steps/step-4-human-media';
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
  isFieldRequired: vi.fn((path: string) => path === 'screenshotUrls'),
}));

describe('Step4_HumanMedia component', () => {
  const mockUpdateField = vi.fn();
  const mockContext: StepRenderContext = {
    state: {
      interfaceFlags: { human: true },
      screenshotUrls: [],
      videoUrls: [],
      threeDAssetUrls: [],
    },
    updateField: mockUpdateField,
    errors: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all media input sections', () => {
    render(<Step4_HumanMedia {...mockContext} />);
    
    // Check for screenshots section
    expect(screen.getByText('Screenshots')).toBeInTheDocument();
    expect(screen.getByText('At least one valid URL is required. Up to 5.')).toBeInTheDocument();
    
    // Check for video URLs section
    expect(screen.getByText('Video URLs (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Links to promotional videos, demos, or tutorials. Up to 3.')).toBeInTheDocument();
    
    // Check for 3D Asset URLs section
    expect(screen.getByText('3D Asset URLs (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Links to 3D models (GLB, USDZ, etc.) for AR/VR experiences. Up to 3.')).toBeInTheDocument();
  });

  it('renders correct number of input fields', () => {
    render(<Step4_HumanMedia {...mockContext} />);
    
    // Should have 5 screenshot inputs
    const screenshotInputs = screen.getAllByPlaceholderText(/screenshot-\d+\.png/);
    expect(screenshotInputs).toHaveLength(5);
    
    // Should have 3 video inputs
    const videoInputs = screen.getAllByPlaceholderText(/video-\d+\.mp4/);
    expect(videoInputs).toHaveLength(3);
    
    // Should have 3 3D asset inputs
    const assetInputs = screen.getAllByPlaceholderText(/model-\d+\.glb/);
    expect(assetInputs).toHaveLength(3);
  });

  it('handles screenshot URL updates correctly', async () => {
    render(<Step4_HumanMedia {...mockContext} />);
    
    const firstScreenshotInput = screen.getByPlaceholderText('https://example.com/screenshot-1.png');
    fireEvent.change(firstScreenshotInput, { target: { value: 'https://example.com/screenshot1.png' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('screenshotUrls', ['https://example.com/screenshot1.png']);
  });

  it('handles video URL updates correctly', async () => {
    render(<Step4_HumanMedia {...mockContext} />);
    
    const firstVideoInput = screen.getByPlaceholderText('https://example.com/video-1.mp4 or YouTube/Vimeo URL');
    fireEvent.change(firstVideoInput, { target: { value: 'https://youtube.com/watch?v=123' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('videoUrls', ['https://youtube.com/watch?v=123']);
  });

  it('handles 3D asset URL updates correctly', async () => {
    render(<Step4_HumanMedia {...mockContext} />);
    
    const firstAssetInput = screen.getByPlaceholderText('https://example.com/model-1.glb');
    fireEvent.change(firstAssetInput, { target: { value: 'https://example.com/model.glb' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('threeDAssetUrls', ['https://example.com/model.glb']);
  });

  it('preserves existing values when updating arrays', async () => {
    const contextWithData: StepRenderContext = {
      ...mockContext,
      state: {
        ...mockContext.state,
        screenshotUrls: ['https://example.com/screenshot1.png', 'https://example.com/screenshot2.png'],
        videoUrls: ['https://youtube.com/video1'],
        threeDAssetUrls: ['https://example.com/model1.glb'],
      },
    };
    
    render(<Step4_HumanMedia {...contextWithData} />);
    
    // Update the third screenshot (index 2)
    const thirdScreenshotInput = screen.getByPlaceholderText('https://example.com/screenshot-3.png');
    fireEvent.change(thirdScreenshotInput, { target: { value: 'https://example.com/screenshot3.png' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('screenshotUrls', [
      'https://example.com/screenshot1.png',
      'https://example.com/screenshot2.png',
      'https://example.com/screenshot3.png',
    ]);
  });

  it('displays error message for screenshot validation', () => {
    const contextWithError: StepRenderContext = {
      ...mockContext,
      errors: {
        'screenshotUrls': 'At least one screenshot URL is required',
      },
    };
    
    render(<Step4_HumanMedia {...contextWithError} />);
    
    expect(screen.getByText('At least one screenshot URL is required')).toBeInTheDocument();
    expect(screen.getByText('At least one screenshot URL is required')).toHaveClass('text-red-500');
  });

  it('applies error styling to first screenshot input when there is an error', () => {
    const contextWithError: StepRenderContext = {
      ...mockContext,
      errors: {
        'screenshotUrls': 'At least one screenshot URL is required',
      },
    };
    
    render(<Step4_HumanMedia {...contextWithError} />);
    
    const firstScreenshotInput = screen.getByPlaceholderText('https://example.com/screenshot-1.png');
    expect(firstScreenshotInput).toHaveClass('border-red-500');
  });

  it('renders UrlValidator components for each input', () => {
    render(<Step4_HumanMedia {...mockContext} />);
    
    // Should have UrlValidator for each input (5 + 3 + 3 = 11 total)
    const urlValidators = screen.getAllByTestId('url-validator');
    expect(urlValidators).toHaveLength(11);
  });

  it('shows correct placeholder text for each input type', () => {
    render(<Step4_HumanMedia {...mockContext} />);
    
    // Screenshot placeholders
    expect(screen.getByPlaceholderText('https://example.com/screenshot-1.png')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com/screenshot-5.png')).toBeInTheDocument();
    
    // Video placeholders
    expect(screen.getByPlaceholderText('https://example.com/video-1.mp4 or YouTube/Vimeo URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com/video-3.mp4 or YouTube/Vimeo URL')).toBeInTheDocument();
    
    // 3D asset placeholders
    expect(screen.getByPlaceholderText('https://example.com/model-1.glb')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com/model-3.glb')).toBeInTheDocument();
  });

  it('shows supported 3D asset formats', () => {
    render(<Step4_HumanMedia {...mockContext} />);
    
    expect(screen.getByText('Common formats: GLB, USDZ, FBX, OBJ')).toBeInTheDocument();
  });

  it('handles empty metadata gracefully', () => {
    const contextWithEmptyMetadata: StepRenderContext = {
      ...mockContext,
      state: {
        ...mockContext.state,
        screenshotUrls: undefined,
        videoUrls: undefined,
        threeDAssetUrls: undefined,
      },
    };
    
    render(<Step4_HumanMedia {...contextWithEmptyMetadata} />);
    
    // Should not crash and should render all inputs
    expect(screen.getAllByPlaceholderText(/screenshot-\d+\.png/)).toHaveLength(5);
    expect(screen.getAllByPlaceholderText(/video-\d+\.mp4/)).toHaveLength(3);
    expect(screen.getAllByPlaceholderText(/model-\d+\.glb/)).toHaveLength(3);
  });

  it('handles partial metadata gracefully', () => {
    const contextWithPartialMetadata: StepRenderContext = {
      ...mockContext,
      state: {
        ...mockContext.state,
        screenshotUrls: ['https://example.com/screenshot1.png'],
        // videoUrls and threeDAssetUrls are undefined
      },
    };
    
    render(<Step4_HumanMedia {...contextWithPartialMetadata} />);
    
    // Should not crash and should render all inputs
    expect(screen.getAllByPlaceholderText(/screenshot-\d+\.png/)).toHaveLength(5);
    expect(screen.getAllByPlaceholderText(/video-\d+\.mp4/)).toHaveLength(3);
    expect(screen.getAllByPlaceholderText(/model-\d+\.glb/)).toHaveLength(3);
  });

  it('updates multiple fields in the same array correctly', async () => {
    const contextWithData: StepRenderContext = {
      ...mockContext,
      state: {
        ...mockContext.state,
        screenshotUrls: ['https://example.com/screenshot1.png'],
        videoUrls: [],
        threeDAssetUrls: [],
      },
    };
    
    render(<Step4_HumanMedia {...contextWithData} />);
    
    // Update second screenshot
    const secondScreenshotInput = screen.getByPlaceholderText('https://example.com/screenshot-2.png');
    fireEvent.change(secondScreenshotInput, { target: { value: 'https://example.com/screenshot2.png' } });
    
    expect(mockUpdateField).toHaveBeenCalledWith('screenshotUrls', [
      'https://example.com/screenshot1.png',
      'https://example.com/screenshot2.png',
    ]);
  });
});
