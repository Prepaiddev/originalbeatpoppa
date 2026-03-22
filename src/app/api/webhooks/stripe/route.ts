import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { OrderService } from '@/lib/services/OrderService';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

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
        await orderService.completeOrder(orderId, paymentIntent.id);

        const admin = createAdminClient();
        if (admin) {
          await admin
            .from('orders')
            .update({ status: 'completed', transaction_id: paymentIntent.id })
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
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
