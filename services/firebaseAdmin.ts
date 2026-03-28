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
      // In Vercel/production, env vars store escape sequences as literal characters.
      // Replace literal \n, \r, \t with actual newline/return/tab characters.
      // This is needed because the PEM formatted private key has newlines represented as \n
      let processedJson = serviceAccountJson
        .replace(/\\n/g, '\n')    // Replace literal \n with actual newline
        .replace(/\\r/g, '\r')    // Replace literal \r with actual carriage return
        .replace(/\\t/g, '\t');   // Replace literal \t with actual tab
      
      console.log('[Firebase] Parsing service account JSON...');
      const serviceAccount = JSON.parse(processedJson) as admin.ServiceAccount;
      console.log('✓ Firebase Admin initialized with service account');
      return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (error) {
      console.error('❌ Failed to parse Firebase service account JSON:', error);
      console.error('Service account JSON length:', serviceAccountJson?.length);
      console.error('First 150 chars:', serviceAccountJson?.substring(0, 150));
      
      // Provide more detailed error info
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
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
