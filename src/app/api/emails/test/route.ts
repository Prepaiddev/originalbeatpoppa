
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { EmailService } from '@/lib/services/EmailService';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 2. Get test parameters
    const { recipient, templateId, variables } = await req.json();

    // 3. Get template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // 4. Send test email
    const emailService = EmailService.getInstance();
    const success = await emailService.sendEmail({
      template_id: templateId,
      recipient,
      subject: `[TEST] ${template.subject}`,
      body: template.body,
      variables,
      idempotency_key: `test_${templateId}_${Date.now()}`
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to send email. Check logs for details.' }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Test email error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
