import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';
import { supabase } from '@/lib/supabase/client'; // Replace with server side in actual prod

export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json();

    const data = await paystack.verifyTransaction(reference);

    if (data.status && data.data.status === 'success') {
      const orderId = data.data.metadata.orderId;

      // Update order status in Supabase (we'd use service role here for production)
      // This is for demonstration. Use webhook as the source of truth for security
      /* 
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed', transaction_id: reference })
        .eq('id', orderId);
      */

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
