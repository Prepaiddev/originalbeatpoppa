import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase/client'; // Replace with server side in actual prod
import { headers } from 'next/headers';
import { OrderService } from '@/lib/services/OrderService';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        const orderService = OrderService.getInstance();
        const success = await orderService.completeOrder(orderId, paymentIntent.id);
        if (success) {
          console.log(`Order ${orderId} completed successfully via Stripe.`);
        } else {
          console.error(`Failed to complete order ${orderId} via Stripe.`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
