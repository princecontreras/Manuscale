import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/services/firebaseAdmin';
import * as admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * ADMIN ENDPOINT - Sync subscription data from Stripe to Firestore
 * Use this to diagnose missing subscription data
 * 
 * Query params:
 * - email: Sync a specific user by email
 * - limit: Number of customers to check (default: 10)
 * - verbose: Set to "true" for detailed logs
 */
export async function POST(req: NextRequest) {
  try {
    // Get authorization header (should have admin token or special key)
    const authHeader = req.headers.get('Authorization');
    const adminKey = process.env.SYNC_ADMIN_KEY;
    
    // Check if request has proper authorization
    if (!authHeader?.includes(adminKey || 'ADMIN_KEY_NOT_SET')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid admin key' },
        { status: 401 }
      );
    }

    const { email, limit = 10, verbose = false } = await req.json().catch(() => ({}));

    console.log('\n[SYNC] Starting subscription sync from Stripe to Firestore');
    console.log(`[SYNC] Params:`, { email, limit, verbose });

    const app = getAdminApp();
    const databaseId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID || '(default)';
    const adminDb = (admin.firestore as any)(app, databaseId);
    const results = {
      checked: 0,
      synced: 0,
      errors: [] as string[],
      details: [] as any[],
    };

    // If email provided, sync just that user
    if (email) {
      console.log(`[SYNC] Fetching customer by email: ${email}`);
      const customers = await stripe.customers.list({ email, limit: 1 });
      
      if (customers.data.length === 0) {
        return NextResponse.json({
          success: false,
          message: `No Stripe customer found for email: ${email}`,
          results,
        });
      }

      const customer = customers.data[0];
      console.log(`[SYNC] Found Stripe customer: ${customer.id}`);

      // Get all subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 100,
      });

      for (const subscription of subscriptions.data) {
        results.checked++;
        const detail: any = {
          customerId: customer.id,
          email: customer.email,
          subscriptionId: subscription.id,
          status: subscription.status,
        };

        try {
          // Try to find Firebase user by email
          const userQuery = await adminDb
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

          if (userQuery.empty) {
            const errorMsg = `No Firebase user found for email: ${email}`;
            detail.error = errorMsg;
            results.errors.push(errorMsg);
            console.warn(`[SYNC] ✗ ${errorMsg}`);
          } else {
            const firebaseUid = userQuery.docs[0].id;
            const priceId = subscription.items.data[0]?.price.id || '';
            const monthlyPrice = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
            const yearlyPrice = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID;
            
            const plan = priceId === monthlyPrice ? 'monthly'
              : priceId === yearlyPrice ? 'yearly'
              : priceId;

            const currentPeriodEnd = (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000)
              : new Date();

            // Sync to Firestore
            await adminDb.collection('users').doc(firebaseUid).set({
              stripeCustomerId: customer.id,
              subscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              currentPeriodEnd,
              plan,
              updatedAt: new Date(),
            }, { merge: true });

            results.synced++;
            detail.firebaseUid = firebaseUid;
            detail.plan = plan;
            detail.synced = true;
            console.log(`[SYNC] ✓ Synced subscription for ${firebaseUid}`);
          }
        } catch (err: any) {
          const errorMsg = `Failed to sync: ${err.message}`;
          detail.error = errorMsg;
          results.errors.push(errorMsg);
          console.error(`[SYNC] ✗ ${errorMsg}`);
        }

        results.details.push(detail);
      }
    } else {
      // Sync all recent customers
      console.log(`[SYNC] Fetching ${limit} recent customers from Stripe`);
      const customers = await stripe.customers.list({ limit });

      for (const customer of customers.data) {
        if (!customer.email) continue;

        results.checked++;
        const detail: any = {
          customerId: customer.id,
          email: customer.email,
        };

        try {
          // Get subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 100,
          });

          if (subscriptions.data.length === 0) {
            detail.note = 'No active subscriptions';
            continue;
          }

          // Try to find Firebase user by email
          const userQuery = await adminDb
            .collection('users')
            .where('email', '==', customer.email)
            .limit(1)
            .get();

          if (userQuery.empty) {
            const errorMsg = `No Firebase user found for ${customer.email}`;
            detail.error = errorMsg;
            results.errors.push(errorMsg);
          } else {
            const firebaseUid = userQuery.docs[0].id;
            const subscription = subscriptions.data[0];
            const priceId = subscription.items.data[0]?.price.id || '';
            const monthlyPrice = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
            const yearlyPrice = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID;
            
            const plan = priceId === monthlyPrice ? 'monthly'
              : priceId === yearlyPrice ? 'yearly'
              : priceId;

            const currentPeriodEnd = (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000)
              : new Date();

            // Sync to Firestore
            await adminDb.collection('users').doc(firebaseUid).set({
              stripeCustomerId: customer.id,
              subscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              currentPeriodEnd,
              plan,
              updatedAt: new Date(),
            }, { merge: true });

            results.synced++;
            detail.firebaseUid = firebaseUid;
            detail.subscriptionId = subscription.id;
            detail.plan = plan;
            detail.synced = true;
          }
        } catch (err: any) {
          const errorMsg = `Failed to sync: ${err.message}`;
          detail.error = errorMsg;
          results.errors.push(errorMsg);
        }

        if (verbose) {
          results.details.push(detail);
        }
      }
    }

    console.log(`\n[SYNC] Complete - Checked: ${results.checked}, Synced: ${results.synced}, Errors: ${results.errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced}/${results.checked} subscriptions`,
      results,
    });
  } catch (error: any) {
    console.error('[SYNC] ✗ Sync error:', {
      error: String(error),
      message: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const email = searchParams.get('email') || undefined;
  const limit = parseInt(searchParams.get('limit') || '10');
  const verbose = searchParams.get('verbose') === 'true';

  // Recreate as POST request for reuse
  return POST(
    new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({ email, limit, verbose }),
    })
  );
}
