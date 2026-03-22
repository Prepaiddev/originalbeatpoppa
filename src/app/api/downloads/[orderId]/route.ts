
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function extractStoragePath(input: string, bucket: string) {
  if (!input) return input;
  if (!input.startsWith('http')) return input.replace(/^\/+/, '');
  try {
    const url = new URL(input);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx >= 0) return url.pathname.slice(idx + marker.length);
    return input;
  } catch {
    return input;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();
    
    // 1. Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify order ownership and status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('status, buyer_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Allow buyer or admin
    if (order.buyer_id !== user.id) {
       // Check if admin
       const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
       if (profile?.role !== 'admin') {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
       }
    }

    if (order.status !== 'completed') {
      return NextResponse.json({ error: 'Order not completed' }, { status: 400 });
    }

    // 3. Fetch order items and beat master URLs
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, beat_id, beats(title, master_url, audio_url)')
      .eq('order_id', orderId);

    if (itemsError || !items) {
      return NextResponse.json({ error: 'Order items not found' }, { status: 404 });
    }

    // 4. Generate signed URLs (48 hours = 172800 seconds)
    const downloadLinks = await Promise.all(items.map(async (item: any) => {
      const beat = item.beats;
      const bucket = beat.master_url ? 'masters' : 'beats';
      const rawPath = beat.master_url || beat.audio_url;
      const path = extractStoragePath(rawPath, bucket);
      
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 172800); 

      return {
        order_item_id: item.id,
        beat_id: item.beat_id,
        title: beat.title,
        download_url: data?.signedUrl || null,
        expires_at: new Date(Date.now() + 172800 * 1000).toISOString()
      };
    }));

    return NextResponse.json({
      order_id: orderId,
      links: downloadLinks
    });

  } catch (err: any) {
    console.error('Download link generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
