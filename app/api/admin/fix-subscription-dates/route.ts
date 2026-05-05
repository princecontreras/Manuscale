import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/services/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { timingSafeEqual } from 'crypto';

function isValidAdminKey(provided: string | null): boolean {
  const expected = process.env.SYNC_ADMIN_KEY;
  if (!expected || !provided) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Fixes subscription dates for a user with an expired currentPeriodEnd
 * Sets currentPeriodEnd to 1 month from currentPeriodStart
 * 
 * Usage: GET /api/admin/fix-subscription-dates?email=user@example.com&key=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    const adminKey = req.nextUrl.searchParams.get('key');

    // Use constant-time comparison to prevent timing attacks
    if (!isValidAdminKey(adminKey)) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid admin key' },
        { status: 401 }
      );
    }
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    console.log(`[fix-subscription-dates] Starting for email: ${email}`);

    // Initialize Firebase Admin
    const app = getAdminApp();
    const databaseId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID || '(default)';
    const adminDb = getFirestore(app, databaseId);

    // Find user by email
    console.log('[fix-subscription-dates] Looking up user by email...');
    const querySnapshot = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      console.error(`[fix-subscription-dates] User not found: ${email}`);
      return NextResponse.json(
        { error: `User not found with email: ${email}` },
        { status: 404 }
      );
    }

    const userDoc = querySnapshot.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();

    console.log(`[fix-subscription-dates] Found user: ${uid}`);
    console.log('[fix-subscription-dates] Current data:', {
      subscriptionStatus: userData.subscriptionStatus,
      plan: userData.plan,
      currentPeriodStart: userData.currentPeriodStart?.toDate?.() || userData.currentPeriodStart,
      currentPeriodEnd: userData.currentPeriodEnd?.toDate?.() || userData.currentPeriodEnd,
      cancelAt: userData.cancelAt?.toDate?.() || userData.cancelAt,
      cancelAtPeriodEnd: userData.cancelAtPeriodEnd,
    });

    // Get the current period start
    const currentPeriodStart = userData.currentPeriodStart?.toDate?.() || 
                              (userData.currentPeriodStart instanceof Date ? userData.currentPeriodStart : new Date(userData.currentPeriodStart));
    
    // Calculate 1 month from current period start
    const newPeriodEnd = new Date(currentPeriodStart);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    console.log('[fix-subscription-dates] Applying fixes:', {
      oldPeriodEnd: userData.currentPeriodEnd?.toDate?.() || userData.currentPeriodEnd,
      newPeriodEnd: newPeriodEnd,
    });

    // Update the user document
    await adminDb.collection('users').doc(uid).set({
      currentPeriodEnd: newPeriodEnd,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      subscriptionStatus: 'active',
      updatedAt: new Date(),
    }, { merge: true });

    console.log(`[fix-subscription-dates] ✓ Successfully updated for ${email}`);

    // Verify the update
    const updatedDoc = await adminDb.collection('users').doc(uid).get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      success: true,
      message: `Fixed subscription dates for ${email}`,
      before: {
        currentPeriodEnd: userData.currentPeriodEnd?.toDate?.() || userData.currentPeriodEnd,
        cancelAt: userData.cancelAt?.toDate?.() || userData.cancelAt,
        cancelAtPeriodEnd: userData.cancelAtPeriodEnd,
        subscriptionStatus: userData.subscriptionStatus,
      },
      after: {
        currentPeriodEnd: newPeriodEnd,
        cancelAt: null,
        cancelAtPeriodEnd: false,
        subscriptionStatus: 'active',
      },
    });

  } catch (error: any) {
    console.error('[fix-subscription-dates] Error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    return NextResponse.json(
      { 
        error: 'Failed to fix subscription dates',
        details: error?.message 
      },
      { status: 500 }
    );
  }
}
