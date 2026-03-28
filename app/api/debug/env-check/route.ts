import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Check environment variables
 * ONLY USE FOR DEBUGGING - Should be removed before deploying to production
 * 
 * This endpoint helps diagnose Firebase Admin service account issues
 */
export async function GET(req: NextRequest) {
  // Only allow from localhost or with admin key
  const adminKey = req.nextUrl.searchParams.get('key');
  const isLocalhost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
  
  if (!isLocalhost && adminKey !== process.env.DEBUG_ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  const info: Record<string, any> = {
    env_set: !!serviceAccountJson,
    length: serviceAccountJson?.length || 0,
    first_100_chars: serviceAccountJson?.substring(0, 100) || 'NOT SET',
    last_100_chars: serviceAccountJson?.substring((serviceAccountJson?.length || 0) - 100) || 'NOT SET',
    has_escaped_newlines: serviceAccountJson?.includes('\\n') || false,
    has_actual_newlines: serviceAccountJson?.includes('\n') || false,
    sample_substring: serviceAccountJson?.substring(150, 250) || 'NOT SET',
  };

  // Try to parse it
  if (serviceAccountJson) {
    try {
      // First try as-is
      JSON.parse(serviceAccountJson);
      info.parse_as_is = 'SUCCESS';
    } catch (e: any) {
      info.parse_as_is = `FAILED: ${e.message}`;
    }

    try {
      // Try with newline replacement
      const processed = serviceAccountJson
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
      
      const parsed = JSON.parse(processed);
      info.parse_with_replacement = 'SUCCESS';
      info.parsed_keys = Object.keys(parsed);
      
      if (parsed.private_key) {
        const keyLines = parsed.private_key.split('\n');
        info.private_key_lines = keyLines.length;
        info.private_key_first_line = keyLines[0];
        info.private_key_last_line = keyLines[keyLines.length - 1];
      }
    } catch (e: any) {
      info.parse_with_replacement = `FAILED: ${e.message}`;
    }
  }

  return NextResponse.json(info);
}
