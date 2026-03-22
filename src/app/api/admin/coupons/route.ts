import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

async function requireAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { ok: false as const, status: 500, error: 'Supabase is not configured' };
  }

  const cookieStore = await cookies();
  const auth = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });

  const { data: userData } = await auth.auth.getUser();
  const user = userData?.user;
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403, error: 'Forbidden' };

  return { ok: true as const, userId: user.id };
}

function getAdminDbClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function GET() {
  const authz = await requireAdmin();
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const admin = getAdminDbClient();
  if (!admin) return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });

  const { data, error } = await admin.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ coupons: data || [] });
}

export async function POST(req: Request) {
  const authz = await requireAdmin();
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const admin = getAdminDbClient();
  if (!admin) return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });

  const body = (await req.json()) as any;
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
  const discount_percent = typeof body?.discount_percent === 'number' ? body.discount_percent : Number(body?.discount_percent);
  const expires_at = body?.expires_at ? body.expires_at : null;
  const max_uses = body?.max_uses ? Number(body.max_uses) : null;
  const description = typeof body?.description === 'string' ? body.description : null;

  if (!code || !discount_percent) {
    return NextResponse.json({ error: 'Missing coupon code or discount percent' }, { status: 400 });
  }

  const { error } = await admin.from('coupons').insert({
    code,
    discount_percent,
    expires_at,
    max_uses,
    description,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

