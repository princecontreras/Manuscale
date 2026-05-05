import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/services/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { validateSubscriptionDates } from '@/utils/subscriptionValidation';
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
 * Bulk fixes subscriptions with invalid dates
 * Automatically fixes all subscriptions found with issues
 * 
 * Usage: POST /api/admin/bulk-fix-subscriptions
 * Body: { adminKey: "xxx", dryRun: true/false, limit: 100 }
 * 
 * Returns list of fixed subscriptions
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminKey, dryRun = true, limit = 100 } = body;

    // Use constant-time comparison to prevent timing attacks
    if (!isValidAdminKey(adminKey ?? null)) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid admin key' },
        { status: 401 }
      );
    }

    console.log(`[bulk-fix-subscriptions] Starting bulk fix (dryRun: ${dryRun})...`);

    const app = getAdminApp();
    const databaseId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID || '(default)';
    const adminDb = getFirestore(app, databaseId);

    const fixed: any[] = [];
    const errors: any[] = [];

    // Scan through users collection
    const usersSnapshot = await adminDb
      .collection('users')
      .where('subscriptionStatus', '==', 'active')
      .limit(limit)
      .get();

    console.log(`[bulk-fix-subscriptions] Found ${usersSnapshot.size} active subscriptions to check`);

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
        try {
          // Get the current period start
          const currentPeriodStart = userData.currentPeriodStart?.toDate?.() ||
                                    (userData.currentPeriodStart instanceof Date ? userData.currentPeriodStart : new Date(userData.currentPeriodStart));

          // Calculate 1 month from current period start
          const newPeriodEnd = new Date(currentPeriodStart);
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

          const fixedData = {
            uid,
            email: userData.email || 'unknown',
            plan: userData.plan,
            before: {
              currentPeriodEnd: userData.currentPeriodEnd?.toDate?.() || userData.currentPeriodEnd,
              cancelAtPeriodEnd: userData.cancelAtPeriodEnd,
              cancelAt: userData.cancelAt?.toDate?.() || userData.cancelAt,
            },
            after: {
              currentPeriodEnd: newPeriodEnd,
              cancelAtPeriodEnd: false,
              cancelAt: null,
            },
            validationIssues: validation.issues,
          };

          // Apply fix if not dry run
          if (!dryRun) {
            await adminDb.collection('users').doc(uid).set({
              currentPeriodEnd: newPeriodEnd,
              cancelAtPeriodEnd: false,
              cancelAt: null,
              subscriptionStatus: 'active',
              updatedAt: new Date(),
            }, { merge: true });

            console.log(`[bulk-fix-subscriptions] ✓ Fixed subscription for ${uid}`);
          } else {
            console.log(`[bulk-fix-subscriptions] (dry-run) Would fix subscription for ${uid}`);
          }

          fixed.push(fixedData);
        } catch (err: any) {
          const errorData = {
            uid,
            email: userData.email || 'unknown',
            error: err?.message,
          };
          errors.push(errorData);
          console.error(`[bulk-fix-subscriptions] Failed to fix ${uid}:`, err?.message);
        }
      }
    }

    const message = dryRun
      ? `[DRY RUN] Would fix ${fixed.length} subscriptions`
      : `Fixed ${fixed.length} subscriptions`;

    console.log(`[bulk-fix-subscriptions] ✓ Complete. ${message}. Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      dryRun,
      timestamp: new Date().toISOString(),
      checked: usersSnapshot.size,
      fixedCount: fixed.length,
      errorCount: errors.length,
      fixedSubscriptions: fixed.map(f => ({
        uid: f.uid,
        email: f.email,
        plan: f.plan,
        newPeriodEnd: f.after.currentPeriodEnd,
      })),
      failedFixes: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[bulk-fix-subscriptions] Error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    return NextResponse.json(
      {
        error: 'Failed to bulk fix subscriptions',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
