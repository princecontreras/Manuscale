import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/services/firebaseAdmin';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan } = body;

    // Verify authentication via Firebase ID token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix
    let decodedToken;
    try {
      const app = getAdminApp();
      decodedToken = await admin.auth(app).verifyIdToken(token);
    } catch (error: any) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const firebaseUid = decodedToken.uid;
    const userEmail = decodedToken.email || '';

    // Check for existing active subscription to prevent duplicates
    const userDocRef = doc(db, 'users', firebaseUid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.subscriptionStatus === 'active') {
        return NextResponse.json(
          { error: 'You already have an active subscription. Manage it from your profile.' },
          { status: 409 }
        );
      }
    }

    // Validate plan
    if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Get price IDs from environment
    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
      console.error('Missing Stripe price IDs in environment variables');
      return NextResponse.json(
        { error: 'Checkout configuration error. Please try again later.' },
        { status: 500 }
      );
    }

    const priceId = plan === 'monthly' ? monthlyPriceId : yearlyPriceId;

    // Check if customer already exists in Stripe to reuse customer record
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
    const customerId = existingCustomers.data.length > 0 ? existingCustomers.data[0].id : undefined;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      ...(customerId ? { customer: customerId } : { customer_email: userEmail }),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${domain}/subscription-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/pricing`,
      metadata: {
        firebaseUid,
        plan,
      },
    });

    // Return session URL
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
