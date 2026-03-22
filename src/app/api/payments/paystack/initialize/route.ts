import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';
import { createClient } from '@supabase/supabase-js';

async function getPaystackSecretKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return process.env.PAYSTACK_SECRET_KEY;

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data } = await admin.from('platform_settings').select('value').eq('key', 'payment_config').maybeSingle();

  const value = data?.value as any;
  const providers = value?.providers;
  const fromNewShape = providers?.paystack?.secret_key;

  if (typeof fromNewShape === 'string' && fromNewShape) return fromNewShape;

  if (value?.provider === 'paystack' && typeof value?.secret_key === 'string' && value.secret_key) return value.secret_key;

  return process.env.PAYSTACK_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  try {
    const { amount, email, orderId, currency } = await req.json();

    const secretKey = await getPaystackSecretKey();
    const callbackBaseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const data = await paystack.initializeTransaction(amount, email, orderId, currency, { secretKey, callbackBaseUrl });

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference
    });
  } catch (err: any) {
    console.error('Paystack initialization error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
