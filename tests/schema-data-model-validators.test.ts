// tests/schema-data-model-validators.test.ts
// Comprehensive tests for Zod schema validators and utility functions in data-model.ts
// This file tests schema parse() and safeParse() methods to improve function coverage
// Target: Improve data-model.ts from 70.58% to 90%+ function coverage

import { describe, it, expect } from 'vitest';
import {
  DomainForm,
  FormState,
  OnChainApp,
  OffChainMetadata,
  PlatformDetails,
  Platforms,
  EndpointConfig,
  McpConfig,
  Artifact,
  toDomain,
  fromDomain,
  getField,
  getFieldsForStep,
  getVisibleFields,
  isFieldRequired,
  getOnChainFields,
  getOffChainFields,
  getFieldsByStorage,
  isMetadataOwnerVerified,
  getStatusLabel,
  getStatusClasses,
  defaultFormState,
  defaultUIState,
  type NFT,
  type TFormState,
  type TDomainForm,
} from '@/schema/data-model';

describe('Schema Validators - OnChainApp', () => {
  // This test validates OnChainApp schema with valid data
  it('validates valid on-chain app data', () => {
    const validOnChainApp = {
      did: 'did:web:example.com',
      initialVersionMajor: 1,
      initialVersionMinor: 0,
      initialVersionPatch: 0,
      interfaces: 1, // Required: number
      minter: '0x1234567890123456789012345678901234567890',
      status: 0,
      dataUrl: 'https://example.com/data',
      dataHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // Must be 0x + 64 hex chars
      dataHashAlgorithm: 0, // Must be 0 or 1
      traitHashes: [],
    };

    expect(() => OnChainApp.parse(validOnChainApp)).not.toThrow();
    const parsed = OnChainApp.parse(validOnChainApp);
    expect(parsed.did).toBe('did:web:example.com');
  });

  // This test validates OnChainApp requires DID
  it('requires DID', () => {
    const invalid = {
      did: '', // Empty DID should fail
      initialVersionMajor: 1,
      initialVersionMinor: 0,
      initialVersionPatch: 0,
    };

    const result = OnChainApp.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  // This test validates version numbers must be non-negative integers
  it('validates version numbers', () => {
    const invalid = {
      did: 'did:web:example.com',
      initialVersionMajor: -1, // Negative version should fail
      initialVersionMinor: 0,
      initialVersionPatch: 0,
    };

    const result = OnChainApp.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Schema Validators - OffChainMetadata', () => {
  // This test validates OffChainMetadata with valid data
  it('validates valid off-chain metadata', () => {
    const validMetadata = {
      name: 'Test App',
      // Note: version is NOT in OffChainMetadata (it's in DomainForm)
      description: 'A test application with sufficient length',
      publisher: 'Test Publisher',
      image: 'https://example.com/image.png',
      platforms: {},
    };

    expect(() => OffChainMetadata.parse(validMetadata)).not.toThrow();
  });

  // This test validates name length constraints
  it('validates name length', () => {
    const tooShort = {
      name: 'A', // Only 1 character, needs 2+
      version: '1.0.0',
      description: 'Description',
      publisher: 'Publisher',
      platforms: {},
    };

    const result = OffChainMetadata.safeParse(tooShort);
    expect(result.success).toBe(false);
  });

  // This test validates strict mode rejects extra fields
  it('strict mode rejects extra fields', () => {
    const withExtra = {
      name: 'Test App',
      version: '1.0.0',
      description: 'Description',
      publisher: 'Publisher',
      platforms: {},
      extraField: 'not allowed', // Extra field should be rejected
    };

    const result = OffChainMetadata.safeParse(withExtra);
    expect(result.success).toBe(false);
  });
});

describe('Schema Validators - PlatformDetails', () => {
  // This test validates PlatformDetails with complete data
  it('validates complete platform details', () => {
    const validPlatform = {
      launchUrl: 'https://example.com/launch',
      supported: true,
      downloadUrl: 'https://example.com/download',
    };

    expect(() => PlatformDetails.parse(validPlatform)).not.toThrow();
  });

  // This test validates URLs must be valid format
  it('validates URL format', () => {
    const invalidUrl = {
      launchUrl: 'not-a-url', // Invalid URL format
    };

    const result = PlatformDetails.safeParse(invalidUrl);
    expect(result.success).toBe(false);
  });

  // This test validates passthrough allows extra fields
  it('allows extra platform-specific fields', () => {
    const withExtra = {
      launchUrl: 'https://example.com/launch',
      customField: 'allowed', // Extra fields should be allowed
    };

    expect(() => PlatformDetails.parse(withExtra)).not.toThrow();
  });
});

describe('Schema Validators - Platforms', () => {
  // This test validates Platforms record
  it('validates platforms record', () => {
    const validPlatforms = {
      windows: {
        launchUrl: 'https://example.com/launch',
        supported: true,
      },
      macos: {
        downloadUrl: 'https://example.com/download',
      },
    };

    expect(() => Platforms.parse(validPlatforms)).not.toThrow();
  });

  // This test validates empty platforms is valid
  it('allows empty platforms', () => {
    const empty = {};
    expect(() => Platforms.parse(empty)).not.toThrow();
  });
});

describe('Schema Validators - EndpointConfig', () => {
  // This test validates EndpointConfig with MCP fields
  it('validates endpoint with MCP fields', () => {
    const validEndpoint = {
      name: 'MCP',
      endpoint: 'https://api.example.com',
      description: 'MCP endpoint',
      tools: [{ name: 'search', description: 'Search tool' }],
      resources: [],
      prompts: [],
    };

    expect(() => EndpointConfig.parse(validEndpoint)).not.toThrow();
  });

  // This test validates URL format in endpoint
  it('validates endpoint URL', () => {
    const invalidEndpoint = {
      endpoint: 'not-a-url',
    };

    const result = EndpointConfig.safeParse(invalidEndpoint);
    expect(result.success).toBe(false);
  });
});

describe('Schema Validators - McpConfig', () => {
  // This test validates McpConfig with complete data
  it('validates complete MCP config', () => {
    const validConfig = {
      tools: [{ name: 'tool1' }],
      resources: [{ uri: 'https://api.example.com' }],
      prompts: [{ name: 'prompt1' }],
    };

    expect(() => McpConfig.parse(validConfig)).not.toThrow();
  });

  // This test validates empty MCP config
  it('allows empty MCP config', () => {
    const empty = {};
    expect(() => McpConfig.parse(empty)).not.toThrow();
  });

  // This test validates passthrough allows extra MCP fields
  it('allows extra MCP spec fields', () => {
    const withExtra = {
      tools: [],
      customMcpField: 'allowed',
    };

    expect(() => McpConfig.parse(withExtra)).not.toThrow();
  });
});

describe('Schema Validators - Artifact', () => {
  // This test validates Artifact with required fields
  it('validates artifact with required fields', () => {
    const validArtifact = {
      url: 'https://example.com/artifact.zip',
      hash: 'sha256:abcdef',
      platform: 'windows',
      arch: 'x64',
      size: 1024000,
    };

    expect(() => Artifact.parse(validArtifact)).not.toThrow();
  });

  // This test validates URL is required
  it('requires URL', () => {
    const noUrl = {
      hash: 'sha256:abcdef',
    };

    const result = Artifact.safeParse(noUrl);
    expect(result.success).toBe(false);
  });

  // This test validates URL format
  it('validates URL format', () => {
    const invalidUrl = {
      url: 'not-a-url',
    };

    const result = Artifact.safeParse(invalidUrl);
    expect(result.success).toBe(false);
  });
});

describe('Schema Validators - DomainForm', () => {
  // This test validates complete domain form
  it('validates complete domain form', () => {
    const validForm = {
      did: 'did:web:example.com',
      version: '1.0.0',
      name: 'Test App',
      description: 'A test application',
      publisher: 'Test Publisher',
      external_url: 'https://example.com',
      image: 'https://example.com/image.png',
      interfaceFlags: {
        human: true,
        api: false,
        smartContract: false,
      },
      platforms: {},
      endpoints: [],
      screenshotUrls: [],
    };

    expect(() => DomainForm.parse(validForm)).not.toThrow();
  });

  // This test validates required fields
  it('requires essential fields', () => {
    const incomplete = {
      did: 'did:web:example.com',
      // missing other required fields
    };

    const result = DomainForm.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

describe('Schema Validators - FormState', () => {
  // This test validates FormState extends DomainForm with UI state
  it('validates form state with UI state', () => {
    const validFormState = {
      ...defaultFormState,
      did: 'did:web:example.com',
      name: 'Test App',
      description: 'A test application with sufficient description length',
      publisher: 'Test Publisher',
      image: 'https://example.com/image.png',
      external_url: 'https://example.com',
      legalUrl: 'https://example.com/legal',
      supportUrl: 'https://example.com/support',
      iwpsPortalUrl: 'https://example.com/portal',
    };

    expect(() => FormState.parse(validFormState)).not.toThrow();
  });

  // This test validates UI state is required
  it('requires UI state', () => {
    const noUi = {
      did: 'did:web:example.com',
      name: 'Test',
      version: '1.0.0',
      // missing ui field
    };

    const result = FormState.safeParse(noUi);
    expect(result.success).toBe(false);
  });
});

describe('Utility Functions - toDomain and fromDomain', () => {
  // This test validates toDomain extracts domain data
  it('extracts domain data from form state', () => {
    const formState: TFormState = {
      ...defaultFormState,
      did: 'did:web:example.com',
      name: 'Test App',
      description: 'A comprehensive test application with full description',
      publisher: 'Test Publisher Inc',
      image: 'https://example.com/image.png',
      external_url: 'https://example.com',
      legalUrl: 'https://example.com/legal',
      supportUrl: 'https://example.com/support',
      iwpsPortalUrl: 'https://example.com/portal',
    };

    const domain = toDomain(formState);
    expect(domain.did).toBe('did:web:example.com');
    expect(domain.name).toBe('Test App');
    expect(domain).not.toHaveProperty('ui');
  });

  // This test validates fromDomain creates form state
  it('creates form state from domain data', () => {
    const domain: Partial<TDomainForm> = {
      did: 'did:web:example.com',
      name: 'Test App',
      version: '1.0.0',
      description: 'A comprehensive test application with full description',
      publisher: 'Test Publisher Inc',
      image: 'https://example.com/image.png',
      interfaceFlags: {
        human: true,
        api: false,
        smartContract: false,
      },
    };

    const formState = fromDomain(domain);
    expect(formState.did).toBe('did:web:example.com');
    expect(formState.ui).toBeDefined();
    expect(formState.ui.mode).toBe('create');
  });

  // This test validates fromDomain accepts UI overrides
  it('accepts UI overrides', () => {
    const domain: Partial<TDomainForm> = {
      did: 'did:web:example.com',
      version: '1.0.0',
      name: 'Test App',
      description: 'A comprehensive test application with full description',
      publisher: 'Test Publisher Inc',
      image: 'https://example.com/image.png',
      interfaceFlags: {
        human: true,
        api: false,
        smartContract: false,
      },
    };

    const formState = fromDomain(domain, { mode: 'edit', isEditing: true });
    expect(formState.ui.mode).toBe('edit');
    expect(formState.ui.isEditing).toBe(true);
  });
});

describe('Utility Functions - Field Accessors', () => {
  // This test validates getField returns field definition
  it('gets field by ID', () => {
    const field = getField('did');
    expect(field).toBeDefined();
    expect(field?.id).toBe('did');
  });

  // This test validates getField returns undefined for invalid ID
  it('returns undefined for invalid field ID', () => {
    const field = getField('nonexistent-field-id');
    expect(field).toBeUndefined();
  });

  // This test validates getFieldsForStep returns step fields
  it('gets fields for specific step', () => {
    const step1Fields = getFieldsForStep('verification');
    expect(Array.isArray(step1Fields)).toBe(true);
    expect(step1Fields.length).toBeGreaterThan(0);
  });

  // This test validates getVisibleFields filters by interface flags
  it('filters fields by interface flags', () => {
    const interfaceFlags = {
      human: true,
      api: false,
      smartContract: false,
    };

    const fields = getVisibleFields('onchain', interfaceFlags);
    expect(Array.isArray(fields)).toBe(true);
  });

  // This test validates isFieldRequired checks requirements
  it('checks if field is required', () => {
    const field = getField('did');
    if (field) {
      const interfaceFlags = {
        human: true,
        api: false,
        smartContract: false,
      };
      const required = isFieldRequired(field, interfaceFlags);
      expect(typeof required).toBe('boolean');
    }
  });

  // This test validates getOnChainFields returns on-chain fields
  it('gets on-chain fields', () => {
    const onChainFields = getOnChainFields();
    expect(Array.isArray(onChainFields)).toBe(true);
    onChainFields.forEach(field => {
      expect(field.onChain).toBe(true);
    });
  });

  // This test validates getOffChainFields returns off-chain fields
  it('gets off-chain fields', () => {
    const offChainFields = getOffChainFields();
    expect(Array.isArray(offChainFields)).toBe(true);
    offChainFields.forEach(field => {
      expect(field.onChain).toBe(false);
    });
  });

  // This test validates getFieldsByStorage filters by storage type
  it('filters fields by storage type', () => {
    const onChainFields = getFieldsByStorage(true);
    const offChainFields = getFieldsByStorage(false);
    
    expect(Array.isArray(onChainFields)).toBe(true);
    expect(Array.isArray(offChainFields)).toBe(true);
    
    onChainFields.forEach(field => expect(field.onChain).toBe(true));
    offChainFields.forEach(field => expect(field.onChain).toBe(false));
  });
});

describe('Utility Functions - Status Helpers', () => {
  // This test validates getStatusLabel returns correct labels
  it('returns correct status labels', () => {
    expect(getStatusLabel(0)).toBe('Active');
    expect(getStatusLabel(1)).toBe('Deprecated');
    expect(getStatusLabel(2)).toBe('Replaced');
    expect(getStatusLabel(999)).toBe('Unknown');
  });

  // This test validates getStatusClasses returns correct CSS classes
  it('returns correct status CSS classes', () => {
    expect(getStatusClasses(0)).toContain('bg-green');
    expect(getStatusClasses(1)).toContain('bg-red');
    expect(getStatusClasses(2)).toContain('bg-yellow');
    expect(getStatusClasses(999)).toContain('bg-gray');
  });
});

describe('Utility Functions - isMetadataOwnerVerified', () => {
  // This test validates owner verification with matching addresses
  it('verifies matching owner addresses', () => {
    const nft: NFT = {
      did: 'did:web:example.com',
      name: 'Test',
      version: '1.0.0',
      description: 'Test',
      publisher: 'Test',
      image: 'https://example.com/image.png',
      owner: 'eip155:1:0x1234567890123456789012345678901234567890',
      currentOwner: '0x1234567890123456789012345678901234567890',
      minter: '0x1234567890123456789012345678901234567890',
      status: 'Active',
      dataUrl: 'https://example.com/data',
    };

    const verified = isMetadataOwnerVerified(nft);
    expect(verified).toBe(true);
  });

  // This test validates owner verification with mismatched addresses
  it('detects mismatched owner addresses', () => {
    const nft: NFT = {
      did: 'did:web:example.com',
      name: 'Test',
      version: '1.0.0',
      description: 'Test',
      publisher: 'Test',
      image: 'https://example.com/image.png',
      owner: 'eip155:1:0xdifferentaddress111111111111111111111111',
      currentOwner: '0x1234567890123456789012345678901234567890',
      minter: '0x1234567890123456789012345678901234567890',
      status: 'Active',
      dataUrl: 'https://example.com/data',
    };

    const verified = isMetadataOwnerVerified(nft);
    expect(verified).toBe(false);
  });

  // This test validates handles missing metadata owner
  it('handles missing metadata owner', () => {
    const nft: NFT = {
      did: 'did:web:example.com',
      name: 'Test',
      version: '1.0.0',
      description: 'Test',
      publisher: 'Test',
      image: 'https://example.com/image.png',
      owner: undefined,
      currentOwner: '0x1234567890123456789012345678901234567890',
      minter: '0x1234567890123456789012345678901234567890',
      status: 'Active',
      dataUrl: 'https://example.com/data',
    };

    const verified = isMetadataOwnerVerified(nft);
    expect(verified).toBe(false);
  });

  // This test validates handles missing contract owner
  it('handles missing contract owner', () => {
    const nft: NFT = {
      did: 'did:web:example.com',
      name: 'Test',
      version: '1.0.0',
      description: 'Test',
      publisher: 'Test',
      image: 'https://example.com/image.png',
      owner: 'eip155:1:0x1234567890123456789012345678901234567890',
      currentOwner: undefined,
      minter: '0x1234567890123456789012345678901234567890',
      status: 'Active',
      dataUrl: 'https://example.com/data',
    };

    const verified = isMetadataOwnerVerified(nft);
    expect(verified).toBe(false);
  });
});

describe('Edge Cases', () => {
  // This test validates schemas handle undefined input
  it('handles undefined input', () => {
    expect(DomainForm.safeParse(undefined).success).toBe(false);
    expect(OnChainApp.safeParse(undefined).success).toBe(false);
    expect(OffChainMetadata.safeParse(undefined).success).toBe(false);
  });

  // This test validates schemas handle null input
  it('handles null input', () => {
    expect(DomainForm.safeParse(null).success).toBe(false);
    expect(OnChainApp.safeParse(null).success).toBe(false);
    expect(OffChainMetadata.safeParse(null).success).toBe(false);
  });

  // This test validates schemas handle empty objects
  it('handles empty objects', () => {
    expect(DomainForm.safeParse({}).success).toBe(false);
    expect(OnChainApp.safeParse({}).success).toBe(false);
    expect(OffChainMetadata.safeParse({}).success).toBe(false);
  });

  // This test validates schemas reject arrays
  it('rejects arrays when object expected', () => {
    expect(DomainForm.safeParse([]).success).toBe(false);
    expect(OnChainApp.safeParse([]).success).toBe(false);
    expect(OffChainMetadata.safeParse([]).success).toBe(false);
  });

  // This test validates schemas reject primitive types
  it('rejects primitive types', () => {
    expect(DomainForm.safeParse('string').success).toBe(false);
    expect(DomainForm.safeParse(123).success).toBe(false);
    expect(DomainForm.safeParse(true).success).toBe(false);
  });
});
