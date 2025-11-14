import { describe, it, expect, vi } from 'vitest'

// Use vi.hoisted() to ensure mocks are available before module evaluation
const mockBuildOffchain = vi.hoisted(() => vi.fn((obj: any) => ({ ...obj, _mapped: true })))
const mockCanonicalizeForHash = vi.hoisted(() => vi.fn((obj: any) => ({ 
  hash: '0x' + 'a'.repeat(64) as `0x${string}`, 
  jcsJson: JSON.stringify(obj) 
})))
const mockHashTraits = vi.hoisted(() => vi.fn((traits: string[]) => traits.map((t) => `hash_${t}`)))

// Mock dependencies BEFORE importing the module under test
vi.mock('@/config/env', () => ({
  env: { appBaseUrl: 'https://app.oma3.org' },
}))

vi.mock('@/lib/utils/offchain-json', () => ({
  buildOffchainMetadataObject: mockBuildOffchain,
}))

vi.mock('@/lib/utils/dataurl', () => ({
  canonicalizeForHash: mockCanonicalizeForHash,
}))

vi.mock('@/lib/utils/traits', () => ({
  hashTraits: mockHashTraits,
}))

// Override the global mock from setup.ts to get the real implementation
vi.mock('@/schema/mapping', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/schema/mapping')>()
  return {
    ...actual,
    // Keep the real implementations instead of mocked ones
  }
})

// Import after mocks are defined
import { isOurHostedUrl, toMintAppInput, toUpdateAppInput } from '@/schema/mapping'

