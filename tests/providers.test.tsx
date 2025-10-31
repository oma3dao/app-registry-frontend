import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Providers } from '@/app/providers';

// Mock the thirdweb provider
vi.mock('thirdweb/react', () => ({
  ThirdwebProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="thirdweb-provider">{children}</div>
  ),
}));

// Mock the NFT metadata context
vi.mock('@/lib/nft-metadata-context', () => ({
  NFTMetadataProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="nft-metadata-provider">{children}</div>
  ),
}));

describe('Providers', () => {
  it('renders children with all providers', () => {
    const TestChild = () => <div data-testid="test-child">Test Content</div>;
    
    render(
      <Providers>
        <TestChild />
      </Providers>
    );

    // Check that all providers are rendered
    expect(screen.getByTestId('thirdweb-provider')).toBeInTheDocument();
    expect(screen.getByTestId('nft-metadata-provider')).toBeInTheDocument();
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    
    // Check that the child content is rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <Providers>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </Providers>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('renders with no children', () => {
    render(<Providers>{null}</Providers>);

    // Providers should still render even with no children
    expect(screen.getByTestId('thirdweb-provider')).toBeInTheDocument();
    expect(screen.getByTestId('nft-metadata-provider')).toBeInTheDocument();
  });

  it('renders with empty children', () => {
    render(<Providers>{[]}</Providers>);

    // Providers should still render even with empty children array
    expect(screen.getByTestId('thirdweb-provider')).toBeInTheDocument();
    expect(screen.getByTestId('nft-metadata-provider')).toBeInTheDocument();
  });

  it('maintains provider hierarchy', () => {
    render(
      <Providers>
        <div data-testid="child">Child Content</div>
      </Providers>
    );

    const thirdwebProvider = screen.getByTestId('thirdweb-provider');
    const nftProvider = screen.getByTestId('nft-metadata-provider');
    const child = screen.getByTestId('child');

    // NFTMetadataProvider should be inside ThirdwebProvider
    expect(thirdwebProvider).toContainElement(nftProvider);
    expect(nftProvider).toContainElement(child);
  });
});
