import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/services/firebaseAdmin';
import * as admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Resolve the Firebase UID from a Stripe event object.
 * Tries metadata first, then looks up user by email in Firestore.
 */
async function resolveFirebaseUid(eventData: any): Promise<string | null> {
  console.log('[resolveFirebaseUid] Starting resolution...');
  
  // 1. Check metadata on the event object directly (checkout session has it)
  if (eventData.metadata?.firebaseUid) {
    console.log('[resolveFirebaseUid] ✓ Found firebaseUid in eventData.metadata');
    return eventData.metadata.firebaseUid;
  }

  // 2. For subscription events, try to get metadata from the customer's latest checkout session
  if (eventData.customer) {
    try {
      console.log('[resolveFirebaseUid] Checking Stripe checkout sessions for customer:', eventData.customer);
      const customerId = typeof eventData.customer === 'string' ? eventData.customer : eventData.customer.id;
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 5,
      });
      console.log(`[resolveFirebaseUid] Found ${sessions.data.length} checkout sessions`);
      
      for (const session of sessions.data) {
        if (session.metadata?.firebaseUid) {
          console.log('[resolveFirebaseUid] ✓ Found firebaseUid in checkout session metadata');
          return session.metadata.firebaseUid;
        }
      }
    } catch (e) {
      console.warn('[resolveFirebaseUid] Could not retrieve checkout sessions for customer:', e);
    }
  }

  // 3. Fall back to email lookup in Firestore using Admin SDK
  const email = eventData.customer_email || eventData.customer_details?.email;
  console.log('[resolveFirebaseUid] Attempting email lookup for:', email);
  
  if (email) {
    try {
      const app = getAdminApp();
      const adminDb = admin.firestore(app);
      console.log('[resolveFirebaseUid] Querying Firestore for user with email:', email);
      
      const querySnapshot = await adminDb
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!querySnapshot.empty) {
        const uid = querySnapshot.docs[0].id;
        console.log('[resolveFirebaseUid] ✓ Found user in Firestore with UID:', uid);
        return uid;
      } else {
        console.warn('[resolveFirebaseUid] No user found in Firestore with email:', email);
      }
    } catch (e: any) {
      console.error('[resolveFirebaseUid] Error looking up user by email in Firestore:', {
        error: String(e),
        message: e?.message,
        code: e?.code,
      });
    }
  } else {
    console.warn('[resolveFirebaseUid] No email found in event data');
  }

  console.warn('[resolveFirebaseUid] ✗ Could not resolve Firebase UID');
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Health check: Ensure Firebase Admin is properly initialized
    console.log('[STRIPE WEBHOOK] Starting health check...');
    const app = getAdminApp();
    if (!app) {
      console.error('[STRIPE WEBHOOK] ❌ CRITICAL: Firebase Admin app not initialized');
      return NextResponse.json({ error: 'Firebase not available' }, { status: 500 });
    }
    console.log('[STRIPE WEBHOOK] ✓ Firebase Admin app initialized');
    
    // Verify Firestore is accessible
    const adminDb = admin.firestore(app);
    if (!adminDb) {
      console.error('[STRIPE WEBHOOK] ❌ CRITICAL: Firestore instance not available');
      return NextResponse.json({ error: 'Firestore not available' }, { status: 500 });
    }
    console.log('[STRIPE WEBHOOK] ✓ Firestore instance available');
    
    const body = await req.text();
    const signature = req.headers.get('Stripe-Signature')!;

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const eventData = event.data.object as any;
    const firebaseUid = await resolveFirebaseUid(eventData);

    console.log(`\n[STRIPE WEBHOOK] Processing event: ${event.type}`);
    console.log(`[STRIPE WEBHOOK] Firebase UID resolved: ${firebaseUid || 'NOT FOUND'}`);
    console.log(`[STRIPE WEBHOOK] Event ID: ${event.id}`);

    switch (event.type) {
      // Handle checkout completion — this is the most reliable event for linking user + subscription
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[checkout.session.completed] Session ID: ${session.id}, Customer: ${session.customer}`);
        
        if (firebaseUid && session.subscription) {
          let subscription: Stripe.Subscription | null = null;
          try {
            // Retrieve the full subscription to get status and plan details
            subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            const priceId = subscription.items.data[0]?.price.id || '';
            const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ? 'monthly'
              : priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ? 'yearly'
              : priceId;
            const currentPeriodEnd = (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000)
              : new Date();

            const app = getAdminApp();
            console.log(`[checkout.session.completed] Got Admin app:`, {
              appName: app?.name,
              initialized: !!app,
            });
            
            const adminDb = admin.firestore(app);
            console.log(`[checkout.session.completed] Got Firestore instance:`, {
              hasDb: !!adminDb,
              type: typeof adminDb,
            });
            
            const userData = {
              stripeCustomerId: session.customer,
              subscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              currentPeriodEnd,
              plan,
              updatedAt: new Date(),
            };
            
            console.log(`[checkout.session.completed] About to write to Firestore for user ${firebaseUid}:`, userData);
            
            const docRef = adminDb.collection('users').doc(firebaseUid);
            console.log(`[checkout.session.completed] Document reference path:`, docRef.path);
            
            await docRef.set(userData, { merge: true });
            console.log(`✓ [checkout.session.completed] SUCCESS — subscription linked for user ${firebaseUid}`);
          } catch (err: any) {
            console.error(`✗ [checkout.session.completed] FAILED to write to Firestore:`, {
              error: String(err),
              message: err?.message,
              code: err?.code,
              stack: err?.stack,
              firebaseUid,
              sessionCustomer: session.customer,
              subscriptionId: subscription?.id || 'NOT RETRIEVED',
            });
          }
        } else {
          console.warn(`✗ [checkout.session.completed] Could not resolve Firebase user or subscription - UID: ${firebaseUid}, hasSubscription: ${!!session.subscription}`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[${event.type}] Subscription ID: ${subscription.id}, Customer: ${subscription.customer}, Status: ${subscription.status}`);
        
        if (firebaseUid) {
          try {
            const priceId = subscription.items.data[0]?.price.id || '';
            const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ? 'monthly'
              : priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ? 'yearly'
              : priceId;
            const currentPeriodEnd = (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000)
              : new Date();

            const app = getAdminApp();
            const adminDb = admin.firestore(app);
            
            const userData = {
              stripeCustomerId: subscription.customer,
              subscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              currentPeriodEnd,
              plan,
              updatedAt: new Date(),
            };
            
            console.log(`[${event.type}] About to write to Firestore for user ${firebaseUid}:`, userData);
            
            const docRef = adminDb.collection('users').doc(firebaseUid);
            await docRef.set(userData, { merge: true });
            console.log(`✓ [${event.type}] SUCCESS — subscription updated for user ${firebaseUid}`);
          } catch (err: any) {
            console.error(`✗ [${event.type}] FAILED to write to Firestore:`, {
              error: String(err),
              message: err?.message,
              code: err?.code,
              stack: err?.stack,
              firebaseUid,
              subscriptionId: subscription.id,
              customer: subscription.customer,
            });
          }
        } else {
          console.warn(`✗ [${event.type}] Could not find Firebase user for Stripe subscription`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        console.log(`[customer.subscription.deleted] Subscription ID: ${(event.data.object as any).id}`);
        if (firebaseUid) {
          try {
            const app = getAdminApp();
            const adminDb = admin.firestore(app);
            
            console.log(`[customer.subscription.deleted] Canceling subscription for user ${firebaseUid}`);
            
            await adminDb.collection('users').doc(firebaseUid).set({
              subscriptionStatus: 'canceled',
              subscriptionId: null,
              updatedAt: new Date(),
            }, { merge: true });
            console.log(`✓ [customer.subscription.deleted] SUCCESS — subscription canceled for user ${firebaseUid}`);
          } catch (err: any) {
            console.error(`✗ [customer.subscription.deleted] FAILED:`, {
              error: String(err),
              message: err?.message,
              stack: err?.stack,
              firebaseUid,
            });
          }
        }
        break;
      }

      case 'invoice.payment_succeeded':
        console.log(`[invoice.payment_succeeded] Invoice ID: ${(event.data.object as any).id}`);
        break;

      case 'invoice.payment_failed':
        console.log(`[invoice.payment_failed] Invoice ID: ${(event.data.object as any).id}`);
        if (firebaseUid) {
          try {
            const app = getAdminApp();
            const adminDb = admin.firestore(app);
            
            console.log(`[invoice.payment_failed] Marking user ${firebaseUid} as past_due`);
            
            await adminDb.collection('users').doc(firebaseUid).set({
              subscriptionStatus: 'past_due',
              updatedAt: new Date(),
            }, { merge: true });
            console.log(`✓ [invoice.payment_failed] Marked user ${firebaseUid} as past_due`);
          } catch (err: any) {
            console.error(`✗ [invoice.payment_failed] FAILED:`, {
              error: String(err),
              message: err?.message,
              stack: err?.stack,
              firebaseUid,
            });
          }
        }
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('\n[STRIPE WEBHOOK] ✗ CRITICAL ERROR:', {
      error: String(error),
      message: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
