import { NextResponse } from 'next/server';
import { getMetadata } from '@/lib/contracts/metadata.read';
import { buildMetadataJSON, validateMetadataJSON } from '@/lib/contracts/metadata.utils';
import { log } from '@/lib/log';
import type { NFT } from '@/types/nft';
import type { MetadataContractData } from '@/types/metadata-contract';
import { normalizeAndValidateVersion } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    // Extract the versionedDID parameter from the URL
    const { searchParams } = new URL(request.url);
    const versionedDID = searchParams.get('versionedDID');
    
    log('[API data-url] Received request for versionedDID:', versionedDID);
    
    // Validate the request
    if (!versionedDID) {
      log('[API data-url] Error: versionedDID parameter is missing');
      return NextResponse.json({ error: 'versionedDID parameter is required' }, { status: 400 });
    }
    
    // Simple validation - must include a base DID and version portion
    if (!versionedDID.includes('/v/')) {
      log('[API data-url] Error: Invalid versionedDID format - must include /v/ separator:', versionedDID);
      return NextResponse.json({ 
        error: 'Invalid versionedDID format - must be in format did:namespace:path/v/version',
        example: 'did:web:example.com/v/1.0'
      }, { status: 400 });
    }
    
    // Extract the base DID and version from the versioned DID
    const [baseDid, fullVersion] = versionedDID.split('/v/');
    
    if (!baseDid || !fullVersion) {
      log('[API data-url] Error: Could not extract baseDid or version from:', versionedDID);
      return NextResponse.json({ error: 'Invalid versionedDID format' }, { status: 400 });
    }
    
    log(`[API data-url] Extracted baseDid: ${baseDid}, full version: ${fullVersion}`);
    
    // Parse the version parts
    const versionParts = fullVersion.split('.');
    if (!versionParts[0]) {
      log('[API data-url] Error: Invalid version format - missing major version');
      return NextResponse.json({ error: 'Invalid version format - missing major version' }, { status: 400 });
    }
    
    // First try with major.minor format (x.y)
    let metadataContractData: MetadataContractData | null = null;
    let usedVersionedDID = '';
    
    // Try with major.minor format first (x.y)
    if (versionParts.length >= 2 && versionParts[1]) {
      const majorMinorVersion = `${versionParts[0]}.${versionParts[1]}`;
      const majorMinorVersionedDID = `${baseDid}/v/${majorMinorVersion}`;
      
      log(`[API data-url] First trying with major.minor format: ${majorMinorVersionedDID}`);
      metadataContractData = await getMetadata(majorMinorVersionedDID);
      
      if (metadataContractData) {
        log(`[API data-url] Found metadata using major.minor format: ${majorMinorVersion}`);
        usedVersionedDID = majorMinorVersionedDID;
      }
    }
    
    // If major.minor doesn't work, back off to just major version (x)
    if (!metadataContractData) {
      const majorVersion = versionParts[0];
      const majorVersionedDID = `${baseDid}/v/${majorVersion}`;
      
      log(`[API data-url] Backing off to major-only format: ${majorVersionedDID}`);
      metadataContractData = await getMetadata(majorVersionedDID);
      
      if (metadataContractData) {
        log(`[API data-url] Found metadata using major-only format: ${majorVersion}`);
        usedVersionedDID = majorVersionedDID;
      }
    }
    
    // If we still don't have metadata, return a 404
    if (!metadataContractData) {
      log(`[API data-url] Metadata not found for any version format of: ${baseDid}`);
      return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
    }
    
    // Transform MetadataContractData into NFT format for buildMetadataJSON
    const nft: NFT = {
      did: baseDid,
      name: 'Unknown', // Use a simple default name
      version: fullVersion, // Use the original version from the parameters
      dataUrl: '',
      iwpsPortalUri: '',
      agentApiUri: '',
      status: 0, // Default to active
      minter: '',
      metadata: metadataContractData
    };
    
    // Convert the metadata to a JSON string using the existing function
    const metadataJSON = buildMetadataJSON(nft);
    log(`[API data-url] Generated metadata JSON successfully using original version: ${fullVersion}`);
    
    // Validate the metadata JSON
    if (!validateMetadataJSON(metadataJSON)) {
      log(`[API data-url] Invalid metadata format for versionedDID: ${usedVersionedDID}`);
      return NextResponse.json({ error: 'Invalid metadata format' }, { status: 500 });
    }
    
    // Return the metadata JSON string with appropriate content type
    return new NextResponse(metadataJSON, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    log(`[API data-url] Error processing request:`, error);
    
    let errorMessage = 'Failed to retrieve or process metadata';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 