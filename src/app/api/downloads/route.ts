
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 1. Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch completed orders for the user
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, created_at, status, total_amount, payment_provider, transaction_id')
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });

  } catch (err: any) {
    console.error('Download link generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
