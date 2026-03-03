import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';

export async function POST(req: NextRequest) {
  try {
    const { amount, email, orderId, currency } = await req.json();

    const data = await paystack.initializeTransaction(amount, email, orderId, currency);

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference
    });
  } catch (err: any) {
    console.error('Paystack initialization error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
