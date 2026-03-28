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
  // 1. Check metadata on the event object directly (checkout session has it)
  if (eventData.metadata?.firebaseUid) {
    return eventData.metadata.firebaseUid;
  }

  // 2. For subscription events, try to get metadata from the customer's latest checkout session
  if (eventData.customer) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        customer: typeof eventData.customer === 'string' ? eventData.customer : eventData.customer.id,
        limit: 1,
      });
      if (sessions.data.length > 0 && sessions.data[0].metadata?.firebaseUid) {
        return sessions.data[0].metadata.firebaseUid;
      }
    } catch (e) {
      console.warn('Could not retrieve checkout sessions for customer:', e);
    }
  }

  // 3. Fall back to email lookup in Firestore using Admin SDK
  const email = eventData.customer_email || eventData.customer_details?.email;
  if (email) {
    try {
      const app = getAdminApp();
      const adminDb = admin.firestore(app);
      const querySnapshot = await adminDb
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
    } catch (e) {
      console.warn('Error looking up user by email in Firestore:', e);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
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

    console.log(`Processing Stripe event: ${event.type} | Firebase UID: ${firebaseUid || 'not found'}`);

    switch (event.type) {
      // Handle checkout completion — this is the most reliable event for linking user + subscription
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (firebaseUid && session.subscription) {
          // Retrieve the full subscription to get status and plan details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = subscription.items.data[0]?.price.id || '';
          const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ? 'monthly'
            : priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ? 'yearly'
            : priceId;
          const currentPeriodEnd = (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000)
            : new Date();

          const app = getAdminApp();
          const adminDb = admin.firestore(app);
          await adminDb.collection('users').doc(firebaseUid).set({
            stripeCustomerId: session.customer,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd,
            plan,
            updatedAt: new Date(),
          }, { merge: true });
          console.log(`✓ Checkout completed — subscription linked for user ${firebaseUid}`);
        } else {
          console.warn('checkout.session.completed: Could not resolve Firebase user or subscription');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        if (firebaseUid) {
          const priceId = subscription.items.data[0]?.price.id || '';
          const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ? 'monthly'
            : priceId === process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ? 'yearly'
            : priceId;
          const currentPeriodEnd = (subscription as any).current_period_end
            ? new Date((subscription as any).current_period_end * 1000)
            : new Date();

          const app = getAdminApp();
          const adminDb = admin.firestore(app);
          await adminDb.collection('users').doc(firebaseUid).set({
            stripeCustomerId: subscription.customer,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd,
            plan,
            updatedAt: new Date(),
          }, { merge: true });
          console.log(`✓ Subscription updated for user ${firebaseUid}`);
        } else {
          console.warn('Could not find Firebase user for Stripe subscription');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        if (firebaseUid) {
          const app = getAdminApp();
          const adminDb = admin.firestore(app);
          await adminDb.collection('users').doc(firebaseUid).set({
            subscriptionStatus: 'canceled',
            subscriptionId: null,
            updatedAt: new Date(),
          }, { merge: true });
          console.log(`✓ Subscription canceled for user ${firebaseUid}`);
        }
        break;
      }

      case 'invoice.payment_succeeded':
        console.log('✓ Payment received');
        break;

      case 'invoice.payment_failed':
        console.log('✗ Payment failed');
        if (firebaseUid) {
          const app = getAdminApp();
          const adminDb = admin.firestore(app);
          await adminDb.collection('users').doc(firebaseUid).set({
            subscriptionStatus: 'past_due',
            updatedAt: new Date(),
          }, { merge: true });
        }
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
