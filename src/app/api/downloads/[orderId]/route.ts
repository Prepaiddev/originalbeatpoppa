
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const auth = await createClient();
    const admin = createAdminClient();
    
    // 1. Verify user authentication
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!admin) {
      return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('status, buyer_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'Order not found' }, { status: 404 });
    }

    let isAdmin = false;
    if (order.buyer_id !== user.id) {
      const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      isAdmin = profile?.role === 'admin';
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (order.status !== 'completed') {
      return NextResponse.json({ error: 'Order not completed' }, { status: 400 });
    }

    const { data: items, error: itemsError } = await admin
      .from('order_items')
      .select('id, beat_id, beats(title, master_url, audio_url)')
      .eq('order_id', orderId);

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

        const bucket = beat.master_url ? 'masters' : 'beats';
        const rawPath = beat.master_url || beat.audio_url;
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
        
        const { data } = await admin.storage.from(bucket).createSignedUrl(path, 172800); 

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
