import { NextRequest, NextResponse } from 'next/server';
import { paypal } from '@/lib/paypal';

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, orderId } = await req.json();

    const order = await paypal.createOrder(amount, currency, orderId);

    return NextResponse.json({
      id: order.id,
      links: order.links,
    });
  } catch (err: any) {
    console.error('PayPal create order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
