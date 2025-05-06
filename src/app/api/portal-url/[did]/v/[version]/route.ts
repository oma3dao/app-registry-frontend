import { NextRequest, NextResponse } from 'next/server';
import * as AppConfig from '@/config/app-config'; // Import constants
// Import validation functions
import { validateDid, validateVersion, validateUrl } from '@/lib/validation';
import { getMetadata } from '@/contracts/appMetadata'; // Import getMetadata
import type { MetadataContractData } from "@/types/metadata-contract"; // Import type for metadata
import { buildVersionedDID } from "@/lib/utils"; // Import buildVersionedDID

// Helper function to check if a value is defined (not null or undefined)
const isDefined = (value: any): boolean => value !== undefined && value !== null;

// Handler now accepts params for dynamic route segments
export async function POST(
  request: NextRequest, 
  { params }: { params: { did: string; version: string } } // Added params
) { 
  try {
    // Extract did and version from params object
    const { did: _did, version: _version } = params; 

    // --- DID and Version Validation ---
    if (!validateDid(_did)) {
        return NextResponse.json({ approval: false, error: 'DID is missing from the URL path, invalid, or too long' }, { status: 400 });
    }

    if (!validateVersion(_version)) {
        return NextResponse.json({ approval: false, error: 'Version is missing from the URL path or invalid (must be x.y or x.y.z)' }, { status: 400 });
    }
    // --- End DID and Version Validation ---

    // Construct versionedDid using the utility function
    const versionedDid = buildVersionedDID(_did, _version);
    console.log(`[API portal-url] Processing request for: ${versionedDid}`);

    const body = await request.json();

    // Extract parameters from body using IWPS constants, prefixing local vars with _
    const _location = body[AppConfig.IWPS_LOCATION_KEY]; 
    const _sourceIsa = body[AppConfig.IWPS_SOURCE_ISA_KEY]; 
    const _sourceBits = body[AppConfig.IWPS_SOURCE_BITS_KEY]; 
    const _sourceOs = body[AppConfig.IWPS_SOURCE_OS_KEY]; 
    const _sourceOsVersion = body[AppConfig.IWPS_SOURCE_OS_VERSION_KEY]; 
    const _sourceClientType = body[AppConfig.IWPS_SOURCE_CLIENT_TYPE_KEY]; 
    const _teleportId = body[AppConfig.IWPS_TELEPORT_ID_KEY]; 
    const _userId = body[AppConfig.IWPS_USER_ID_KEY]; 
    const _teleportPin = body[AppConfig.IWPS_TELEPORT_PIN_KEY]; 
    const _sourceAckUrl = body[AppConfig.IWPS_SOURCE_ACK_URL_KEY]; 
    const _sourceNackUrl = body[AppConfig.IWPS_SOURCE_NACK_URL_KEY];
    // Ignoring sourceCharacteristics, assets, error for now as per instructions scope
    
    // Use underscored variables and constants for keys in log
    console.log('Extracted parameters:', { 
      [AppConfig.IWPS_LOCATION_KEY]: _location, 
      [AppConfig.IWPS_SOURCE_ISA_KEY]: _sourceIsa, 
      [AppConfig.IWPS_SOURCE_BITS_KEY]: _sourceBits, 
      [AppConfig.IWPS_SOURCE_OS_KEY]: _sourceOs, 
      [AppConfig.IWPS_SOURCE_OS_VERSION_KEY]: _sourceOsVersion, 
      [AppConfig.IWPS_SOURCE_CLIENT_TYPE_KEY]: _sourceClientType, 
      [AppConfig.IWPS_TELEPORT_ID_KEY]: _teleportId, 
      [AppConfig.IWPS_USER_ID_KEY]: _userId, 
      [AppConfig.IWPS_TELEPORT_PIN_KEY]: _teleportPin, 
      [AppConfig.IWPS_SOURCE_ACK_URL_KEY]: _sourceAckUrl, 
      [AppConfig.IWPS_SOURCE_NACK_URL_KEY]: _sourceNackUrl 
    });

    // --- Validation Logic --- 

    // Group 1 parameters (for reference, no longer a strict check here)
    const _group1Params = { 
      _sourceIsa, 
      _sourceBits, 
      _sourceOs, 
      _sourceOsVersion, 
      _sourceClientType 
    };
    // const group1PresentCount = Object.values(group1Params).filter(isDefined).length;
    // The strict check for Group 1 completeness is removed.
    // Platform matching logic will handle missing _sourceOs gracefully.

    // 3. Group 2 Dependency Check (remains the same)
    const group2Params = { 
      _teleportId, 
      _userId, 
      _teleportPin, 
      _sourceAckUrl, 
      _sourceNackUrl 
    };
    const group2Keys = [AppConfig.IWPS_TELEPORT_ID_KEY, AppConfig.IWPS_USER_ID_KEY, AppConfig.IWPS_TELEPORT_PIN_KEY, AppConfig.IWPS_SOURCE_ACK_URL_KEY, AppConfig.IWPS_SOURCE_NACK_URL_KEY]; 
    const group2PresentCount = Object.values(group2Params).filter(isDefined).length;

    if (group2PresentCount > 0 && group2PresentCount < group2Keys.length) {
      const missingKeys = group2Keys.filter(key => !isDefined(body[key]));
      return NextResponse.json({ approval: false, error: `Incomplete Group 2 parameters. Missing: ${missingKeys.join(', ')}` }, { status: 400 });
    }

    // 4. Check if at least some meaningful parameters are present
    // We need at least sourceOs for platform matching (if not web) OR Group 2 for teleport features.
    // Location is always present in the request from proxy, but can be empty.
    if (!isDefined(_sourceOs) && group2PresentCount === 0) {
      // If no sourceOs AND no Group 2 params, the request is too vague.
      // Note: platform matching will still try to match 'web' first even if _sourceOs is not defined.
      // This check ensures that if it's not a 'web' platform and no _sourceOs, and no Group 2, it's an error.
      // However, the platform matching itself will correctly say "Platform compatibility check requires Group 1 parameters" if _sourceOs is needed but missing.
      // A more precise check: if no group 2, and sourceOs is needed for platform matching but is missing. 
      // Let's refine this: the platform matching handles the _sourceOs requirement. We just need to ensure the request isn't completely empty of IWPS params.
      const allIwpsParams = { ..._group1Params, ...group2Params, _location };
      const anyIwpsParamPresent = Object.values(allIwpsParams).some(isDefined);
      if (!anyIwpsParamPresent) {
         return NextResponse.json({ approval: false, error: 'Request must include some IWPS parameters (either Group 1 or Group 2 related).' }, { status: 400 });
      }
    }

    // --- End Validation --- 

    // --- Fetch Metadata --- 
    console.log(`[API portal-url] Fetching metadata for: ${versionedDid}`);
    let appMetadata: MetadataContractData | null = null;
    try {
      appMetadata = await getMetadata(versionedDid);
    } catch (metadataError) {
       console.log(`[API portal-url] Error fetching metadata for ${versionedDid}:`, metadataError);
       return NextResponse.json({ approval: false, error: 'Failed to retrieve application metadata' }, { status: 500 });
    }

    if (!appMetadata) {
       console.log(`[API portal-url] Metadata not found for: ${versionedDid}`);
       return NextResponse.json({ approval: false, error: 'Application metadata not found for the specified DID and version' }, { status: 404 });
    }
    console.log(`[API portal-url] Successfully fetched metadata for: ${versionedDid}`);
    // --- End Fetch Metadata --- 

    // --- Platform Matching Logic --- 
    // Keep underscore for spec response value
    let _approval = false;
    // Remove underscore - internal error string, not a direct spec value
    let responseError: string | null = "Platform matching not performed"; 
    // Keep underscore for spec response value
    let _destinationUrl = ""; 
    // Keep underscore for spec response value
    let _downloadUrl: string | undefined = undefined; 

    const isGroup1Present = isDefined(_sourceOs) || isDefined(_sourceClientType) || isDefined(_sourceIsa) || isDefined(_sourceBits) || isDefined(_sourceOsVersion);

    if (isGroup1Present) {
        const supportedPlatforms = appMetadata?.platforms; 
        if (!supportedPlatforms || Object.keys(supportedPlatforms).length === 0) {
            responseError = "No platform information found in application metadata.";
        } else {
            let matchedPlatformDetails: { launchUrl?: string; downloadUrl?: string } | null = null; 

            // Use renamed variable
            const webPlatformKey = Object.keys(supportedPlatforms).find(key => key.toLowerCase() === AppConfig.WEB_KEY);
            // Use renamed variable
            if (webPlatformKey && (supportedPlatforms as any)[webPlatformKey]) { 
                console.log(`[API portal-url] Web platform found. Using as default.`); 
                // Use renamed variable
                matchedPlatformDetails = (supportedPlatforms as any)[webPlatformKey]; 
            } else {
                const sourcePlatformKey = _sourceOs?.toLowerCase(); 
                if (sourcePlatformKey) {
                    // Use renamed variable
                    const matchedOsKey = Object.keys(supportedPlatforms).find(key => key.toLowerCase() === sourcePlatformKey);
                    // Use renamed variable
                    if (matchedOsKey && (supportedPlatforms as any)[matchedOsKey]) { 
                        console.log(`[API portal-url] Found matching OS platform: ${matchedOsKey}`); 
                        // Use renamed variable
                        matchedPlatformDetails = (supportedPlatforms as any)[matchedOsKey]; 
                    }
                }
            }

            if (matchedPlatformDetails) { 
                // Keep underscore for spec value
                _approval = true;
                // Use non-prefixed internal state var
                responseError = null; 
                // Keep underscore for spec value
                _destinationUrl = matchedPlatformDetails.launchUrl || ""; 
                // Keep underscore for spec value
                _downloadUrl = matchedPlatformDetails.downloadUrl || ""; 
            } else {
                // Use non-prefixed internal state var
                responseError = "Platform not supported based on provided source parameters.";
                console.log(`[API portal-url] ${responseError} Input OS: ${_sourceOs}`);
            }
        }
    } else {
        // Use non-prefixed internal state var
        responseError = "Platform compatibility check requires Group 1 parameters.";
        console.log(`[API portal-url] ${responseError}`);
    }
    // --- End Platform Matching Logic --- 

    // --- Construct Final Response --- 
    // Remove underscore - response object itself
    const responseBody: any = { 
        [AppConfig.IWPS_APPROVAL_KEY]: _approval, // Keep prefix for value
        [AppConfig.IWPS_LOCATION_KEY]: "", 
        [AppConfig.IWPS_DESTINATION_URL_KEY]: _destinationUrl, // Keep prefix for value
    };

    // Use non-prefixed variable for check
    if (responseError && !_approval) { 
        responseBody[AppConfig.IWPS_ERROR_KEY] = responseError;
    }
    // Keep prefix for value
    if (isGroup1Present && _downloadUrl !== undefined) { 
        responseBody[AppConfig.IWPS_DOWNLOAD_URL_KEY] = _downloadUrl;
    }
    if (group2PresentCount > 0) {
        responseBody[AppConfig.IWPS_EXPIRATION_KEY] = 0; 
    }

    // Use non-prefixed variable
    console.log(`[API portal-url] Sending response:`, responseBody);
    // Use non-prefixed variable
    return NextResponse.json(responseBody);
    // --- End Construct Final Response --- 

  } catch (error) {
    console.error(`[API portal-url] Error processing request:`, error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ approval: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    return NextResponse.json({ approval: false, error: 'Internal Server Error' }, { status: 500 });
  }
}