import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, verifyIdToken } from '@/services/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';
import { validateSubscriptionDates, logValidationWarnings } from '@/utils/subscriptionValidation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(authHeader);
    const { targetPlan } = await req.json();

    if (!targetPlan || (targetPlan !== 'monthly' && targetPlan !== 'yearly')) {
      return NextResponse.json({ error: 'Invalid plan. Must be "monthly" or "yearly"' }, { status: 400 });
    }

    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID;
    if (!monthlyPriceId || !yearlyPriceId) {
      return NextResponse.json({ error: 'Stripe price IDs not configured' }, { status: 500 });
    }

    const targetPriceId = targetPlan === 'monthly' ? monthlyPriceId : yearlyPriceId;

    // Look up user's subscription ID from Firestore
    const app = getAdminApp();
    const databaseId = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DB_ID || '(default)';
    const adminDb = getFirestore(app, databaseId);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (!userData?.subscriptionId || userData.subscriptionStatus !== 'active') {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Check if already on the target plan
    if (userData.plan === targetPlan) {
      return NextResponse.json({ error: `You are already on the ${targetPlan} plan` }, { status: 400 });
    }

    // Retrieve the current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(userData.subscriptionId);
    const currentItem = subscription.items.data[0];

    if (!currentItem) {
      return NextResponse.json({ error: 'Could not find subscription item' }, { status: 500 });
    }

    // Update the subscription to the new price
    // proration_behavior: 'create_prorations' gives credit for unused time
    const updatedSubscription = await stripe.subscriptions.update(userData.subscriptionId, {
      items: [{
        id: currentItem.id,
        price: targetPriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    // Determine the new plan label from the updated subscription
    const newPriceId = updatedSubscription.items.data[0]?.price.id || '';
    const newPlan = newPriceId === monthlyPriceId ? 'monthly'
      : newPriceId === yearlyPriceId ? 'yearly'
      : newPriceId;
    const newPeriodStart = (updatedSubscription as any).current_period_start
      ? new Date((updatedSubscription as any).current_period_start * 1000)
      : new Date();
    const newPeriodEnd = (updatedSubscription as any).current_period_end
      ? new Date((updatedSubscription as any).current_period_end * 1000)
      : new Date();

    // Validate subscription dates before writing to Firestore
    const validation = validateSubscriptionDates(newPeriodStart, newPeriodEnd);
    logValidationWarnings('switch-plan', decodedToken.uid, userData.subscriptionId, validation);

    // Update Firestore immediately (webhook will also fire, but this gives instant feedback)
    await adminDb.collection('users').doc(decodedToken.uid).set({
      plan: newPlan,
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      plan: newPlan,
      currentPeriodStart: newPeriodStart.toISOString(),
      currentPeriodEnd: newPeriodEnd.toISOString(),
    });
  } catch (error: any) {
    console.error('Switch plan error:', error);
    return NextResponse.json({ error: error.message || 'Failed to switch plan' }, { status: 500 });
  }
}
