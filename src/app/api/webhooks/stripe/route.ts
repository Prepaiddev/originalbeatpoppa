import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { OrderService } from '@/lib/services/OrderService';
import { createClient } from '@supabase/supabase-js';

async function getStripeSecrets() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const fallback = {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  };

  if (!supabaseUrl || !serviceRoleKey) return fallback;

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data } = await admin.from('platform_settings').select('value').eq('key', 'payment_config').maybeSingle();

  const value = data?.value as any;
  const providers = value?.providers;
  const fromNewShape = providers?.stripe;

  if (fromNewShape && typeof fromNewShape === 'object') {
    return {
      secretKey: fromNewShape?.secret_key || fallback.secretKey,
      webhookSecret: fromNewShape?.webhook_secret || fallback.webhookSecret,
    };
  }

  if (value?.provider === 'stripe') {
    return {
      secretKey: value?.secret_key || fallback.secretKey,
      webhookSecret: fallback.webhookSecret,
    };
  }

  return fallback;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  const secrets = await getStripeSecrets();
  if (!signature || !secrets.webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  try {
    const stripe = getStripe(secrets.secretKey);
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      secrets.webhookSecret
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
