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
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  if (!projectId) {
    throw new Error('Firebase Admin: FIREBASE_ADMIN_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) env var is required.');
  }

  // Minimal init — only token verification works without a service account key.
  return admin.initializeApp({ projectId });
}

export const getAdminApp = (): admin.app.App => initAdmin();

/**
 * Verify a Firebase ID token from the Authorization header and return the decoded token.
 * Throws if the token is missing or invalid.
 */
export async function verifyIdToken(authHeader: string | null): Promise<admin.auth.DecodedIdToken> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing or malformed Authorization header'), { status: 401 });
  }

  const idToken = authHeader.slice(7);
  const app = getAdminApp();

  try {
    return await admin.auth(app).verifyIdToken(idToken);
  } catch {
    throw Object.assign(new Error('Invalid or expired Firebase token'), { status: 401 });
  }
}
