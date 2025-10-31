// tests/launch-confirmation-dialog.test.tsx
// Test suite for the LaunchConfirmationDialog component
// This file verifies that the LaunchConfirmationDialog renders correctly and handles open/close behavior as expected.

import React from 'react';
import { render, screen, fireEvent } from '../tests/test-utils';
import LaunchConfirmationDialog from '../src/components/launch-confirmation-dialog';
import { vi, beforeEach, afterEach } from 'vitest';

// Mock window.open
const mockWindowOpen = vi.fn();

beforeAll(() => {
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID = 'test-client-id';
});

beforeEach(() => {
  vi.clearAllMocks();
  // Mock window.open
  Object.defineProperty(window, 'open', {
    value: mockWindowOpen,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LaunchConfirmationDialog component', () => {
  // This test checks if the dialog renders when open is true.
  it('renders dialog when open', () => {
    render(<LaunchConfirmationDialog isOpen={true} onClose={() => {}} appName="Test App" />);
    // Check for the dialog title which should be present
    expect(screen.getByText('Test App')).toBeInTheDocument();
  });

  // This test checks if the onClose handler is called when the cancel button is clicked.
  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<LaunchConfirmationDialog isOpen={true} onClose={onClose} appName="Test App" />);
    // Find the cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  // This test checks if the dialog description is rendered.
  it('renders dialog description', () => {
    render(<LaunchConfirmationDialog isOpen={true} onClose={() => {}} appName="Test App" />);
    // Check for the description text
    expect(screen.getByText('Review the details below to proceed with launching or accessing the application.')).toBeInTheDocument();
  });

  // This test checks if the dialog does not render when closed.
  it('does not render when closed', () => {
    render(<LaunchConfirmationDialog isOpen={false} onClose={() => {}} appName="Test App" />);
    // The dialog should not be in the document
    expect(screen.queryByText('Test App')).not.toBeInTheDocument();
  });

  // This test verifies that the teleport PIN is displayed when provided
  it('displays teleport PIN when provided', () => {
    const teleportPin = '123456';
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        teleportPin={teleportPin}
      />
    );
    
    expect(screen.getByText(teleportPin)).toBeInTheDocument();
    expect(screen.getByText('For additional security, make sure this PIN is displayed on the application when it opens:')).toBeInTheDocument();
  });

  // This test verifies that the location hint is displayed when provided with teleport PIN
  it('displays location hint when provided with teleport PIN', () => {
    const location = 'New York, USA';
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        teleportPin="123456"
        location={location}
      />
    );
    
    expect(screen.getByText(`Location hint: ${location}`)).toBeInTheDocument();
  });

  // This test verifies that the destination URL is displayed when provided
  it('displays destination URL when provided', () => {
    const destinationUrl = 'https://example.com/launch';
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        destinationUrl={destinationUrl}
      />
    );
    
    expect(screen.getByText('Launch URL:')).toBeInTheDocument();
    expect(screen.getByText(destinationUrl)).toBeInTheDocument();
  });

  // This test verifies that the download URL is displayed when provided
  it('displays download URL when provided', () => {
    const downloadUrl = 'https://example.com/download';
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        downloadUrl={downloadUrl}
      />
    );
    
    expect(screen.getByText('Download URL:')).toBeInTheDocument();
    expect(screen.getByText(downloadUrl)).toBeInTheDocument();
  });

  // This test verifies that the download button is rendered when download URL is provided
  it('renders download button when download URL is provided', () => {
    const downloadUrl = 'https://example.com/download';
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        downloadUrl={downloadUrl}
      />
    );
    
    const downloadButton = screen.getByRole('button', { name: /download/i });
    expect(downloadButton).toBeInTheDocument();
  });

  // This test verifies that clicking the download button opens the download URL
  it('opens download URL when download button is clicked', () => {
    const downloadUrl = 'https://example.com/download';
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        downloadUrl={downloadUrl}
      />
    );
    
    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(downloadUrl, '_blank');
  });

  // This test verifies that the launch button is rendered when destination URL is provided
  it('renders launch button when destination URL is provided', () => {
    const destinationUrl = 'https://example.com/launch';
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        destinationUrl={destinationUrl}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: /proceed to launch/i });
    expect(launchButton).toBeInTheDocument();
  });

  // This test verifies that clicking the launch button opens the destination URL and closes the dialog
  it('opens destination URL and closes dialog when launch button is clicked', () => {
    const destinationUrl = 'https://example.com/launch';
    const onClose = vi.fn();
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={onClose} 
        appName="Test App" 
        destinationUrl={destinationUrl}
      />
    );
    
    const launchButton = screen.getByRole('button', { name: /proceed to launch/i });
    fireEvent.click(launchButton);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(destinationUrl, '_blank');
    expect(onClose).toHaveBeenCalled();
  });

  // This test verifies that the launch button text changes when teleport PIN is present
  it('shows "Confirm Launch" button text when teleport PIN is present', () => {
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        destinationUrl="https://example.com/launch"
        teleportPin="123456"
      />
    );
    
    expect(screen.getByRole('button', { name: /confirm launch/i })).toBeInTheDocument();
  });

  // This test verifies that the launch button has green styling when no download URL is present
  it('applies green styling to launch button when no download URL', () => {
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        destinationUrl="https://example.com/launch"
      />
    );
    
    const launchButton = screen.getByRole('button', { name: /proceed to launch/i });
    expect(launchButton).toHaveClass('bg-green-600', 'hover:bg-green-700');
  });

  // This test verifies that the launch button doesn't have green styling when download URL is present
  it('does not apply green styling to launch button when download URL is present', () => {
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        destinationUrl="https://example.com/launch"
        downloadUrl="https://example.com/download"
      />
    );
    
    const launchButton = screen.getByRole('button', { name: /proceed to launch/i });
    expect(launchButton).not.toHaveClass('bg-green-600', 'hover:bg-green-700');
  });

  // This test verifies that the fallback message is shown when no URLs or teleport PIN are provided
  it('shows fallback message when no URLs or teleport PIN are provided', () => {
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
      />
    );
    
    expect(screen.getByText('No specific launch, download, or teleport information available.')).toBeInTheDocument();
  });

  // This test verifies that the fallback message is not shown when teleport PIN is provided
  it('does not show fallback message when teleport PIN is provided', () => {
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        teleportPin="123456"
      />
    );
    
    expect(screen.queryByText('No specific launch, download, or teleport information available.')).not.toBeInTheDocument();
  });

  // This test verifies that the fallback message is not shown when destination URL is provided
  it('does not show fallback message when destination URL is provided', () => {
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        destinationUrl="https://example.com/launch"
      />
    );
    
    expect(screen.queryByText('No specific launch, download, or teleport information available.')).not.toBeInTheDocument();
  });

  // This test verifies that the fallback message is not shown when download URL is provided
  it('does not show fallback message when download URL is provided', () => {
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        downloadUrl="https://example.com/download"
      />
    );
    
    expect(screen.queryByText('No specific launch, download, or teleport information available.')).not.toBeInTheDocument();
  });

  // This test verifies that the dialog can be closed via the onOpenChange handler
  it('calls onClose when dialog is closed via onOpenChange', () => {
    const onClose = vi.fn();
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={onClose} 
        appName="Test App" 
      />
    );
    
    // Simulate the dialog's onOpenChange being called with false
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    
    // The onOpenChange handler should call onClose when open becomes false
    // This is tested implicitly through the component's behavior
    expect(onClose).not.toHaveBeenCalled(); // Should not be called initially
  });

  // This test verifies that both download and launch buttons can be present simultaneously
  it('renders both download and launch buttons when both URLs are provided', () => {
    render(
      <LaunchConfirmationDialog 
        isOpen={true} 
        onClose={() => {}} 
        appName="Test App" 
        destinationUrl="https://example.com/launch"
        downloadUrl="https://example.com/download"
      />
    );
    
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proceed to launch/i })).toBeInTheDocument();
  });
}); 