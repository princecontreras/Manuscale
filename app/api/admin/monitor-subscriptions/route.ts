import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/services/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { validateSubscriptionDates } from '@/utils/subscriptionValidation';

/**
 * Monitors subscription dates in Firestore for issues
 * Finds users with invalid subscription dates and returns details
 * 
 * Usage: GET /api/admin/monitor-subscriptions?adminKey=xxx&limit=100
 * 
 * Returns array of users with invalid dates and suggestions for fixes
 */
export async function GET(req: NextRequest) {
  try {
    const adminKey = req.nextUrl.searchParams.get('adminKey');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);

    // Check authorization
    if (!adminKey || adminKey !== process.env.SYNC_ADMIN_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid admin key' },
        { status: 401 }
      );
    }

    console.log('[monitor-subscriptions] Starting monitoring scan...');

    const app = getAdminApp();
    const databaseId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID || '(default)';
    const adminDb = getFirestore(app, databaseId);

    const issues: any[] = [];
    const checked: number = 0;

    // Scan through users collection
    const usersSnapshot = await adminDb
      .collection('users')
      .where('subscriptionStatus', '==', 'active')
      .limit(limit)
      .get();

    console.log(`[monitor-subscriptions] Found ${usersSnapshot.size} active subscriptions to check`);

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;

      // Skip if no subscription dates
      if (!userData.currentPeriodStart || !userData.currentPeriodEnd) {
        continue;
      }

      // Validate the dates
      const validation = validateSubscriptionDates(
        userData.currentPeriodStart,
        userData.currentPeriodEnd
      );

      if (!validation.isValid) {
        issues.push({
          uid,
          email: userData.email || 'unknown',
          plan: userData.plan,
          subscriptionStatus: userData.subscriptionStatus,
          subscriptionId: userData.subscriptionId,
          currentPeriodStart: userData.currentPeriodStart?.toDate?.() || userData.currentPeriodStart,
          currentPeriodEnd: userData.currentPeriodEnd?.toDate?.() || userData.currentPeriodEnd,
          updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
          validationIssues: validation.issues,
          fixEndpoint: `/api/admin/fix-subscription-dates?email=${encodeURIComponent(userData.email || '')}`,
        });
      }
    }

    console.log(`[monitor-subscriptions] ✓ Scan complete. Found ${issues.length} issues.`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checked: usersSnapshot.size,
      issuesFound: issues.length,
      issues,
      summary: {
        totalScanned: usersSnapshot.size,
        problematic: issues.length,
        healthy: usersSnapshot.size - issues.length,
      },
    });

  } catch (error: any) {
    console.error('[monitor-subscriptions] Error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        error: 'Failed to monitor subscriptions',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
