import { NextRequest, NextResponse } from 'next/server';
import { paypal } from '@/lib/paypal';
import { createClient } from '@supabase/supabase-js';

async function getPayPalConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const fallback = {
    clientId: process.env.PAYPAL_CLIENT_ID,
    secretKey: process.env.PAYPAL_SECRET_KEY,
    mode: (process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live',
  };

  if (!supabaseUrl || !serviceRoleKey) return fallback;

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data } = await admin.from('platform_settings').select('value').eq('key', 'payment_config').maybeSingle();

  const value = data?.value as any;
  const providers = value?.providers;
  const fromNewShape = providers?.paypal;

  if (fromNewShape && typeof fromNewShape === 'object') {
    return {
      clientId: fromNewShape?.client_id || fallback.clientId,
      secretKey: fromNewShape?.secret_key || fallback.secretKey,
      mode: fromNewShape?.mode === 'live' ? 'live' : 'sandbox',
    } as const;
  }

  if (value?.provider === 'paypal') {
    return {
      clientId: value?.public_key || fallback.clientId,
      secretKey: value?.secret_key || fallback.secretKey,
      mode: value?.paypal_mode === 'live' ? 'live' : 'sandbox',
    } as const;
  }

  return fallback;
}

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, orderId } = await req.json();

    const cfg = await getPayPalConfig();
    const order = await paypal.createOrder(amount, currency, orderId, cfg);

    return NextResponse.json({
      id: order.id,
      links: order.links,
    });
  } catch (err: any) {
    console.error('PayPal create order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
