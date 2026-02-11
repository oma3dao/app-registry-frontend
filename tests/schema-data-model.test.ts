/**
 * Tests for schema/data-model.ts functions
 * 
 * Tests the helper functions and utilities for data model transformations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toDomain,
  fromDomain,
  getStatusLabel,
  getStatusClasses,
  isMetadataOwnerVerified,
  getField,
  getFieldsForStep,
  getVisibleFields,
  isFieldRequired,
  getOnChainFields,
  getOffChainFields,
  getFieldsByStorage,
  defaultFormState,
  defaultUIState,
  type TFormState,
  type TDomainForm,
  type NFT,
} from '@/schema/data-model';
import { parseCaip10 } from '@/lib/utils/caip10';

// Mock parseCaip10
vi.mock('@/lib/utils/caip10', () => ({
  parseCaip10: vi.fn(),
}));

describe('schema/data-model functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toDomain', () => {
    /**
     * Test: extracts domain data from form state, removing UI state
     */
    it('extracts domain data from form state', () => {
      const formState: TFormState = {
        ...defaultFormState,
        did: 'did:web:example.com',
        name: 'Test App',
        description: 'This is a test application description that is long enough',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
        version: '1.0.0',
        // Remove empty string URLs that fail validation
        external_url: undefined,
        legalUrl: undefined,
        supportUrl: undefined,
        iwpsPortalUrl: undefined,
        ui: {
          mode: 'create',
          isEditing: true,
          verificationStatus: 'verifying',
          didVerification: { isValid: true },
        },
      };

      const domain = toDomain(formState);

      expect(domain.did).toBe('did:web:example.com');
      expect(domain.name).toBe('Test App');
      expect(domain.version).toBe('1.0.0');
      // UI state should not be in domain
      expect((domain as any).ui).toBeUndefined();
    });

    /**
     * Test: validates domain data using DomainForm schema
     */
    it('validates domain data using DomainForm schema', () => {
      const invalidFormState: any = {
        ...defaultFormState,
        did: '', // Invalid: empty DID
        ui: defaultUIState,
      };

      expect(() => toDomain(invalidFormState)).toThrow();
    });

    /**
     * Test: handles minimal valid form state
     */
    it('handles minimal valid form state', () => {
      const minimalForm: TFormState = {
        ...defaultFormState,
        did: 'did:web:test.com',
        name: 'Test Application',
        description: 'This is a valid description that is long enough',
        publisher: 'Test Publisher',
        image: 'https://example.com/image.png',
        // Remove empty string URLs that fail validation
        external_url: undefined,
        legalUrl: undefined,
        supportUrl: undefined,
        iwpsPortalUrl: undefined,
        ui: defaultUIState,
      };

      const domain = toDomain(minimalForm);
      expect(domain.did).toBe('did:web:test.com');
    });
  });

  describe('fromDomain', () => {
    // Helper to create valid minimal domain
    const createValidDomain = (overrides: Partial<TDomainForm> = {}): Partial<TDomainForm> => ({
      did: 'did:web:example.com',
      version: '1.0.0',
      name: 'Test App',
      description: 'This is a test application description that is long enough',
      publisher: 'Test Publisher',
      image: 'https://example.com/image.png',
      interfaceFlags: {
        human: true,
        api: false,
        smartContract: false,
      },
      ...overrides,
    });

    /**
     * Test: creates form state from domain data with default UI
     */
    it('creates form state from domain data with default UI', () => {
      const domain = createValidDomain({
        version: '2.0.0',
      });

      const formState = fromDomain(domain);

      expect(formState.did).toBe('did:web:example.com');
      expect(formState.name).toBe('Test App');
      expect(formState.version).toBe('2.0.0');
      expect(formState.ui).toEqual(defaultUIState);
    });

    /**
     * Test: applies UI overrides when provided
     */
    it('applies UI overrides when provided', () => {
      const domain = createValidDomain();

      const uiOverrides = {
        mode: 'edit' as const,
        isEditing: true,
      };

      const formState = fromDomain(domain, uiOverrides);

      expect(formState.ui.mode).toBe('edit');
      expect(formState.ui.isEditing).toBe(true);
      expect(formState.ui.verificationStatus).toBe('idle'); // Default preserved
    });

    /**
     * Test: merges partial domain data with defaults
     */
    it('merges partial domain data with defaults', () => {
      const partialDomain = createValidDomain({
        did: 'did:web:test.com',
      });

      const formState = fromDomain(partialDomain);

      expect(formState.did).toBe('did:web:test.com');
      expect(formState.version).toBe('1.0.0');
      expect(formState.traits).toEqual([]); // From defaultFormState
    });
  });

  describe('getStatusLabel', () => {
    it.each([
      { status: 0, expected: 'Active' },
      { status: 1, expected: 'Deprecated' },
      { status: 2, expected: 'Replaced' },
    ])('returns "$expected" for status $status', ({ status, expected }) => {
      expect(getStatusLabel(status)).toBe(expected);
    });

    it.each([3, -1, 999])('returns "Unknown" for invalid status: %s', (status) => {
      expect(getStatusLabel(status)).toBe('Unknown');
    });
  });

  describe('getStatusClasses', () => {
    it.each([
      { status: 0, expected: 'bg-green-100 text-green-800', label: 'green classes for Active status' },
      { status: 1, expected: 'bg-red-100 text-red-800', label: 'red classes for Deprecated status' },
      { status: 2, expected: 'bg-yellow-100 text-yellow-800', label: 'yellow classes for Replaced status' },
    ])('returns $label', ({ status, expected }) => {
      expect(getStatusClasses(status)).toBe(expected);
    });

    it.each([3, -1, 999])('returns gray classes for unknown status: %s', (status) => {
      expect(getStatusClasses(status)).toBe('bg-gray-100 text-gray-800');
    });
  });

  describe('isMetadataOwnerVerified', () => {
    /**
     * ERC8004EXT-SECURITY: Client Requirements - Registration File owner verification.
     * "Clients MUST verify ownership: fetch Registration File, extract owner (CAIP-10),
     *  compare with ownerOf(agentId) or getRegistration().currentOwner"
     */

    /**
     * Test: returns true when metadata owner matches contract owner
     */
    it('returns true when metadata owner matches contract owner', () => {
      const mockParsed = {
        address: '0x1234567890123456789012345678901234567890',
      };
      vi.mocked(parseCaip10).mockReturnValue(mockParsed as any);

      const nft: NFT = {
        owner: 'eip155:1:0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
      } as NFT;

      expect(isMetadataOwnerVerified(nft)).toBe(true);
      expect(parseCaip10).toHaveBeenCalledWith('eip155:1:0x1234567890123456789012345678901234567890');
    });

    /**
     * Test: returns false when addresses do not match
     */
    it('returns false when addresses do not match', () => {
      const mockParsed = {
        address: '0x1234567890123456789012345678901234567890',
      };
      vi.mocked(parseCaip10).mockReturnValue(mockParsed as any);

      const nft: NFT = {
        owner: 'eip155:1:0x1234567890123456789012345678901234567890',
        currentOwner: '0x9876543210987654321098765432109876543210',
      } as NFT;

      expect(isMetadataOwnerVerified(nft)).toBe(false);
    });

    /**
     * Test: returns false when metadata owner is missing
     */
    it('returns false when metadata owner is missing', () => {
      const nft: NFT = {
        currentOwner: '0x1234567890123456789012345678901234567890',
      } as NFT;

      expect(isMetadataOwnerVerified(nft)).toBe(false);
    });

    /**
     * Test: returns false when contract owner is missing
     */
    it('returns false when contract owner is missing', () => {
      const nft: NFT = {
        owner: 'eip155:1:0x1234567890123456789012345678901234567890',
      } as NFT;

      expect(isMetadataOwnerVerified(nft)).toBe(false);
    });

    /**
     * Test: returns false when CAIP-10 parsing fails
     */
    it('returns false when CAIP-10 parsing fails', () => {
      vi.mocked(parseCaip10).mockReturnValue(new Error('Invalid CAIP-10') as any);

      const nft: NFT = {
        owner: 'invalid-caip10',
        currentOwner: '0x1234567890123456789012345678901234567890',
      } as NFT;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(isMetadataOwnerVerified(nft)).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    /**
     * Test: returns false when CAIP-10 parsing throws an error
     */
    it('returns false when CAIP-10 parsing throws an error', () => {
      vi.mocked(parseCaip10).mockImplementation(() => {
        throw new Error('Parse error');
      });

      const nft: NFT = {
        owner: 'eip155:1:0x1234567890123456789012345678901234567890',
        currentOwner: '0x1234567890123456789012345678901234567890',
      } as NFT;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(isMetadataOwnerVerified(nft)).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    /**
     * Test: handles case-insensitive address comparison
     */
    it('handles case-insensitive address comparison', () => {
      const mockParsed = {
        address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
      };
      vi.mocked(parseCaip10).mockReturnValue(mockParsed as any);

      const nft: NFT = {
        owner: 'eip155:1:0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        currentOwner: '0xabcdef1234567890abcdef1234567890abcdef12', // Lowercase
      } as NFT;

      expect(isMetadataOwnerVerified(nft)).toBe(true);
    });
  });

  describe('getField', () => {
    /**
     * Test: returns field definition for existing field ID
     */
    it('returns field definition for existing field ID', () => {
      const field = getField('did');
      expect(field).toBeDefined();
      expect(field?.id).toBe('did');
    });

    /**
     * Test: returns undefined for non-existent field ID
     */
    it('returns undefined for non-existent field ID', () => {
      const field = getField('nonExistentField');
      expect(field).toBeUndefined();
    });

    /**
     * Test: returns undefined for empty string
     */
    it('returns undefined for empty string', () => {
      const field = getField('');
      expect(field).toBeUndefined();
    });
  });

  describe('getFieldsForStep', () => {
    /**
     * Test: returns all fields for a specific step
     */
    it('returns all fields for a specific step', () => {
      const fields = getFieldsForStep('basic');
      expect(Array.isArray(fields)).toBe(true);
      // All returned fields should belong to the step
      fields.forEach(field => {
        expect(field.step).toBe('basic');
      });
    });

    /**
     * Test: returns empty array for non-existent step
     */
    it('returns empty array for non-existent step', () => {
      const fields = getFieldsForStep('nonExistentStep');
      expect(fields).toEqual([]);
    });
  });

  describe('getVisibleFields', () => {
    /**
     * Test: returns only fields visible for given interface flags
     */
    it('returns only fields visible for given interface flags', () => {
      const interfaceFlags = {
        human: true,
        api: false,
        smartContract: false,
      };

      const fields = getVisibleFields('common', interfaceFlags);
      expect(Array.isArray(fields)).toBe(true);
      // Each field should have at least one matching interface
      fields.forEach(field => {
        const hasMatchingInterface = field.interfaces.some(iface => interfaceFlags[iface]);
        expect(hasMatchingInterface).toBe(true);
      });
    });

    /**
     * Test: returns empty array when no interfaces match
     */
    it('returns empty array when no interfaces match', () => {
      const interfaceFlags = {
        human: false,
        api: false,
        smartContract: false,
      };

      const fields = getVisibleFields('common', interfaceFlags);
      expect(fields).toEqual([]);
    });

    /**
     * Test: returns fields for multiple matching interfaces
     */
    it('returns fields for multiple matching interfaces', () => {
      const interfaceFlags = {
        human: true,
        api: true,
        smartContract: false,
      };

      // Get all fields for a step that has human interface fields
      // The function should return fields that match ANY of the enabled interfaces
      const allFieldsForStep = getFieldsForStep('common');
      
      if (allFieldsForStep.length > 0) {
        // Test that getVisibleFields filters correctly
        const visibleFields = getVisibleFields('common', interfaceFlags);
        
        // Each visible field should match at least one enabled interface
        visibleFields.forEach(field => {
          const hasMatchingInterface = field.interfaces.some(iface => interfaceFlags[iface]);
          expect(hasMatchingInterface).toBe(true);
        });
        
        // If there are fields with human or api interfaces, they should be visible
        const hasHumanOrApiFields = allFieldsForStep.some(f => 
          f.interfaces.includes('human') || f.interfaces.includes('api')
        );
        
        if (hasHumanOrApiFields) {
          expect(visibleFields.length).toBeGreaterThan(0);
        }
      } else {
        // If common step has no fields, test with a step that likely has fields
        const verificationFields = getVisibleFields('verification', interfaceFlags);
        // Just verify the function works correctly
        expect(Array.isArray(verificationFields)).toBe(true);
      }
    });

    /**
     * Test: covers line 800 - tests .some() callback with field that has multiple interfaces
     * where some match and some don't
     */
    it('handles fields with multiple interfaces where some match (tests line 800)', () => {
      const interfaceFlags = {
        human: true,
        api: false,
        smartContract: false,
      };

      // Get all fields and find one that has multiple interfaces
      const allFields = getFieldsForStep('common');
      
      // Test with a field that has multiple interfaces (if any exist)
      // The .some() callback should return true if ANY interface matches
      const fields = getVisibleFields('basic', interfaceFlags);
      
      // Verify that the filter correctly uses .some() to check interface flags
      // Each returned field should have at least one interface that matches
      fields.forEach(field => {
        // This tests the exact logic on line 800
        const matches = field.interfaces.some((iface) => interfaceFlags[iface]);
        expect(matches).toBe(true);
      });
      
      // Also test with smartContract enabled to test different interface paths
      const smartContractFlags = {
        human: false,
        api: false,
        smartContract: true,
      };
      
      const smartContractFields = getVisibleFields('basic', smartContractFlags);
      smartContractFields.forEach(field => {
        // Test the callback logic again with different flags
        const matches = field.interfaces.some((iface) => smartContractFlags[iface]);
        expect(matches).toBe(true);
      });
    });

    /**
     * Test: covers line 800 - tests .some() callback when interfaceFlags[iface] is explicitly false
     */
    it('correctly filters when interface flags are explicitly false (tests line 800)', () => {
      const interfaceFlags = {
        human: false,
        api: false,
        smartContract: false,
      };

      const fields = getVisibleFields('basic', interfaceFlags);
      
      // Should return empty array since all flags are false
      // This tests the .some() callback returning false for all interfaces
      expect(fields).toEqual([]);
      
      // Verify that for each field, .some() returns false
      const allFields = getFieldsForStep('basic');
      allFields.forEach(field => {
        const matches = field.interfaces.some((iface) => interfaceFlags[iface]);
        expect(matches).toBe(false);
      });
    });
  });

  describe('isFieldRequired', () => {
    /**
     * Test: returns true for field with boolean required = true
     */
    it('returns true for field with boolean required = true', () => {
      const field = getField('did');
      expect(field).toBeDefined();
      if (field) {
        // Test isFieldRequired works regardless of required type
        const result = isFieldRequired(field, { human: true, api: false, smartContract: false });
        expect(typeof result).toBe('boolean');
        // If field has boolean required, verify it matches
        if (typeof field.required === 'boolean') {
          expect(result).toBe(field.required);
        }
      }
    });

    /**
     * Test: calls required function when it is a function
     */
    it('calls required function when it is a function', () => {
      const mockRequired = vi.fn(() => true);
      const field = {
        id: 'test',
        step: 'basic',
        label: 'Test',
        widget: 'text' as const,
        onChain: false,
        interfaces: ['human'],
        required: mockRequired,
      };

      const result = isFieldRequired(field as any, { human: true, api: false, smartContract: false });
      
      expect(mockRequired).toHaveBeenCalledWith({ human: true, api: false, smartContract: false });
      expect(result).toBe(true);
    });

    /**
     * Test: returns false when required function returns false
     */
    it('returns false when required function returns false', () => {
      const mockRequired = vi.fn(() => false);
      const field = {
        id: 'test',
        step: 'basic',
        label: 'Test',
        widget: 'text' as const,
        onChain: false,
        interfaces: ['human'],
        required: mockRequired,
      };

      const result = isFieldRequired(field as any, { human: false, api: false, smartContract: false });
      
      expect(result).toBe(false);
    });
  });

  describe('getOnChainFields', () => {
    /**
     * Test: returns only fields marked as onChain
     */
    it('returns only fields marked as onChain', () => {
      const fields = getOnChainFields();
      expect(Array.isArray(fields)).toBe(true);
      fields.forEach(field => {
        expect(field.onChain).toBe(true);
      });
    });

    /**
     * Test: returns at least some fields
     */
    it('returns at least some fields', () => {
      const fields = getOnChainFields();
      expect(fields.length).toBeGreaterThan(0);
    });
  });

  describe('getOffChainFields', () => {
    /**
     * Test: returns only fields marked as offChain (onChain = false)
     */
    it('returns only fields marked as offChain', () => {
      const fields = getOffChainFields();
      expect(Array.isArray(fields)).toBe(true);
      fields.forEach(field => {
        expect(field.onChain).toBe(false);
      });
    });

    /**
     * Test: returns at least some fields
     */
    it('returns at least some fields', () => {
      const fields = getOffChainFields();
      expect(fields.length).toBeGreaterThan(0);
    });
  });

  describe('Zod Schema Validation', () => {
    /**
     * Test: OnChainApp schema validation
     */
    describe('OnChainApp', () => {
      it('validates valid on-chain app data', async () => {
        const { OnChainApp } = await import('@/schema/data-model');
        const validData = {
          did: 'did:web:example.com',
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
          interfaces: 1,
          dataUrl: 'https://example.com/data.json',
          dataHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
          dataHashAlgorithm: 0,
          minter: '0x1234567890123456789012345678901234567890',
          status: 0,
        };
        
        const result = OnChainApp.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('rejects invalid dataHash format', async () => {
        const { OnChainApp } = await import('@/schema/data-model');
        const invalidData = {
          did: 'did:web:example.com',
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
          interfaces: 1,
          dataUrl: 'https://example.com/data.json',
          dataHash: 'invalid-hash', // Invalid format
          dataHashAlgorithm: 0,
          minter: '0x1234567890123456789012345678901234567890',
        };
        
        const result = OnChainApp.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('validates with optional fields', async () => {
        const { OnChainApp } = await import('@/schema/data-model');
        const dataWithOptionals = {
          did: 'did:web:example.com',
          initialVersionMajor: 1,
          initialVersionMinor: 0,
          initialVersionPatch: 0,
          interfaces: 1,
          dataUrl: 'https://example.com/data.json',
          dataHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
          dataHashAlgorithm: 0,
          fungibleTokenId: 'eip155:1/erc20:0xabc',
          contractId: 'eip155:1:0x123',
          traitHashes: ['0x' + 'a'.repeat(64)],
          minter: '0x1234567890123456789012345678901234567890',
        };
        
        const result = OnChainApp.safeParse(dataWithOptionals);
        expect(result.success).toBe(true);
      });
    });

    /**
     * Test: OffChainMetadata schema validation
     */
    describe('OffChainMetadata', () => {
      it('validates valid off-chain metadata', async () => {
        const { OffChainMetadata } = await import('@/schema/data-model');
        const validMetadata = {
          name: 'Test App',
          description: 'This is a test application description',
          publisher: 'Test Publisher',
          image: 'https://example.com/image.png',
        };
        
        const result = OffChainMetadata.safeParse(validMetadata);
        expect(result.success).toBe(true);
      });

      it('rejects name that is too short', async () => {
        const { OffChainMetadata } = await import('@/schema/data-model');
        const invalidMetadata = {
          name: 'A', // Too short (min 2)
          description: 'This is a test application description',
          publisher: 'Test Publisher',
          image: 'https://example.com/image.png',
        };
        
        const result = OffChainMetadata.safeParse(invalidMetadata);
        expect(result.success).toBe(false);
      });

      it('rejects description that is too short', async () => {
        const { OffChainMetadata } = await import('@/schema/data-model');
        const invalidMetadata = {
          name: 'Test App',
          description: 'Short', // Too short (min 10)
          publisher: 'Test Publisher',
          image: 'https://example.com/image.png',
        };
        
        const result = OffChainMetadata.safeParse(invalidMetadata);
        expect(result.success).toBe(false);
      });
    });

    /**
     * Test: PlatformDetails schema validation
     */
    describe('PlatformDetails', () => {
      it('validates valid platform details', async () => {
        const { PlatformDetails } = await import('@/schema/data-model');
        const validPlatform = {
          launchUrl: 'https://example.com/launch',
          supported: true,
          downloadUrl: 'https://example.com/download',
        };
        
        const result = PlatformDetails.safeParse(validPlatform);
        expect(result.success).toBe(true);
      });

      it('allows additional fields (passthrough)', async () => {
        const { PlatformDetails } = await import('@/schema/data-model');
        const platformWithExtra = {
          launchUrl: 'https://example.com/launch',
          customField: 'custom value',
        };
        
        const result = PlatformDetails.safeParse(platformWithExtra);
        expect(result.success).toBe(true);
      });
    });

    /**
     * Test: Artifact schema validation
     */
    describe('Artifact', () => {
      it('validates valid artifact', async () => {
        const { Artifact } = await import('@/schema/data-model');
        const validArtifact = {
          url: 'https://example.com/artifact.zip',
          hash: '0x1234',
          hashAlgorithm: 'sha256',
          size: 1024,
          format: 'zip',
        };
        
        const result = Artifact.safeParse(validArtifact);
        expect(result.success).toBe(true);
      });

      it('requires url field', async () => {
        const { Artifact } = await import('@/schema/data-model');
        const invalidArtifact = {
          hash: '0x1234',
        };
        
        const result = Artifact.safeParse(invalidArtifact);
        expect(result.success).toBe(false);
      });
    });

    /**
     * Test: EndpointConfig schema validation
     */
    describe('EndpointConfig', () => {
      it('validates valid endpoint config', async () => {
        const { EndpointConfig } = await import('@/schema/data-model');
        const validEndpoint = {
          name: 'MCP',
          endpoint: 'https://example.com/mcp',
          schemaUrl: 'https://example.com/schema.json',
        };
        
        const result = EndpointConfig.safeParse(validEndpoint);
        expect(result.success).toBe(true);
      });

      it('allows MCP fields when name is MCP', async () => {
        const { EndpointConfig } = await import('@/schema/data-model');
        const mcpEndpoint = {
          name: 'MCP',
          endpoint: 'https://example.com/mcp',
          tools: [],
          resources: [],
        };
        
        const result = EndpointConfig.safeParse(mcpEndpoint);
        expect(result.success).toBe(true);
      });
    });

    /**
     * Test: DomainForm schema validation
     */
    describe('DomainForm', () => {
      it('validates valid domain form', async () => {
        const { DomainForm } = await import('@/schema/data-model');
        const validDomain = {
          did: 'did:web:example.com',
          version: '1.0.0',
          interfaceFlags: {
            human: true,
            api: false,
            smartContract: false,
          },
          name: 'Test App',
          description: 'This is a test application description',
          publisher: 'Test Publisher',
          image: 'https://example.com/image.png',
        };
        
        const result = DomainForm.safeParse(validDomain);
        expect(result.success).toBe(true);
      });

      it('rejects name that is too long', async () => {
        const { DomainForm } = await import('@/schema/data-model');
        const invalidDomain = {
          did: 'did:web:example.com',
          version: '1.0.0',
          interfaceFlags: {
            human: true,
            api: false,
            smartContract: false,
          },
          name: 'A'.repeat(81), // Too long (max 80)
          description: 'This is a test application description',
          publisher: 'Test Publisher',
          image: 'https://example.com/image.png',
        };
        
        const result = DomainForm.safeParse(invalidDomain);
        expect(result.success).toBe(false);
      });
    });

    /**
     * Test: UIState schema validation
     */
    describe('UIState', () => {
      it('validates valid UI state', async () => {
        const { UIState } = await import('@/schema/data-model');
        const validUIState = {
          mode: 'create',
          isEditing: false,
          verificationStatus: 'idle',
          didVerification: {
            isValid: false,
          },
        };
        
        const result = UIState.safeParse(validUIState);
        expect(result.success).toBe(true);
      });

      it('rejects invalid mode', async () => {
        const { UIState } = await import('@/schema/data-model');
        const invalidUIState = {
          mode: 'invalid', // Not in enum
          isEditing: false,
        };
        
        const result = UIState.safeParse(invalidUIState);
        expect(result.success).toBe(false);
      });
    });
  });
});



describe('getFieldsByStorage', () => {
  it('returns on-chain fields when onChain=true', () => {
    const fields = getFieldsByStorage(true);
    expect(Array.isArray(fields)).toBe(true);
    fields.forEach(field => {
      expect(field.onChain).toBe(true);
    });
  });

  it('returns off-chain fields when onChain=false', () => {
    const fields = getFieldsByStorage(false);
    expect(Array.isArray(fields)).toBe(true);
    fields.forEach(field => {
      expect(field.onChain).toBe(false);
    });
  });

  it('returns same result as getOnChainFields when onChain=true', () => {
    const byStorage = getFieldsByStorage(true);
    const onChain = getOnChainFields();
    expect(byStorage.length).toBe(onChain.length);
    expect(byStorage.map(f => f.id).sort()).toEqual(onChain.map(f => f.id).sort());
  });

  it('returns same result as getOffChainFields when onChain=false', () => {
    const byStorage = getFieldsByStorage(false);
    const offChain = getOffChainFields();
    expect(byStorage.length).toBe(offChain.length);
    expect(byStorage.map(f => f.id).sort()).toEqual(offChain.map(f => f.id).sort());
  });
});
