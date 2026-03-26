import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/services/firebase';
import { verifyIdToken } from '@/services/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const domain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan } = body;

    // Verify authentication via Firebase ID token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const firebaseUid = decodedToken.uid;
    const userEmail = decodedToken.email || '';

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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${domain}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
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
