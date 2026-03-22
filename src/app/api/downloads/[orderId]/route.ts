
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractStoragePath(input: string, bucket: string) {
  if (!input) return input;
  if (!input.startsWith('http')) return input.replace(/^\/+/, '');
  try {
    const url = new URL(input);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`
    ];
    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) return url.pathname.slice(idx + marker.length);
    }
    return null as any;
  } catch {
    return null as any;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ error: 'Invalid order id format' }, { status: 400 });
    }
    const auth = await createClient();
    const admin = createAdminClient();
    const db: any = admin || auth;
    
    // 1. Verify user authentication
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order, error: orderError } = await db
      .from('orders')
      .select('status, buyer_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'Order not found' }, { status: 404 });
    }

    let isAdmin = false;
    if (order.buyer_id !== user.id) {
      if (admin) {
        const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
        isAdmin = profile?.role === 'admin';
      } else {
        isAdmin = user.user_metadata?.role === 'admin';
      }
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (order.status !== 'completed') {
      return NextResponse.json({ error: 'Order not completed' }, { status: 400 });
    }

    let items: any[] | null = null;
    let itemsError: any = null;

    const withMaster = await db
      .from('order_items')
      .select('id, beat_id, beats(title, master_url, audio_url)')
      .eq('order_id', orderId);

    if (withMaster.error && String(withMaster.error.message || '').toLowerCase().includes('master_url')) {
      const withoutMaster = await db
        .from('order_items')
        .select('id, beat_id, beats(title, audio_url)')
        .eq('order_id', orderId);
      items = withoutMaster.data as any[] | null;
      itemsError = withoutMaster.error;
    } else {
      items = withMaster.data as any[] | null;
      itemsError = withMaster.error;
    }

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
    if (!items?.length) {
      return NextResponse.json({ error: 'No downloadable items found for this order' }, { status: 404 });
    }

    // 4. Generate signed URLs (48 hours = 172800 seconds)
    const downloadLinks = await Promise.all(
      (items || []).map(async (item: any) => {
        const beat = item.beats;
        if (!beat) {
          return {
            order_item_id: item.id,
            beat_id: item.beat_id,
            title: 'Unavailable',
            download_url: null,
            expires_at: new Date(Date.now() + 172800 * 1000).toISOString()
          };
        }

        const rawMaster = (beat as any).master_url;
        const bucket = rawMaster ? 'masters' : 'beats';
        const rawPath = rawMaster || beat.audio_url;
        const path = extractStoragePath(rawPath, bucket);
        if (!path) {
          return {
            order_item_id: item.id,
            beat_id: item.beat_id,
            title: beat.title,
            download_url: null,
            expires_at: new Date(Date.now() + 172800 * 1000).toISOString()
          };
        }
        
        const { data } = await db.storage.from(bucket).createSignedUrl(path, 172800, { download: true }); 

        return {
          order_item_id: item.id,
          beat_id: item.beat_id,
          title: beat.title,
          download_url: data?.signedUrl || null,
          expires_at: new Date(Date.now() + 172800 * 1000).toISOString()
        };
      })
    );

    return NextResponse.json({
      order_id: orderId,
      links: downloadLinks
    });

  } catch (err: any) {
    console.error('Download link generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
