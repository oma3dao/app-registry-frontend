import { NextResponse } from 'next/server';
import { log } from '@/lib/log'; // Assuming log utility exists

// Set a reasonable timeout for fetching external URLs (e.g., 5 seconds)
const FETCH_TIMEOUT = 5000; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dataUrl = searchParams.get('url');

  log('[API fetch-metadata] Received request for URL:', dataUrl);

  if (!dataUrl) {
    log('[API fetch-metadata] Error: URL parameter is missing');
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // Validate the URL format loosely before fetching
  try {
    new URL(dataUrl);
  } catch (e) {
    log('[API fetch-metadata] Error: Invalid URL format:', dataUrl);
    return NextResponse.json({ error: 'Invalid URL format provided' }, { status: 400 });
  }

  try {
    // Use AbortController for fetch timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    log(`[API fetch-metadata] Fetching content from: ${dataUrl}`);
    const response = await fetch(dataUrl, { 
      signal: controller.signal,
      headers: {
        // Request JSON specifically if possible
        'Accept': 'application/json, */*;q=0.8' 
      } 
    });
    clearTimeout(timeoutId); // Clear timeout if fetch completed/failed normally

    if (!response.ok) {
      log(`[API fetch-metadata] Error: Failed to fetch URL ${dataUrl}. Status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        log(`[API fetch-metadata] Warning: Content-Type is not JSON for ${dataUrl}. Type: ${contentType}`);
        // Decide how to handle non-JSON - maybe still try to parse? For now, we require JSON.
        // return NextResponse.json({ imageUrl: null, error: 'Content-Type is not application/json' }, { status: 200 }); 
        // OR throw an error:
         throw new Error('Content-Type is not application/json');
    }

    log(`[API fetch-metadata] Parsing JSON response from: ${dataUrl}`);
    const metadata = await response.json();
    log(`[API fetch-metadata] JSON parsed successfully.`);

    // Extract the image URL (assuming standard 'image' key)
    const image = metadata?.image;

    if (typeof image === 'string' && image.trim() !== '') {
      log(`[API fetch-metadata] Found image URL: ${image}`);
      // Optionally validate image format here if needed
      return NextResponse.json({ image });
    } else {
      log(`[API fetch-metadata] Image URL not found or invalid in JSON for: ${dataUrl}`);
      return NextResponse.json({ image: null, error: 'Image URL not found in metadata' });
    }

  } catch (error: any) {
    log(`[API fetch-metadata] Fetch/Parse Error for ${dataUrl}:`, error);
    
    let errorMessage = 'Failed to fetch or parse metadata';
    if (error.name === 'AbortError') {
        errorMessage = 'Request timed out';
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    // Return success response but with null image and error message
    return NextResponse.json({ image: null, error: errorMessage }, { status: 200 }); 
    // Or return server error:
    // return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 