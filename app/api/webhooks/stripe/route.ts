import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/firebase';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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
    let firebaseUid = eventData.metadata?.firebaseUid;

    console.log(`Processing Stripe event: ${event.type}`);

    // If no firebaseUid in metadata, try to find user by customer email
    if (!firebaseUid && eventData.customer_email) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', eventData.customer_email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        firebaseUid = querySnapshot.docs[0].id;
        console.log(`Found Firebase user by email: ${firebaseUid}`);
      }
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        if (firebaseUid) {
          const priceId = subscription.items.data[0]?.price.id || 'unknown';
          const plan = priceId.includes('monthly') ? 'monthly' : priceId.includes('yearly') ? 'yearly' : priceId;
          const currentPeriodEnd = (subscription as any).current_period_end 
            ? new Date((subscription as any).current_period_end * 1000)
            : new Date();
          
          await updateDoc(doc(db, 'users', firebaseUid), {
            stripeCustomerId: subscription.customer,
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: currentPeriodEnd,
            plan: plan,
            updatedAt: new Date(),
          });
          console.log(`✓ Subscription updated for user ${firebaseUid}`);
        } else {
          console.warn('Could not find Firebase user for Stripe subscription');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        if (firebaseUid) {
          await updateDoc(doc(db, 'users', firebaseUid), {
            subscriptionStatus: 'canceled',
            subscriptionId: null,
            updatedAt: new Date(),
          });
          console.log(`✓ Subscription canceled for user ${firebaseUid}`);
        }
        break;
      }

      case 'invoice.payment_succeeded':
        console.log('✓ Payment received');
        break;

      case 'invoice.payment_failed':
        console.log('✗ Payment failed');
        const failedInvoice = event.data.object as Stripe.Invoice;
        if (firebaseUid) {
          await updateDoc(doc(db, 'users', firebaseUid), {
            subscriptionStatus: 'past_due',
            updatedAt: new Date(),
          });
        }
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
