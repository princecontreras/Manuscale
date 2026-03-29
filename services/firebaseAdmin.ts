import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK once (singleton pattern for serverless environments)
function initAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // If a full service account JSON is provided, use it for full Admin SDK capabilities.
  // Otherwise, fall back to projectId-only mode (sufficient for ID token verification
  // via the public JWKS endpoint — no private key required).
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (serviceAccountJson && serviceAccountJson !== '{}') {
    try {
      console.log('[Firebase] Service account JSON detected, length:', serviceAccountJson.length);
      
      let serviceAccount: admin.ServiceAccount | null = null;
      let parseStrategy = '';

      // Strategy 1: Try parsing as-is (in case it doesn't need conversion)
      try {
        serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
        parseStrategy = 'as-is';
        console.log('[Firebase] ✓ Successfully parsed as-is');
      } catch (e1) {
        console.log('[Firebase] Strategy 1 (as-is) failed, trying escape sequence replacement...');
        
        // Strategy 2: Replace literal \n sequences with actual newlines
        try {
          const processedJson = serviceAccountJson
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');
          
          serviceAccount = JSON.parse(processedJson) as admin.ServiceAccount;
          parseStrategy = 'escape-replacement';
          console.log('[Firebase] ✓ Successfully parsed with escape replacement');
        } catch (e2) {
          console.log('[Firebase] Strategy 2 (escape replacement) failed, trying double-escape fix...');
          
          // Strategy 3: Handle double-escaped sequences (\\\\n -> \\n -> \n)
          try {
            const doubleEscaped = serviceAccountJson
              .replace(/\\\\\\\n/g, '\n')          // \\n -> \n
              .replace(/\\\\n/g, '\n')              // \\n -> \n
              .replace(/\\\\\\\r/g, '\r')
              .replace(/\\\\r/g, '\r')
              .replace(/\\\\\\\t/g, '\t')
              .replace(/\\\\t/g, '\t');
            
            serviceAccount = JSON.parse(doubleEscaped) as admin.ServiceAccount;
            parseStrategy = 'double-escape-fix';
            console.log('[Firebase] ✓ Successfully parsed with double-escape fix');
          } catch (e3) {
            throw new Error(
              `All parsing strategies failed. ` +
              `Strategy 1 (as-is): ${e1}. ` +
              `Strategy 2 (escape-replacement): ${e2}. ` +
              `Strategy 3 (double-escape-fix): ${e3}`
            );
          }
        }
      }

      if (!serviceAccount) {
        throw new Error('Service account is null after parsing');
      }

      // Validate the private key exists and is properly formatted
      const privateKey = (serviceAccount as any).private_key || (serviceAccount as any).privateKey;
      if (!privateKey) {
        throw new Error('No private_key found in service account');
      }

      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        throw new Error('Private key does not have valid PEM format markers');
      }

      const keyLines = privateKey.split('\n');
      console.log(`[Firebase] Private key format valid: ${keyLines.length} lines, using strategy: ${parseStrategy}`);
      
      console.log('✓ Firebase Admin initialized with service account');
      return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (error) {
      console.error('❌ Failed to parse Firebase service account JSON:', error);
      console.error('Service account JSON length:', serviceAccountJson?.length);
      console.error('First 200 chars:', serviceAccountJson?.substring(0, 200));
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }

      // Fallback: Try projectId-only mode so app doesn't crash completely
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (projectId) {
        console.warn('⚠ Falling back to projectId-only Firebase Admin mode. Firestore operations will fail.');
        console.warn('❌ CRITICAL: You must fix FIREBASE_ADMIN_SERVICE_ACCOUNT to enable Firestore access.');
        return admin.initializeApp({ projectId });
      }

      throw new Error(`Firebase Admin: Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT. ${String(error)}`);
    }
  }

  if (!projectId) {
    throw new Error('Firebase Admin: FIREBASE_ADMIN_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) env var is required.');
  }

  // Minimal init — only token verification works without a service account key.
  console.warn('⚠ Firebase Admin initialized without service account (projectId-only mode). Firestore operations will fail.');
  return admin.initializeApp({ projectId });
}

export const getAdminApp = (): admin.app.App => initAdmin();

/**
 * Verify a Firebase ID token from the Authorization header and return the decoded token.
 * Throws if the token is missing or invalid.
 */
export async function verifyIdToken(authHeader: string | null): Promise<admin.auth.DecodedIdToken> {
  console.log('[verifyIdToken] Starting token verification');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[verifyIdToken] ✗ Missing or malformed Authorization header:', { hasHeader: !!authHeader, headerLength: authHeader?.length });
    throw Object.assign(new Error('Missing or malformed Authorization header'), { status: 401 });
  }

  const idToken = authHeader.slice(7);
  console.log('[verifyIdToken] Token extracted, length:', idToken.length);
  
  const app = getAdminApp();

  try {
    console.log('[verifyIdToken] Verifying with Firebase Admin SDK...');
    const decodedToken = await admin.auth(app).verifyIdToken(idToken);
    console.log('[verifyIdToken] ✓ Token verified successfully for user:', decodedToken.uid);
    return decodedToken;
  } catch (error: any) {
    console.error('[verifyIdToken] ✗ Token verification failed:', {
      errorType: error?.constructor?.name,
      code: error?.code,
      message: error?.message,
      errorString: String(error),
    });
    
    // Provide more specific error messages based on error code
    if (error?.code === 'auth/id-token-expired') {
      throw Object.assign(new Error('Token has expired. Please sign out and back in.'), { status: 401 });
    } else if (error?.code === 'auth/id-token-revoked') {
      throw Object.assign(new Error('Token has been revoked. Please sign in again.'), { status: 401 });
    } else if (error?.code === 'auth/invalid-id-token') {
      throw Object.assign(new Error('Invalid token format. Please sign in again.'), { status: 401 });
    }
    
    throw Object.assign(new Error('Token verification failed. Please try signing out and back in.'), { status: 401 });
  }
}
