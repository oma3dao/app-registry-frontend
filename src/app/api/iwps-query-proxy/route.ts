import { NextRequest, NextResponse } from 'next/server';
import * as AppConfig from '@/config/app-config'; 
import { validateUrl } from '@/lib/validation'; // Add validateUrl for the target URL

// Updated interface: Only expects target URL and IWPS parameters
interface ProxyRequestBody {
  targetIwpsPortalUrl: string; 
  // IWPS params will be captured using rest syntax
  [key: string]: any; 
}

export async function POST(request: NextRequest) {
  try {
    const body: { [key: string]: any } = await request.json(); 

    // Extract target URL
    const targetIwpsPortalUrl = body.targetIwpsPortalUrl as string;
    // Extract the actual IWPS parameters object that the frontend nested under 'iwpsParams'
    const paramsToForward = body.iwpsParams; 

    // --- Basic Validation --- 
    if (!targetIwpsPortalUrl) {
      return NextResponse.json({ success: false, error: 'Missing required field: targetIwpsPortalUrl' }, { status: 400 });
    }
    if (!validateUrl(targetIwpsPortalUrl)) {
      return NextResponse.json({ success: false, error: 'Invalid targetIwpsPortalUrl format.' }, { status: 400 });
    }
    if (!paramsToForward || typeof paramsToForward !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing or invalid iwpsParams object in request body' }, { status: 400 });
    }

    // --- Log what will be forwarded --- 
    console.log(`[API iwps-query-proxy] Proxying request to target URL: ${targetIwpsPortalUrl}`);
    console.log(`[API iwps-query-proxy] With body parameters to forward:`, paramsToForward);

    // --- Server-to-Server Fetch --- 
    let targetResponse: Response | null = null;
    try {
      targetResponse = await fetch(targetIwpsPortalUrl, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify(paramsToForward), // Send the extracted paramsToForward object
        // TODO: Consider adding signal for timeout/cancellation if needed
      });
    } catch (fetchError: any) {
      console.error(`[API iwps-query-proxy] Fetch error calling target ${targetIwpsPortalUrl}:`, fetchError);
      // Network error, DNS error, etc.
      return NextResponse.json({ success: false, error: `Failed to connect to target server: ${fetchError.message || 'Unknown fetch error'}` }, { status: 502 }); // Bad Gateway
    }
    
    // Check response status from the target server
    if (!targetResponse.ok) {
      const errorBody = await targetResponse.text(); // Get raw text in case of non-JSON error
      console.error(`[API iwps-query-proxy] Error response from target ${targetIwpsPortalUrl} (${targetResponse.status}): ${errorBody}`);
      return NextResponse.json({ success: false, error: `Target server returned error: ${targetResponse.status}` }, { status: 502 }); // Bad Gateway
    }
    
    // Parse the JSON response from the target server
    let targetResult: any;
    try {
      targetResult = await targetResponse.json();
      console.log(`[API iwps-query-proxy] Received response from target:`, targetResult);
    } catch (jsonError) {
        console.error(`[API iwps-query-proxy] Failed to parse JSON response from target ${targetIwpsPortalUrl}:`, jsonError);
        return NextResponse.json({ success: false, error: 'Invalid JSON response from target server' }, { status: 502 });
    }
    
    // --- Process and Forward Response (Forward relevant IWPS fields) --- 
    // Extract all potential fields using AppConfig constants
    const _approval = targetResult[AppConfig.IWPS_APPROVAL_KEY] === true; 
    const _location = targetResult[AppConfig.IWPS_LOCATION_KEY] ?? undefined; // Use ?? for null/undefined check
    const _destinationUrl = targetResult[AppConfig.IWPS_DESTINATION_URL_KEY] ?? undefined;
    const _downloadUrl = targetResult[AppConfig.IWPS_DOWNLOAD_URL_KEY] ?? undefined;
    const _portalUrl = targetResult[AppConfig.IWPS_UPDATED_PORTAL_URL_KEY] ?? undefined; // Use the specific const for returned portalUrl
    const _expiration = targetResult[AppConfig.IWPS_EXPIRATION_KEY] ?? undefined;
    const _errorMsg = targetResult[AppConfig.IWPS_ERROR_KEY] ?? (!_approval ? 'Launch not approved by target server' : undefined); // Default error if approval false and none provided
    
    // Construct the response object for the frontend, including all extracted fields
    const proxyResponse: { [key: string]: any } = {}; 

    proxyResponse[AppConfig.IWPS_APPROVAL_KEY] = _approval;
    if (_location !== undefined) proxyResponse[AppConfig.IWPS_LOCATION_KEY] = _location;
    if (_destinationUrl !== undefined) proxyResponse[AppConfig.IWPS_DESTINATION_URL_KEY] = _destinationUrl;
    if (_downloadUrl !== undefined) proxyResponse[AppConfig.IWPS_DOWNLOAD_URL_KEY] = _downloadUrl;
    if (_portalUrl !== undefined) proxyResponse[AppConfig.IWPS_UPDATED_PORTAL_URL_KEY] = _portalUrl;
    if (_expiration !== undefined) proxyResponse[AppConfig.IWPS_EXPIRATION_KEY] = _expiration;
    if (_errorMsg !== undefined) proxyResponse[AppConfig.IWPS_ERROR_KEY] = _errorMsg;

    console.log("[API iwps-query-proxy] Forwarding processed response to frontend:", proxyResponse);
    return NextResponse.json(proxyResponse);

    // --- Remove Placeholder Response --- 
    // return NextResponse.json({ 
    //     success: false, 
    //     error: 'Proxy logic not fully implemented', 
    //     targetUrl: finalTargetUrl, 
    //     sentParams: iwpsParams 
    // });

  } catch (error) {
    console.error('[API iwps-query-proxy] Error:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Invalid JSON body received by proxy' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error in proxy' }, { status: 500 });
  }
} 