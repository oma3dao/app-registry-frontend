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

    // Simple HEAD request to check if URL is accessible
    try {
      const controller = new AbortController();
      // 5 second timeout
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',  // HEAD request doesn't download content
        headers: {
          'User-Agent': 'OMA3-App-Registry/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Return basic metadata about the URL
      return NextResponse.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        hostname: urlObj.hostname,
        isValid: response.ok  // true if status is 2xx
      }, { headers: corsHeaders });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If it's an abort error, it's a timeout
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      
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