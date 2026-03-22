import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';
import { OrderService } from '@/lib/services/OrderService';
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
    const { reference } = await req.json();

    const secretKey = await getPaystackSecretKey();
    const data = await paystack.verifyTransaction(reference, { secretKey });

    if (data.status && data.data.status === 'success') {
      const orderId = data.data.metadata.orderId;

      if (orderId) {
        const orderService = OrderService.getInstance();
        const success = await orderService.completeOrder(orderId, reference);
        if (success) {
          console.log(`Order ${orderId} completed successfully via Paystack.`);
        } else {
          console.error(`Failed to complete order ${orderId} via Paystack.`);
        }
      }

      return NextResponse.json({
        status: 'success',
        orderId,
        message: 'Payment verified successfully',
      });
    }

    return NextResponse.json({ status: 'failed', message: 'Verification failed' }, { status: 400 });
  } catch (err: any) {
    console.error('Paystack verification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
