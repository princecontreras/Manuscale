import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/services/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(authHeader);

    // Retrieve Stripe customer ID
    const customers = await stripe.customers.list({
      email: decodedToken.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'No customer found' }, { status: 404 });
    }

    const customerId = customers.data[0].id;

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Billing portal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
