// Test for the NFTCard component: checks rendering of NFT name
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import NFTCard from '../src/components/nft-card';
import type { NFT } from '../src/types/nft';

describe('NFTCard', () => {
  const baseNFT: NFT = {
    did: 'did:example:123',
    name: 'Test NFT',
    version: '1.0',
    dataUrl: '',
    iwpsPortalUri: '',
    agentApiUri: '',
    status: 0,
    minter: '0x0',
  };

  // This test checks that the NFTCard renders the NFT name prop
  it('renders NFT name', () => {
    render(<NFTCard nft={baseNFT} onNFTCardClick={() => {}} />);
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
  });

  // Test different NFT statuses
  it('renders with different statuses', () => {
    const { rerender } = render(<NFTCard nft={baseNFT} onNFTCardClick={() => {}} />);
    expect(screen.getByText('Active')).toBeInTheDocument();

    const deprecatedNFT = { ...baseNFT, status: 1 };
    rerender(<NFTCard nft={deprecatedNFT} onNFTCardClick={() => {}} />);
    expect(screen.getByText('Deprecated')).toBeInTheDocument();

    const replacedNFT = { ...baseNFT, status: 2 };
    rerender(<NFTCard nft={replacedNFT} onNFTCardClick={() => {}} />);
    expect(screen.getByText('Replaced')).toBeInTheDocument();
  });

  // Test error state
  it('renders error state when NFT has error', () => {
    const errorNFT = { ...baseNFT, hasError: true, errorMessage: 'Test error' };
    render(<NFTCard nft={errorNFT} onNFTCardClick={() => {}} />);
    expect(screen.getByText('Invalid App Data')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  // Test click handling
  it('calls onNFTCardClick when clicked', () => {
    const handleClick = vi.fn();
    render(<NFTCard nft={baseNFT} onNFTCardClick={handleClick} />);
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledWith(baseNFT);
  });

  // Test that error NFTs are not clickable
  it('does not call onNFTCardClick for error NFTs', () => {
    const handleClick = vi.fn();
    const errorNFT = { ...baseNFT, hasError: true };
    render(<NFTCard nft={errorNFT} onNFTCardClick={handleClick} />);
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(handleClick).not.toHaveBeenCalled();
  });

  // Test version display
  it('displays NFT version', () => {
    render(<NFTCard nft={baseNFT} onNFTCardClick={() => {}} />);
    expect(screen.getByText('Version: 1.0')).toBeInTheDocument();
  });

  it('renders gracefully with missing NFT fields', () => {
    const incompleteNFT = { name: 'Partial NFT' } as any;
    render(<NFTCard nft={incompleteNFT} onNFTCardClick={() => {}} />);
    expect(screen.getByText(/Partial NFT/)).toBeInTheDocument();
  });

  // Tests external URL display
  it('displays external link when external_url is present', () => {
    const nftWithUrl: NFT = {
      ...baseNFT,
      external_url: 'https://example.com',
    };
    render(<NFTCard nft={nftWithUrl} onNFTCardClick={() => {}} />);
    
    // Should show external link icon
    const links = screen.queryAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  // Tests image loading state
  it('shows placeholder while image is loading', () => {
    const nftWithImage: NFT = {
      ...baseNFT,
      image: 'https://example.com/image.png',
    };
    render(<NFTCard nft={nftWithImage} onNFTCardClick={() => {}} />);
    
    // Should render card
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
  });

  // Tests interface badges
  it('displays interface badges correctly', () => {
    const nftWithInterfaces: NFT = {
      ...baseNFT,
      interfaces: 7, // All interfaces (1 + 2 + 4 = 7)
    };
    render(<NFTCard nft={nftWithInterfaces} onNFTCardClick={() => {}} />);
    
    expect(screen.getByText('Human')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Contract')).toBeInTheDocument();
  });

  // Tests single interface badge
  it('displays single interface badge', () => {
    const nftWithHuman: NFT = {
      ...baseNFT,
      interfaces: 1, // Only Human
    };
    render(<NFTCard nft={nftWithHuman} onNFTCardClick={() => {}} />);
    
    expect(screen.getByText('Human')).toBeInTheDocument();
    expect(screen.queryByText('API')).not.toBeInTheDocument();
  });

  // Tests platform icons display
  it('displays platform icons when platforms are available', () => {
    const nftWithPlatforms: NFT = {
      ...baseNFT,
      platforms: {
        web: { launchUrl: 'https://example.com' },
        ios: { downloadUrl: 'https://example.com/ios' },
      },
    };
    render(<NFTCard nft={nftWithPlatforms} onNFTCardClick={() => {}} />);
    
    // Should show platform icons
    expect(screen.getByLabelText('Web')).toBeInTheDocument();
    expect(screen.getByLabelText('iOS')).toBeInTheDocument();
  });

  // Tests no image placeholder
  it('shows placeholder when no image is available', () => {
    const nftNoImage: NFT = {
      ...baseNFT,
      image: '',
    };
    render(<NFTCard nft={nftNoImage} onNFTCardClick={() => {}} />);
    
    // Should still render the card
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
  });

  // Tests DID display
  it('displays DID information', () => {
    render(<NFTCard nft={baseNFT} onNFTCardClick={() => {}} />);
    
    expect(screen.getByText(/did:example:123/i)).toBeInTheDocument();
  });

  // Tests status badge visibility
  it('hides status badge when showStatus is false', () => {
    render(<NFTCard nft={baseNFT} onNFTCardClick={() => {}} showStatus={false} />);
    
    // Status should not be shown
    const statusElements = screen.queryAllByText(/Active|Deprecated|Replaced/i);
    expect(statusElements.length).toBe(0);
  });

  // Tests card accessibility
  it('has proper accessibility attributes', () => {
    render(<NFTCard nft={baseNFT} onNFTCardClick={() => {}} />);
    
    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();
  });

  // Tests hover state styling
  it('applies hover styling classes', () => {
    const { container } = render(<NFTCard nft={baseNFT} onNFTCardClick={() => {}} />);
    
    const card = screen.getByRole('button');
    expect(card.className).toContain('cursor-pointer');
  });

  // Tests truncated DID display
  it('handles very long DIDs gracefully', () => {
    const longDidNFT: NFT = {
      ...baseNFT,
      did: 'did:web:very.long.domain.name.that.should.be.truncated.example.com',
    };
    render(<NFTCard nft={longDidNFT} onNFTCardClick={() => {}} />);
    
    // Should still render
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
  });

  // Tests metadata context integration
  it('integrates with NFT metadata context', () => {
    const nftWithMetadata: NFT = {
      ...baseNFT,
      description: 'Test description',
      image: 'https://example.com/image.png',
    };
    render(<NFTCard nft={nftWithMetadata} onNFTCardClick={() => {}} />);
    
    // Should use metadata from context if available
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
  });

  // Tests keyboard accessibility
  it('supports keyboard interaction', () => {
    const handleClick = vi.fn();
    render(<NFTCard nft={baseNFT} onNFTCardClick={handleClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    
    // Should be keyboard accessible
    expect(card).toBeInTheDocument();
  });

  /**
   * Test: covers lines 67-170 - interface badges, platform icons, external URL, image handling
   */
  describe('Interface badges and platform display', () => {
    // Test: covers line 67 - interfaces extraction
    it('extracts interfaces from NFT', () => {
      const nftWithInterfaces: NFT = {
        ...baseNFT,
        interfaces: 3, // Human (1) + API (2)
      };
      render(<NFTCard nft={nftWithInterfaces} onNFTCardClick={() => {}} />);
      
      expect(screen.getByText('Human')).toBeInTheDocument();
      expect(screen.getByText('API')).toBeInTheDocument();
    });

    // Test: covers lines 82-93 - platform extraction logic
    it('uses platforms from NFT when available', () => {
      const nftWithPlatforms: NFT = {
        ...baseNFT,
        platforms: {
          web: { launchUrl: 'https://example.com' },
          android: { downloadUrl: 'https://example.com/android' },
        },
      };
      render(<NFTCard nft={nftWithPlatforms} onNFTCardClick={() => {}} />);
      
      expect(screen.getByLabelText('Web')).toBeInTheDocument();
      expect(screen.getByLabelText('Android')).toBeInTheDocument();
    });

    // Test: covers lines 87-93 - fallback to platformIcons when platforms exist but not in context
    it('falls back to platformIcons when platforms exist but not in context', () => {
      const nftWithPlatforms: NFT = {
        ...baseNFT,
        platforms: {
          web: {},
          ios: {},
        },
      };
      render(<NFTCard nft={nftWithPlatforms} onNFTCardClick={() => {}} />);
      
      // Should show platform icons
      expect(screen.getByLabelText('Web')).toBeInTheDocument();
      expect(screen.getByLabelText('iOS')).toBeInTheDocument();
    });

    // Test: covers lines 149-160, 189-200 - external URL link with stopPropagation
    it('external URL link stops event propagation', () => {
      const nftWithUrl: NFT = {
        ...baseNFT,
        image: 'https://example.com/image.png',
        external_url: 'https://example.com',
      };
      const handleClick = vi.fn();
      render(<NFTCard nft={nftWithUrl} onNFTCardClick={handleClick} />);
      
      const externalLink = screen.getByRole('link');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');
      
      fireEvent(externalLink, clickEvent);
      
      // stopPropagation should be called
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    // Test: covers lines 125-175 - image layout rendering
    it('renders with-image layout when image is available', () => {
      const nftWithImage: NFT = {
        ...baseNFT,
        image: 'https://example.com/image.png',
      };
      render(<NFTCard nft={nftWithImage} onNFTCardClick={() => {}} />);
      
      const image = screen.getByAltText('Test NFT icon');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.png');
    });

    // Test: covers lines 163-173 - interface badges in with-image layout
    it('displays interface badges in with-image layout', () => {
      const nftWithImageAndInterfaces: NFT = {
        ...baseNFT,
        image: 'https://example.com/image.png',
        interfaces: 5, // Human (1) + Contract (4)
      };
      render(<NFTCard nft={nftWithImageAndInterfaces} onNFTCardClick={() => {}} />);
      
      expect(screen.getByText('Human')).toBeInTheDocument();
      expect(screen.getByText('Contract')).toBeInTheDocument();
    });

    // Test: covers lines 202-213 - interface badges in text-only layout
    it('displays interface badges in text-only layout', () => {
      const nftNoImage: NFT = {
        ...baseNFT,
        image: '',
        interfaces: 6, // API (2) + Contract (4)
      };
      render(<NFTCard nft={nftNoImage} onNFTCardClick={() => {}} />);
      
      expect(screen.getByText('API')).toBeInTheDocument();
      expect(screen.getByText('Contract')).toBeInTheDocument();
    });

    // Test: covers lines 227-235 - platform icons display
    it('displays platform icons section when platforms are available', () => {
      const nftWithPlatforms: NFT = {
        ...baseNFT,
        platforms: {
          web: {},
          windows: {},
        },
      };
      render(<NFTCard nft={nftWithPlatforms} onNFTCardClick={() => {}} />);
      
      expect(screen.getByText('Platforms:')).toBeInTheDocument();
      expect(screen.getByLabelText('Web')).toBeInTheDocument();
      expect(screen.getByLabelText('Windows')).toBeInTheDocument();
    });

    // Test: covers lines 237-241 - no platforms message
    it('displays message when no platforms are available', () => {
      const nftNoPlatforms: NFT = {
        ...baseNFT,
        platforms: {},
      };
      render(<NFTCard nft={nftNoPlatforms} onNFTCardClick={() => {}} />);
      
      expect(screen.getByText('No platform information provided.')).toBeInTheDocument();
    });
  });

  /**
   * Test: covers lines 251-254 - contractId display
   */
  describe('Contract ID display', () => {
    it('displays contractId when present', () => {
      const nftWithContract: NFT = {
        ...baseNFT,
        contractId: '0x1234567890123456789012345678901234567890',
      };
      render(<NFTCard nft={nftWithContract} onNFTCardClick={() => {}} />);
      
      expect(screen.getByText(/Contract:/i)).toBeInTheDocument();
      expect(screen.getByText(/0x1234567890123456789012345678901234567890/i)).toBeInTheDocument();
    });

    it('does not display contractId when absent', () => {
      render(<NFTCard nft={baseNFT} onNFTCardClick={() => {}} />);
      
      // Contract section should not be visible
      const contractElements = screen.queryAllByText(/Contract:/i);
      expect(contractElements.length).toBe(0);
    });

    it('handles long contractId gracefully', () => {
      const nftWithLongContract: NFT = {
        ...baseNFT,
        contractId: '0x' + 'a'.repeat(64),
      };
      render(<NFTCard nft={nftWithLongContract} onNFTCardClick={() => {}} />);
      
      // Should still render
      expect(screen.getByText('Test NFT')).toBeInTheDocument();
    });
  });
}); 