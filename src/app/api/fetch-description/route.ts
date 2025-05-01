import { NextResponse } from 'next/server';
import { log } from '@/lib/log';

// Set a reasonable timeout for fetching external URLs (e.g., 5 seconds)
const FETCH_TIMEOUT = 5000; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const descriptionUrl = searchParams.get('url');

  log('[API fetch-description] Received request for URL:', descriptionUrl);

  if (!descriptionUrl) {
    log('[API fetch-description] Error: URL parameter is missing');
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // Validate the URL format loosely before fetching
  try {
    new URL(descriptionUrl);
  } catch (e) {
    log('[API fetch-description] Error: Invalid URL format:', descriptionUrl);
    return NextResponse.json({ error: 'Invalid URL format provided' }, { status: 400 });
  }

  try {
    // Use AbortController for fetch timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    log(`[API fetch-description] Fetching content from: ${descriptionUrl}`);
    const response = await fetch(descriptionUrl, { 
      signal: controller.signal,
      headers: {
        // Accept both plain text and HTML
        'Accept': 'text/plain, text/html, application/json, */*;q=0.8' 
      } 
    });
    clearTimeout(timeoutId); // Clear timeout if fetch completed/failed normally

    if (!response.ok) {
      log(`[API fetch-description] Error: Failed to fetch URL ${descriptionUrl}. Status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Handle different content types appropriately
    if (contentType.includes('application/json')) {
      // For JSON, try to extract description or content field
      const data = await response.json();
      const description = data.description || data.content || JSON.stringify(data, null, 2);
      return NextResponse.json({ content: description });
    } 
    else {
      // For plain text or HTML, return as is
      const text = await response.text();
      return NextResponse.json({ content: text });
    }

  } catch (error) {
    log(`[API fetch-description] Error fetching description: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ 
      error: 'Failed to fetch description content',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 