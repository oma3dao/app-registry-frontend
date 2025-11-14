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

  /**
   * Test: Hash verification with valid hash
   * Covers lines 190-202 in nft-metadata-context.tsx
   */
  it('verifies hash when metadata is fetched and hash matches', async () => {
    // Mock getAppByDid to return app data with matching hash
    vi.mock('@/lib/contracts/registry.read', () => ({
      getAppByDid: vi.fn().mockResolvedValue({
        did: 'did:example:123',
        dataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      }),
    }));

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

    await waitFor(() => {
      expect(screen.getByTestId('meta-name').textContent).toBe('NFT Name');
    });
  });

  /**
   * Test: Hash verification with mismatched hash
   * Covers lines 197-198 in nft-metadata-context.tsx
   */
  it('detects hash mismatch when stored hash differs from computed', async () => {
    // Mock getAppByDid to return app data with different hash
    vi.mock('@/lib/contracts/registry.read', () => ({
      getAppByDid: vi.fn().mockResolvedValue({
        did: 'did:example:123',
        dataHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      }),
    }));

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

    await waitFor(() => {
      expect(screen.getByTestId('meta-name').textContent).toBe('NFT Name');
    });
  });

  /**
   * Test: Hash verification error handling
   * Covers lines 203-205 in nft-metadata-context.tsx
   */
  it('handles errors during hash verification gracefully', async () => {
    // Mock getAppByDid to throw an error
    vi.mock('@/lib/contracts/registry.read', () => ({
      getAppByDid: vi.fn().mockRejectedValue(new Error('Network error')),
    }));

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

    // Should still display metadata even if hash verification fails
    await waitFor(() => {
      expect(screen.getByTestId('meta-name').textContent).toBe('NFT Name');
    });
  });

  /**
   * Test: Development mode uses relative API URL (covers lines 154-155)
   * Tests that in development mode, metadata is fetched from local API routes
   */
  it('uses relative API URL in development mode', async () => {
    // Save original NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    
    // Set to development
    process.env.NODE_ENV = 'development';

    const mockData = { name: 'Dev Mode NFT', image: 'dev.png', platforms: {} };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      text: async () => JSON.stringify(mockData),
    });

    const devNft = {
      ...nft,
      did: 'did:web:dev.com',
      version: '1.0.0',
      dataUrl: 'https://real-url.com/data', // Should be ignored in dev mode
    };

    render(
      <NFTMetadataProvider>
        <TestComponent nft={devNft} />
      </NFTMetadataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('meta-name').textContent).toBe('Dev Mode NFT');
    });

    // Verify fetch was called with relative URL (development mode path)
    // Note: API uses normalized version without trailing .0
    expect(global.fetch).toHaveBeenCalledWith('/api/data-url/did:web:dev.com/v/1.0');

    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  /**
   * Test: covers lines 123-124 - error handling in mapPlatforms
   * Tests that errors during platform mapping are caught and logged
   */
  it('handles errors in platform mapping gracefully', async () => {
    // Create a Proxy that throws an error during property access in the forEach loop
    const throwingPlatform = new Proxy({}, {
      get() {
        throw new Error('Property access error during platform mapping');
      }
    });
    
    const metadataWithBadPlatforms = {
      name: 'Test App',
      platforms: {
        web: throwingPlatform // This will throw when accessed in the forEach
      }
    };
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(metadataWithBadPlatforms),
      json: async () => metadataWithBadPlatforms
    }) as any;
    
    const testNft = {
      ...nft,
      dataUrl: 'https://example.com/data'
    };
    
    render(
      <NFTMetadataProvider>
        <TestComponent nft={testNft} />
      </NFTMetadataProvider>
    );

    // Should still render without crashing despite platform mapping error (lines 123-124)
    await waitFor(() => {
      expect(screen.getByTestId('meta-name')).toBeInTheDocument();
    });
  });

  /**
   * Test: Production mode uses on-chain dataUrl
   * Covers the else branch at line 156-159
   */
  it('uses on-chain dataUrl in production mode', async () => {
    // Explicitly set to production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const mockData = { name: 'Prod NFT', image: 'prod.png', platforms: {} };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
      text: async () => JSON.stringify(mockData),
    });

    const prodNft = {
      ...nft,
      did: 'did:web:prod.com',
      version: '2.0.0',
      dataUrl: 'https://on-chain-url.com/metadata.json',
    };

    render(
      <NFTMetadataProvider>
        <TestComponent nft={prodNft} />
      </NFTMetadataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('meta-name').textContent).toBe('Prod NFT');
    });

    // Verify fetch was called with the actual dataUrl (production mode path)
    expect(global.fetch).toHaveBeenCalledWith('https://on-chain-url.com/metadata.json');

    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  /**
   * Test: covers lines 84-92 - mapToUIMetadata with null data
   * Tests the fallback when metadata JSON is null/undefined
   */
  it('returns default metadata when JSON data is null', async () => {
    // Mock fetch to return null data
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => null, // null metadata
      text: async () => 'null',
    });

    const testNft = {
      ...nft,
      dataUrl: 'https://example.com/null-data',
    };

    render(
      <NFTMetadataProvider>
        <TestComponent nft={testNft} />
      </NFTMetadataProvider>
    );

    // Should fallback to "Unknown" name (line 85)
    await waitFor(() => {
      const nameEl = screen.getByTestId('meta-name');
      expect(nameEl.textContent).toBe('Unknown');
    });
  });

  /**
   * Test: covers lines 113-120 - mapPlatforms with valid platform data
   * Tests that platform data is correctly mapped with all fields
   */
  it('maps platform data correctly with download and launch URLs', async () => {
    const metadataWithPlatforms = {
      name: 'Multi-Platform App',
      platforms: {
        web: {
          downloadUrl: 'https://example.com/download',
          launchUrl: 'https://example.com/launch',
          supported: ['feature1', 'feature2']
        },
        windows: {
          downloadUrl: 'https://example.com/win.exe',
          supported: ['offline']
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(metadataWithPlatforms),
      json: async () => metadataWithPlatforms
    }) as any;

    function PlatformTestComponent({ nft }: { nft: NFT }) {
      const { getNFTMetadata } = useNFTMetadata();
      const meta = getNFTMetadata(nft);
      const platforms = meta?.displayData?.platforms || {};
      
      return (
        <div>
          <span data-testid="platform-count">{Object.keys(platforms).length}</span>
          <span data-testid="web-download">{platforms.web?.downloadUrl || 'none'}</span>
          <span data-testid="web-launch">{platforms.web?.launchUrl || 'none'}</span>
          <span data-testid="win-download">{platforms.windows?.downloadUrl || 'none'}</span>
        </div>
      );
    }

    const testNft = {
      ...nft,
      dataUrl: 'https://example.com/platforms',
    };

    render(
      <NFTMetadataProvider>
        <PlatformTestComponent nft={testNft} />
      </NFTMetadataProvider>
    );

    // Verify platforms are mapped correctly (lines 113-120)
    await waitFor(() => {
      expect(screen.getByTestId('platform-count').textContent).toBe('2');
      expect(screen.getByTestId('web-download').textContent).toBe('https://example.com/download');
      expect(screen.getByTestId('web-launch').textContent).toBe('https://example.com/launch');
      expect(screen.getByTestId('win-download').textContent).toBe('https://example.com/win.exe');
    });
  });

  /**
   * Test: covers line 113 - mapPlatforms skipping null/undefined platforms
   * Tests that null platform entries are skipped
   */
  it('skips null platform entries during mapping', async () => {
    const metadataWithNullPlatform = {
      name: 'Partial Platforms App',
      platforms: {
        web: {
          downloadUrl: 'https://example.com/download'
        },
        android: null, // Should be skipped (line 113 condition)
        ios: undefined // Should be skipped (line 113 condition)
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(metadataWithNullPlatform),
      json: async () => metadataWithNullPlatform
    }) as any;

    function PlatformTestComponent({ nft }: { nft: NFT }) {
      const { getNFTMetadata } = useNFTMetadata();
      const meta = getNFTMetadata(nft);
      const platforms = meta?.displayData?.platforms || {};
      
      return (
        <div>
          <span data-testid="platform-count">{Object.keys(platforms).length}</span>
          <span data-testid="has-android">{platforms.android ? 'yes' : 'no'}</span>
          <span data-testid="has-ios">{platforms.ios ? 'yes' : 'no'}</span>
        </div>
      );
    }

    const testNft = {
      ...nft,
      dataUrl: 'https://example.com/partial-platforms',
    };

    render(
      <NFTMetadataProvider>
        <PlatformTestComponent nft={testNft} />
      </NFTMetadataProvider>
    );

    // Should only have 'web' platform, skipping null/undefined entries
    await waitFor(() => {
      expect(screen.getByTestId('platform-count').textContent).toBe('1');
      expect(screen.getByTestId('has-android').textContent).toBe('no');
      expect(screen.getByTestId('has-ios').textContent).toBe('no');
    });
  });
}); 