describe('schema/mapping (complex functions)', () => {
  it('toMintAppInput function is imported correctly', () => {
    expect(typeof toMintAppInput).toBe('function')
    expect(typeof toUpdateAppInput).toBe('function')
  })
  
  it('toMintAppInput converts NFT to MintAppInput correctly', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '2.3.4',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: ['trait1', 'trait2'],
      interfaceFlags: { human: true, api: false, smartContract: true },
      fungibleTokenId: 'eip155:1:0x123',
      contractId: '0x456',
    }

    const result = toMintAppInput(nft)
    expect(result).toBeDefined()

    expect(result.did).toBe('did:web:test.com')
    expect(result.initialVersionMajor).toBe(2)
    expect(result.initialVersionMinor).toBe(3)
    expect(result.initialVersionPatch).toBe(4)
    expect(result.interfaces).toBe(1 + 4) // human (1) + smartContract (4)
    expect(result.dataHash).toMatch(/^0x[a-f0-9]{64}$/)
    expect(result.traitHashes).toEqual(['hash_trait1', 'hash_trait2'])
    expect(result.fungibleTokenId).toBe('eip155:1:0x123')
    expect(result.contractId).toBe('0x456')
    expect(result.metadataJson).toBeTruthy() // Should include metadataJson when hosted
  })

  it('toMintAppInput excludes metadataJson for non-hosted URLs', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://example.com/data.json', // External URL
      traits: [],
      interfaceFlags: { human: true, api: false, smartContract: false },
    }

    const result = toMintAppInput(nft)

    expect(result.metadataJson).toBe('') // Should be empty for non-hosted URLs
  })

  it('toUpdateAppInput converts NFT to UpdateAppInput correctly', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.5.10',
      name: 'Updated App',
      dataUrl: 'https://app.oma3.org/new-data.json',
      traits: ['trait1'],
      interfaceFlags: { human: true, api: true, smartContract: false },
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    expect(result.did).toBe('did:web:test.com')
    expect(result.major).toBe(1) // From currentVersion
    expect(result.newMinor).toBe(5)
    expect(result.newPatch).toBe(10)
    expect(result.newInterfaces).toBe(1 + 2) // human (1) + api (2)
    expect(result.newDataHash).toMatch(/^0x[a-f0-9]{64}$/)
    expect(result.newTraitHashes).toEqual(['hash_trait1'])
    expect(result.metadataJson).toBeTruthy() // Should include metadataJson when hosted
  })

  it('toUpdateAppInput excludes metadataJson for non-hosted URLs', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.1.0',
      name: 'Updated App',
      dataUrl: 'https://external.com/data.json', // External URL
      traits: [],
      interfaceFlags: { human: true, api: false, smartContract: false },
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    expect(result.metadataJson).toBe('') // Should be empty for non-hosted URLs
  })

  /**
   * Test: covers branch when canonicalizeForHash returns null (line 96)
   * This tests the fallback to zero hash when jcs is null/undefined
   * Note: This tests the dataHash branch, but metadataJson will still use jcs.jcsJson
   * which requires a non-hosted URL to avoid the jcs.jcsJson access
   */
  it('toMintAppInput uses zero hash when canonicalizeForHash returns null', () => {
    // Temporarily mock canonicalizeForHash to return null
    mockCanonicalizeForHash.mockReturnValueOnce(null as any)

    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://example.com/data.json', // Non-hosted URL to avoid jcs.jcsJson access
      traits: ['trait1'],
      interfaceFlags: { human: true, api: false, smartContract: false },
    }

    const result = toMintAppInput(nft)

    expect(result.dataHash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000')
    
    // Reset mock for other tests
    mockCanonicalizeForHash.mockReturnValue({ 
      hash: '0x' + 'a'.repeat(64) as `0x${string}`, 
      jcsJson: JSON.stringify({}) 
    })
  })

  /**
   * Test: covers branch when canonicalizeForHash returns null (line 96)
   * This tests the fallback to zero hash when jcs is null/undefined for toUpdateAppInput
   */
  it('toUpdateAppInput uses zero hash when canonicalizeForHash returns null', () => {
    // Temporarily mock canonicalizeForHash to return null
    mockCanonicalizeForHash.mockReturnValueOnce(null as any)

    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://example.com/data.json', // Non-hosted URL to avoid jcs.jcsJson access
      traits: ['trait1'],
      interfaceFlags: { human: true, api: false, smartContract: false },
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    expect(result.newDataHash).toBe('0x0000000000000000000000000000000000000000000000000000000000000000')
    
    // Reset mock for other tests
    mockCanonicalizeForHash.mockReturnValue({ 
      hash: '0x' + 'a'.repeat(64) as `0x${string}`, 
      jcsJson: JSON.stringify({}) 
    })
  })

  /**
   * Test: covers branch when nft.traits is null/undefined (line 99)
   * This tests the empty array fallback when traits are missing
   */
  it('toMintAppInput returns empty traitHashes when traits is null', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: null, // null instead of array
      interfaceFlags: { human: true, api: false, smartContract: false },
    }

    const result = toMintAppInput(nft)

    expect(result.traitHashes).toEqual([])
  })

  /**
   * Test: covers branch when nft.traits is undefined (line 99)
   */
  it('toMintAppInput returns empty traitHashes when traits is undefined', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      // traits not provided
      interfaceFlags: { human: true, api: false, smartContract: false },
    }

    const result = toMintAppInput(nft)

    expect(result.traitHashes).toEqual([])
  })

  /**
   * Test: covers branch when nft.traits is null for toUpdateAppInput (line 99)
   */
  it('toUpdateAppInput returns empty traitHashes when traits is null', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: null,
      interfaceFlags: { human: true, api: false, smartContract: false },
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    expect(result.newTraitHashes).toEqual([])
  })

  /**
   * Test: covers interface flags bitmap calculation when all flags are false (lines 102-104)
   */
  it('toMintAppInput calculates interfaces bitmap correctly when all flags are false', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      interfaceFlags: { human: false, api: false, smartContract: false },
    }

    const result = toMintAppInput(nft)

    expect(result.interfaces).toBe(0) // All flags false = 0
  })

  /**
   * Test: covers interface flags bitmap calculation with only api flag true (lines 102-104)
   */
  it('toMintAppInput calculates interfaces bitmap correctly when only api is true', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      interfaceFlags: { human: false, api: true, smartContract: false },
    }

    const result = toMintAppInput(nft)

    expect(result.interfaces).toBe(2) // Only api (2)
  })

  /**
   * Test: covers interface flags bitmap calculation with only smartContract flag true (lines 102-104)
   */
  it('toMintAppInput calculates interfaces bitmap correctly when only smartContract is true', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      interfaceFlags: { human: false, api: false, smartContract: true },
    }

    const result = toMintAppInput(nft)

    expect(result.interfaces).toBe(4) // Only smartContract (4)
  })

  /**
   * Test: covers interface flags bitmap calculation for toUpdateAppInput when all flags are false (lines 102-104)
   */
  it('toUpdateAppInput calculates interfaces bitmap correctly when all flags are false', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      interfaceFlags: { human: false, api: false, smartContract: false },
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    expect(result.newInterfaces).toBe(0) // All flags false = 0
  })

  /**
   * Test: covers interface flags bitmap calculation for toUpdateAppInput with api and smartContract true (lines 102-104)
   */
  it('toUpdateAppInput calculates interfaces bitmap correctly when api and smartContract are true', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      interfaceFlags: { human: false, api: true, smartContract: true },
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    expect(result.newInterfaces).toBe(2 + 4) // api (2) + smartContract (4) = 6
  })

  /**
   * Test: covers branch when nft.dataUrl is empty/null/undefined for toMintAppInput (line 61)
   */
  it('toMintAppInput uses empty string when dataUrl is null', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: null,
      traits: [],
      interfaceFlags: {},
    }

    const result = toMintAppInput(nft)

    expect(result.dataUrl).toBe('')
  })

  it('toMintAppInput uses empty string when dataUrl is undefined', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      // dataUrl is undefined
      traits: [],
      interfaceFlags: {},
    }

    const result = toMintAppInput(nft)

    expect(result.dataUrl).toBe('')
  })

  it('toMintAppInput uses empty string when dataUrl is empty string', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: '',
      traits: [],
      interfaceFlags: {},
    }

    const result = toMintAppInput(nft)

    expect(result.dataUrl).toBe('')
  })

  /**
   * Test: covers branch when nft.dataUrl is empty/null/undefined for toUpdateAppInput (line 109)
   */
  // Note: dataUrl is immutable and cannot be changed after minting
  // Therefore, toUpdateAppInput doesn't return newDataUrl - only newDataHash
  it('toUpdateAppInput computes dataHash even when dataUrl is null', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: null,
      traits: [],
      interfaceFlags: {},
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    // Should still compute a hash (will be zero hash if no data)
    expect(result.newDataHash).toBeDefined()
    expect(typeof result.newDataHash).toBe('string')
  })

  it('toUpdateAppInput computes dataHash even when dataUrl is undefined', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      // dataUrl is undefined
      traits: [],
      interfaceFlags: {},
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    // Should still compute a hash (will be zero hash if no data)
    expect(result.newDataHash).toBeDefined()
    expect(typeof result.newDataHash).toBe('string')
  })

  it('toUpdateAppInput computes dataHash even when dataUrl is empty string', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: '',
      traits: [],
      interfaceFlags: {},
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    // Should still compute a hash (will be zero hash if no data)
    expect(result.newDataHash).toBeDefined()
    expect(typeof result.newDataHash).toBe('string')
  })

  /**
   * Test: covers branch when interfaceFlags is null/undefined (lines 102-104)
   * This tests the optional chaining when interfaceFlags is missing
   */
  it('toMintAppInput handles null interfaceFlags', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      interfaceFlags: null, // null instead of object
    }

    const result = toMintAppInput(nft)

    expect(result.interfaces).toBe(0) // All flags undefined = 0
  })

  /**
   * Test: covers branch when interfaceFlags is undefined (lines 102-104)
   */
  it('toMintAppInput handles undefined interfaceFlags', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      // interfaceFlags not provided
    }

    const result = toMintAppInput(nft)

    expect(result.interfaces).toBe(0) // All flags undefined = 0
  })

  /**
   * Test: covers branch when interfaceFlags properties are undefined (lines 102-104)
   */
  it('toMintAppInput handles interfaceFlags with undefined properties', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      interfaceFlags: {
        human: undefined,
        api: undefined,
        smartContract: undefined,
      },
    }

    const result = toMintAppInput(nft)

    expect(result.interfaces).toBe(0) // All flags undefined = 0
  })

  /**
   * Test: covers branch when interfaceFlags is null for toUpdateAppInput (lines 102-104)
   */
  it('toUpdateAppInput handles null interfaceFlags', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      interfaceFlags: null,
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    expect(result.newInterfaces).toBe(0) // All flags undefined = 0
  })

  /**
   * Test: covers branch when interfaceFlags is undefined for toUpdateAppInput (lines 102-104)
   */
  it('toUpdateAppInput handles undefined interfaceFlags', () => {
    const nft: any = {
      did: 'did:web:test.com',
      version: '1.0.0',
      name: 'Test App',
      dataUrl: 'https://app.oma3.org/data.json',
      traits: [],
      // interfaceFlags not provided
    }

    const result = toUpdateAppInput(nft, '1.0.0')

    expect(result.newInterfaces).toBe(0) // All flags undefined = 0
  })
})

describe('schema/mapping isOurHostedUrl', () => {
  it('matches appBaseUrl and known roots', () => {
    expect(isOurHostedUrl('https://app.oma3.org/metadata')).toBe(true)
    expect(isOurHostedUrl('https://api.omatrust.org/x')).toBe(true)
    expect(isOurHostedUrl('https://sub.oma3.org/y')).toBe(true)
    expect(isOurHostedUrl('http://localhost:3000/z')).toBe(true)
  })

  it('returns false for external urls and falsy', () => {
    expect(isOurHostedUrl('https://example.com')).toBe(false)
    expect(isOurHostedUrl('')).toBe(false)
    // @ts-expect-error testing runtime guard
    expect(isOurHostedUrl(undefined)).toBe(false)
  })
})
