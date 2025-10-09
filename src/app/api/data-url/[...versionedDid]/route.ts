import { NextResponse } from 'next/server';
import { readContract } from 'thirdweb';
import { getAppMetadataContract } from '@/lib/contracts/client';
import { log } from '@/lib/log';

/**
 * Dynamic route handler for /api/data-url/[...versionedDid]
 * Handles path-based URLs like: /api/data-url/did:web:lumian.org/v/1.0
 * 
 * This route is essential for external access to metadata stored on-chain.
 * The dataUrl stored in the registry uses this path format, so external consumers
 * (block explorers, NFT marketplaces, other dApps) need this route to work.
 */
export async function GET(
  request: Request,
  { params }: { params: { versionedDid: string[] } }
) {
  try {
    // Join the path segments to reconstruct the full versionedDID
    const versionedDID = params.versionedDid.join('/');
    
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
    
    // Metadata contract stores by DID only (not versioned DID)
    // Fetch raw JSON string directly from contract (bypass parsing/transformation)
    log(`[API data-url] Fetching raw metadata JSON for base DID: ${baseDid}`);
    
    const contract = getAppMetadataContract();
    const metadataJSON = await readContract({
      contract,
      method: "function getMetadataJson(string) view returns (string)",
      params: [baseDid]
    }) as string;
    
    // If no metadata found, return 404
    if (!metadataJSON || metadataJSON.trim() === "") {
      log(`[API data-url] Metadata not found for DID: ${baseDid}`);
      return NextResponse.json({ error: 'Metadata not found for this app' }, { status: 404 });
    }
    
    log(`[API data-url] Returning raw metadata JSON (${metadataJSON.length} bytes)`);
    
    // Return the metadata JSON string with appropriate content type
    return new NextResponse(metadataJSON, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Allow CORS for external access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

