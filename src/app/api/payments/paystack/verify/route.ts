import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';
import { OrderService } from '@/lib/services/OrderService';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

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
        const admin = createAdminClient();
        if (admin) {
          await admin
            .from('orders')
            .update({ status: 'completed', transaction_id: reference })
            .eq('id', orderId);

          const { data: items } = await admin
            .from('order_items')
            .select('beat_id, bundle_id, beats(title, artist_id), bundles(title, creator_id)')
            .eq('order_id', orderId);

          const sellerIds = new Set<string>();
          (items || []).forEach((i: any) => {
            if (i?.beats?.artist_id) sellerIds.add(i.beats.artist_id);
            if (i?.bundles?.creator_id) sellerIds.add(i.bundles.creator_id);
          });

          for (const sellerId of sellerIds) {
            await admin.from('notifications').insert({
              user_id: sellerId,
              type: 'sale',
              title: 'New Sale',
              message: 'You received a new purchase on BeatPoppa.',
              link: '/dashboard/creator/earnings',
              is_read: false,
            });
          }

          await admin.from('admin_notifications').insert({
            type: 'sale',
            title: 'New Purchase',
            message: 'A new order was completed.',
            link: '/admin/analytics',
            is_read: false,
          });
        } else {
          const orderService = OrderService.getInstance();
          await orderService.completeOrder(orderId, reference);
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
