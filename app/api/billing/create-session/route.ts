import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/services/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(authHeader);
    const userId = decodedToken.uid;

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    // Create or fetch Stripe customer
    let customerId: string;

    const customers = await stripe.customers.list({
      email: decodedToken.email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: decodedToken.email,
        metadata: { firebaseUid: userId },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/subscription-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing`,
      subscription_data: {
        metadata: { firebaseUid: userId },
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
