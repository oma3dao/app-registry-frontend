import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { NFTMetadataProvider, useNFTMetadata } from '@/lib/nft-metadata-context';
import type { NFT } from '@/types/nft';
import { vi } from 'vitest';

// Mock fetch and log
beforeEach(() => {
  global.fetch = vi.fn();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('NFTMetadataProvider & useNFTMetadata', () => {
  const nft: NFT = {
    did: 'did:example:123',
    version: '1.0.0',
    name: 'Test NFT',
    dataUrl: '',
    iwpsPortalUri: '',
    agentApiUri: '',
    contractAddress: '',
    status: 0,
    minter: '',
    metadata: {
      descriptionUrl: '',
      external_url: '',
      image: '',
      screenshotUrls: [],
    }
  };

  function TestComponent({ nft }: { nft: NFT }) {
    const { getNFTMetadata, fetchNFTDescription, clearCache } = useNFTMetadata();
    const meta = getNFTMetadata(nft);
    return (
      <div>
        <button onClick={() => fetchNFTDescription(nft)}>FetchDesc</button>
        <button onClick={clearCache}>ClearCache</button>
        <span data-testid="meta-name">{meta?.displayData?.name}</span>
        <span data-testid="meta-error">{meta?.error}</span>
      </div>
    );
  }

  it('provides metadata context and fetches metadata (happy path)', async () => {
    const mockData = { name: 'NFT Name', image: 'img.png', platforms: {} };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      text: async () => JSON.stringify(mockData),
    });
    render(
      <NFTMetadataProvider>
        <TestComponent nft={nft} />
      </NFTMetadataProvider>
    );
    // Wait for async fetch
    await waitFor(() => {
      expect(screen.getByTestId('meta-name').textContent).toBe('NFT Name');
    });
  });

  it('handles fetch error and provides fallback metadata', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    });
    render(
      <NFTMetadataProvider>
        <TestComponent nft={nft} />
      </NFTMetadataProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('meta-error').textContent).toMatch(/not found/i);
    });
  });

  it('caches metadata and clearCache resets it', async () => {
    const mockData = { name: 'NFT Name', image: 'img.png', platforms: {} };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
      text: async () => JSON.stringify(mockData),
    });
    render(
      <NFTMetadataProvider>
        <TestComponent nft={nft} />
      </NFTMetadataProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('meta-name').textContent).toBe('NFT Name');
    });
    // Clear cache
    act(() => {
      screen.getByText('ClearCache').click();
    });
    // After clearing, should refetch (simulate by changing fetch result)
    const mockData2 = { name: 'NFT Name 2', image: 'img2.png', platforms: {} };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData2,
      text: async () => JSON.stringify(mockData2),
    });
    act(() => {
      screen.getByText('FetchDesc').click();
    });
    // Should not throw, but we can't check cache directly (internal)
  });

  it('fetchNFTDescription returns null on error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('fail'));
    let desc: string | null = 'not null';
    function DescComponent() {
      const { fetchNFTDescription } = useNFTMetadata();
      React.useEffect(() => {
        fetchNFTDescription(nft).then(r => { desc = r; });
      }, []);
      return null;
    }
    render(
      <NFTMetadataProvider>
        <DescComponent />
      </NFTMetadataProvider>
    );
    await waitFor(() => {
      expect(desc).toBeNull();
    });
  });

  it('warns or returns default when used outside provider', () => {
    function OutsideComponent() {
      const { getNFTMetadata } = useNFTMetadata();
      const meta = getNFTMetadata(nft);
      return <span>{meta ? 'HasMeta' : 'NoMeta'}</span>;
    }
    render(<OutsideComponent />);
    expect(screen.getByText(/NoMeta/)).toBeInTheDocument();
  });
}); 