import { NextResponse } from 'next/server';

// Configure headers for CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Simple API route that checks if a URL is valid and accessible
 * No content parsing, just HTTP status check
 */
export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Try multiple methods to validate the endpoint
    try {
      const controller = new AbortController();
      // 10 second timeout (longer for RPC endpoints)
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('[validate-url] Testing URL:', url);
      console.log('[validate-url] Step 1: Trying HEAD request...');

      let response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'OMA3-App-Registry/1.0',
        },
        signal: controller.signal,
      });

      console.log('[validate-url] HEAD response:', response.status, response.statusText);

      // If HEAD fails, try GET
      if (!response.ok && (response.status === 405 || response.status === 400 || response.status === 404)) {
        console.log('[validate-url] Step 2: Trying GET request...');
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'OMA3-App-Registry/1.0',
          },
          signal: controller.signal,
        });
        console.log('[validate-url] GET response:', response.status, response.statusText);
      }

      // If GET also fails, try a JSON-RPC POST request
      if (!response.ok && (response.status === 405 || response.status === 400 || response.status === 404)) {
        console.log('[validate-url] Step 3: Trying JSON-RPC POST request...');
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'OMA3-App-Registry/1.0',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          }),
          signal: controller.signal,
        });
        console.log('[validate-url] POST response:', response.status, response.statusText);
      }

      clearTimeout(timeoutId);

      // Consider it valid if we get any response (even errors mean the endpoint exists)
      // Any 4xx or 5xx error means the server is responding, just doesn't like our request
      const isAccessible = response.ok ||
        (response.status >= 400 && response.status < 600); // Any client or server error means endpoint exists

      console.log('[validate-url] Final decision - isAccessible:', isAccessible, 'status:', response.status);

      return NextResponse.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        hostname: urlObj.hostname,
        isValid: isAccessible,
        note: !response.ok && isAccessible ? 'Endpoint exists but may require specific request format' : undefined
      }, { headers: corsHeaders });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // If it's an abort error, it's a timeout
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';

      console.log('[validate-url] Error occurred:', errorMessage);
      console.log('[validate-url] Is timeout:', isTimeout);

      return NextResponse.json(
        {
          success: false,
          error: isTimeout ? 'Request timed out' : 'Failed to access URL',
          details: errorMessage,
          hostname: urlObj.hostname,
          isValid: false
        },
        { status: 200, headers: corsHeaders }  // Still return 200 to client, just with error info
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Server error processing request',
        details: error instanceof Error ? error.message : String(error),
        isValid: false
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 