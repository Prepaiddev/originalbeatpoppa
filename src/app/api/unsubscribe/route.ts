
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('uid');
  const token = searchParams.get('token');

  if (!userId || !token) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Simple verification (in production, use a more secure token method)
  const expectedToken = crypto.createHash('sha256').update(userId + (process.env.APP_SECRET || 'beatpoppa')).digest('hex');
  
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ marketing_emails: false })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/success`);
}
