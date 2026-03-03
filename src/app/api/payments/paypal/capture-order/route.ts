import { NextRequest, NextResponse } from 'next/server';
import { paypal } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const { orderID } = await req.json();

    const capture = await paypal.captureOrder(orderID);

    if (capture.status === 'COMPLETED') {
      return NextResponse.json({
        status: 'success',
        captureID: capture.id,
      });
    }

    return NextResponse.json({ status: 'failed', capture }, { status: 400 });
  } catch (err: any) {
    console.error('PayPal capture error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
