import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProviderKey = 'stripe' | 'paystack' | 'paypal';

function coerceProviderKey(value: unknown): ProviderKey {
  if (value === 'paystack' || value === 'paypal') return value;
  return 'stripe';
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const fallback = {
    defaultProvider: 'stripe' as const,
    currency: 'USD',
    providers: {
      stripe: { enabled: true, publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '' },
      paystack: { enabled: false, publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '' },
      paypal: { enabled: false, clientId: '', mode: 'sandbox' as const },
    },
  };

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(fallback);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'payment_config')
    .maybeSingle();

  if (error || !data?.value) {
    return NextResponse.json(fallback);
  }

  const raw = data.value as any;

  const providersFromNewShape = raw?.providers;
  const defaultProvider = coerceProviderKey(raw?.provider);
  const currency = typeof raw?.currency === 'string' ? raw.currency : 'USD';

  if (providersFromNewShape && typeof providersFromNewShape === 'object') {
    return NextResponse.json({
      defaultProvider,
      currency,
      providers: {
        stripe: {
          enabled: !!providersFromNewShape?.stripe?.enabled,
          publicKey: providersFromNewShape?.stripe?.public_key || '',
        },
        paystack: {
          enabled: !!providersFromNewShape?.paystack?.enabled,
          publicKey: providersFromNewShape?.paystack?.public_key || '',
        },
        paypal: {
          enabled: !!providersFromNewShape?.paypal?.enabled,
          clientId: providersFromNewShape?.paypal?.client_id || '',
          mode: providersFromNewShape?.paypal?.mode === 'live' ? 'live' : 'sandbox',
        },
      },
    });
  }

  const legacyProvider = coerceProviderKey(raw?.provider);
  const legacyPublicKey = typeof raw?.public_key === 'string' ? raw.public_key : '';

  return NextResponse.json({
    defaultProvider: legacyProvider,
    currency,
    providers: {
      stripe: { enabled: true, publicKey: legacyProvider === 'stripe' ? legacyPublicKey : '' },
      paystack: { enabled: true, publicKey: legacyProvider === 'paystack' ? legacyPublicKey : '' },
      paypal: { enabled: true, clientId: legacyProvider === 'paypal' ? legacyPublicKey : '', mode: raw?.paypal_mode === 'live' ? 'live' : 'sandbox' },
    },
  });
}
