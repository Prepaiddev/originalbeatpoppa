import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

async function getStripeSecretKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return process.env.STRIPE_SECRET_KEY;

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data } = await admin.from('platform_settings').select('value').eq('key', 'payment_config').maybeSingle();

  const value = data?.value as any;
  const providers = value?.providers;
  const fromNewShape = providers?.stripe?.secret_key;

  if (typeof fromNewShape === 'string' && fromNewShape) return fromNewShape;

  if (value?.provider === 'stripe' && typeof value?.secret_key === 'string' && value.secret_key) return value.secret_key;

  return process.env.STRIPE_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, orderId, metadata } = await req.json();

    const secretKey = await getStripeSecretKey();
    const stripe = getStripe(secretKey);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        orderId,
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    console.error('Stripe PaymentIntent error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
