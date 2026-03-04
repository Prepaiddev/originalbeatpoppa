import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';
import { supabase } from '@/lib/supabase/client';
import { OrderService } from '@/lib/services/OrderService';

export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json();

    const data = await paystack.verifyTransaction(reference);

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
