
import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/EmailService';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { beatId, bundleId, rating, comment, reviewerName } = await req.json();

    const emailService = EmailService.getInstance();
    
    // Fetch template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('name', 'Review Received')
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Fetch creator info to get their email
    let creatorEmail = '';
    let creatorId = '';
    let title = '';

    if (beatId) {
      const { data: beat } = await supabase
        .from('beats')
        .select('title, artist_id, artist:profiles(email)')
        .eq('id', beatId)
        .single();
      if (beat) {
        creatorEmail = (beat.artist as any).email;
        creatorId = beat.artist_id;
        title = beat.title;
      }
    } else if (bundleId) {
      const { data: bundle } = await supabase
        .from('bundles')
        .select('title, creator_id, creator:profiles(email)')
        .eq('id', bundleId)
        .single();
      if (bundle) {
        creatorEmail = (bundle.creator as any).email;
        creatorId = bundle.creator_id;
        title = bundle.title;
      }
    }

    if (creatorEmail && creatorId) {
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beatpoppa.com';
      const ratingStars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const unsubscribeUrl = emailService.getUnsubscribeUrl(creatorId);

      await emailService.sendEmail({
        template_id: template.id,
        recipient: creatorEmail,
        subject: template.subject,
        body: template.body,
        variables: {
          beat_title: title,
          rating_stars: ratingStars,
          comment,
          dashboard_url: `${siteUrl}/dashboard/creator`,
          site_url: siteUrl,
          unsubscribe_url: unsubscribeUrl
        },
        idempotency_key: `review_${beatId || bundleId}_${Date.now()}`
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error sending review email:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
