import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildVerificationCode(orderItemId: string) {
  return `BP-${orderItemId.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

function buildSignature(payload: unknown) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(payload));
  return hash.digest('base64');
}

function wrapText(text: string, maxChars: number) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function normalizeFeatureList(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features.map((f) => String(f)).filter(Boolean);
}

function buildRightsPreview(features: string[]) {
  const f = features.map((x) => x.toLowerCase());
  const yes: string[] = [];
  const no: string[] = [];

  const pushUnique = (arr: string[], value: string) => {
    if (!arr.includes(value)) arr.push(value);
  };

  if (f.some((x) => x.includes('stream') || x.includes('spotify') || x.includes('apple music'))) pushUnique(yes, 'Streaming allowed');
  if (f.some((x) => x.includes('commercial'))) pushUnique(yes, 'Commercial use allowed');
  if (f.some((x) => x.includes('non-exclusive') || x.includes('non exclusive'))) pushUnique(yes, 'Non-exclusive rights');
  if (f.some((x) => x.includes('exclusive'))) pushUnique(yes, 'Exclusive rights');
  if (f.some((x) => x.includes('stems') || x.includes('wav'))) pushUnique(yes, 'Stems/WAV included');
  if (f.some((x) => x.includes('resale') || x.includes('sell') || x.includes('ownership'))) pushUnique(no, 'No resale / ownership transfer');
  if (f.some((x) => x.includes('content id') || x.includes('youtube'))) pushUnique(yes, 'Content ID safe usage');

  if (yes.length === 0) pushUnique(yes, 'Use permitted under stated terms');
  if (no.length === 0) pushUnique(no, 'No transfer of copyright ownership');

  return { yes: yes.slice(0, 4), no: no.slice(0, 4) };
}

async function buildLicensePdf(args: {
  code: string;
  signature: string;
  beatTitle: string;
  producerName: string;
  buyerName: string;
  licenseType: string;
  licenseDescription: string;
  licenseFeatures: string[];
  bpm: number;
  key: string;
  issuedAt: string;
  transactionId: string;
  verifyUrl: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const issuedAtDate = new Date(args.issuedAt);
  const issuedAtLabel = issuedAtDate.toLocaleString();
  const hashId = crypto.createHash('sha256').update(args.signature).digest('hex').slice(0, 16).toUpperCase();

  const stampR = 58;
  const stampCx = width - 90;
  const stampCy = 120;

  page.drawCircle({
    x: stampCx,
    y: stampCy,
    size: stampR,
    borderColor: rgb(0.88, 0.07, 0.28),
    borderWidth: 3,
    color: rgb(1, 1, 1),
  });
  page.drawText('BEATPOPPA', {
    x: stampCx - 42,
    y: stampCy + 18,
    size: 12,
    font: fontBold,
    color: rgb(0.88, 0.07, 0.28),
  });
  page.drawText('VERIFIED', {
    x: stampCx - 32,
    y: stampCy + 2,
    size: 11,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15),
  });
  page.drawText(args.code, {
    x: stampCx - 46,
    y: stampCy - 14,
    size: 8,
    font: fontRegular,
    color: rgb(0.25, 0.25, 0.25),
  });
  page.drawText(issuedAtDate.toLocaleDateString(), {
    x: stampCx - 30,
    y: stampCy - 28,
    size: 7,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  page.drawText('LICENSE & CLEARANCE CERTIFICATE', {
    x: 50,
    y: height - 80,
    size: 24,
    font: fontBold,
    color: rgb(0.88, 0.07, 0.28),
  });

  page.drawText('Official BeatPoppa Marketplace Clearance', {
    x: 50,
    y: height - 105,
    size: 12,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawLine({
    start: { x: 50, y: height - 120 },
    end: { x: width - 50, y: height - 120 },
    thickness: 2,
    color: rgb(0.9, 0.9, 0.9),
  });

  let currentY = height - 155;

  const introLines = wrapText(
    'This document certifies that the buyer has legally obtained a license to use the beat under the terms specified below. This license is protected under digital intellectual property law.',
    92
  );
  introLines.forEach((line) => {
    page.drawText(line, { x: 50, y: currentY, size: 9, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
    currentY -= 14;
  });

  currentY -= 6;
  const drawRow = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: 50, y: currentY, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(value, { x: 200, y: currentY, size: 11, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    currentY -= 25;
  };

  drawRow('Certificate ID', args.code);
  drawRow('Hash ID', hashId);
  drawRow('Beat Title', args.beatTitle);
  drawRow('Producer', args.producerName);
  drawRow('License Type', args.licenseType);
  drawRow('BPM / Key', `${args.bpm} / ${args.key}`);
  drawRow('Buyer Name', args.buyerName);
  drawRow('Issue Date', issuedAtLabel);
  drawRow('Transaction ID', args.transactionId);

  const features = normalizeFeatureList(args.licenseFeatures);
  const preview = buildRightsPreview(features);

  currentY -= 6;
  page.drawRectangle({
    x: 50,
    y: currentY - 210,
    width: width - 100,
    height: 210,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 1,
  });

  const rightsY = currentY - 25;
  page.drawText('LICENSE DETAILS & USAGE RIGHTS', {
    x: 70,
    y: rightsY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const descLines = wrapText(args.licenseDescription || '', 92).slice(0, 3);
  let lineY = rightsY - 18;
  descLines.forEach((line) => {
    page.drawText(line.trim(), { x: 70, y: lineY, size: 8, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
    lineY -= 12;
  });

  const rightsParagraph = wrapText(
    'The buyer is granted non-exclusive rights to use this beat for commercial and non-commercial purposes under the stated limitations.',
    92
  ).slice(0, 2);
  if (rightsParagraph.length) {
    lineY -= 6;
    rightsParagraph.forEach((line) => {
      page.drawText(line, { x: 70, y: lineY, size: 8, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
      lineY -= 12;
    });
  }

  const featureRows = features.slice(0, 6);
  if (featureRows.length) {
    lineY -= 6;
    page.drawText('Auto-filled clauses (summary):', { x: 70, y: lineY, size: 8, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
    lineY -= 12;
    featureRows.forEach((fItem) => {
      page.drawText(`• ${fItem}`.slice(0, 110), { x: 80, y: lineY, size: 8, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
      lineY -= 12;
    });
  }

  lineY -= 4;
  page.drawText('Quick preview:', { x: 70, y: lineY, size: 8, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
  lineY -= 12;
  preview.yes.forEach((t) => {
    page.drawText(`✔ ${t}`, { x: 80, y: lineY, size: 8, font: fontRegular, color: rgb(0.1, 0.45, 0.2) });
    lineY -= 12;
  });
  preview.no.forEach((t) => {
    page.drawText(`✘ ${t}`, { x: 80, y: lineY, size: 8, font: fontRegular, color: rgb(0.65, 0.1, 0.15) });
    lineY -= 12;
  });

  page.drawText('View Full License Agreement:', { x: 70, y: currentY - 198, size: 8, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(`${args.verifyUrl.split('/verify/')[0]}/licensing`, { x: 70, y: currentY - 212, size: 8, font: fontRegular, color: rgb(0.1, 0.4, 0.9) });

  currentY -= 228;
  page.drawText('DIGITAL VERIFICATION SIGNATURE', { x: 50, y: currentY, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
  currentY -= 15;
  const signatureChunked = args.signature.match(/.{1,90}/g) || [];
  signatureChunked.forEach((chunk) => {
    page.drawText(chunk, { x: 50, y: currentY, size: 6, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
    currentY -= 10;
  });

  const QRCode = (await import('qrcode')).default as any;
  const qrDataUrl = await QRCode.toDataURL(args.verifyUrl, { margin: 1, width: 140 });
  const qrBase64 = String(qrDataUrl).split(',')[1] || '';
  const qrBytes = Buffer.from(qrBase64, 'base64');
  const qrImage = await pdfDoc.embedPng(qrBytes);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 60,
    color: rgb(0.05, 0.05, 0.05),
  });

  page.drawText('Verified Purchase ✔  Secured by BeatPoppa  This license is digitally signed', {
    x: 50,
    y: 48,
    size: 8,
    font: fontBold,
    color: rgb(0.7, 0.7, 0.7),
  });

  page.drawText('VERIFY AUTHENTICITY AT:', {
    x: 50,
    y: 35,
    size: 8,
    font: fontBold,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(args.verifyUrl, {
    x: 50,
    y: 20,
    size: 10,
    font: fontRegular,
    color: rgb(1, 1, 1),
  });

  page.drawImage(qrImage, { x: width - 60, y: 6, width: 48, height: 48 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ orderItemId: string }> }) {
  const { orderItemId } = await params;
  if (!UUID_RE.test(orderItemId)) {
    return NextResponse.json({ error: 'Invalid order item id format' }, { status: 400 });
  }
  const auth = await createClient();
  const admin = createAdminClient();
  const db: any = admin || auth;

  const { data: userData } = await auth.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: item, error: itemError } = await db
    .from('order_items')
    .select('id, order_id, beat_id, license_type, price, orders(buyer_id, status, created_at, transaction_id), beats(title, bpm, key, profiles:artist_id(display_name))')
    .eq('id', orderItemId)
    .maybeSingle();

  if (itemError || !item) return NextResponse.json({ error: itemError?.message || 'Order item not found' }, { status: 404 });

  const buyerId = (item as any)?.orders?.buyer_id;
  if (buyerId !== user.id) {
    if (admin) {
      const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data: buyerProfile } = await db.from('profiles').select('display_name, email').eq('id', buyerId).maybeSingle();

  const beatTitle = (item as any)?.beats?.title || 'Beat';
  const producerName = (item as any)?.beats?.profiles?.display_name || 'Producer';
  const buyerName = buyerProfile?.display_name || buyerProfile?.email || 'Customer';
  const rawLicenseTypeId = (item as any)?.license_type || '';
  const { data: licenseTypeRow } = await db
    .from('license_types')
    .select('name, description, features')
    .eq('id', rawLicenseTypeId)
    .maybeSingle();

  const licenseType = licenseTypeRow?.name || rawLicenseTypeId || 'License';
  const licenseDescription = licenseTypeRow?.description || '';
  const licenseFeatures = Array.isArray(licenseTypeRow?.features) ? licenseTypeRow?.features : [];
  const bpm = Number((item as any)?.beats?.bpm || 0);
  const musicalKey = String((item as any)?.beats?.key || 'N/A');
  const issuedAt = (item as any)?.orders?.created_at || new Date().toISOString();
  const transactionId = (item as any)?.orders?.transaction_id || (item as any)?.order_id || 'N/A';

  const code = buildVerificationCode(orderItemId);
  const verifyBase = process.env.NEXT_PUBLIC_APP_URL || 'https://beatpoppadjs.vercel.app';
  const verifyUrl = `${verifyBase.replace(/\/+$/, '')}/verify/${code}`;

  const payload = {
    order_item_id: orderItemId,
    beat_id: (item as any)?.beat_id,
    beat_title: beatTitle,
    producer_name: producerName,
    buyer_name: buyerName,
    license_type: licenseType,
    license_description: licenseDescription,
    license_features: licenseFeatures,
    bpm,
    key: musicalKey,
    issued_at: issuedAt,
    transaction_id: transactionId,
    code,
  };

  const signature = buildSignature(payload);

  try {
    await db
      .from('licenses')
      .upsert(
        {
          order_item_id: orderItemId,
          beat_id: (item as any)?.beat_id,
          license_type: licenseType,
          verification_code: code,
          cryptographic_signature: signature,
          metadata: { ...payload },
        },
        { onConflict: 'verification_code' }
      );
  } catch {}

  const pdfBuffer = await buildLicensePdf({
    code,
    signature,
    beatTitle,
    producerName,
    buyerName,
    licenseType,
    licenseDescription,
    licenseFeatures,
    bpm,
    key: musicalKey,
    issuedAt,
    transactionId,
    verifyUrl,
  });

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${beatTitle.replaceAll('"', '')}_License_${code}.pdf"`,
    },
  });
}
