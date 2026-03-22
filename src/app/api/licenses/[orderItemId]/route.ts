import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import crypto from 'crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function buildVerificationCode(orderItemId: string) {
  return `BP-${orderItemId.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

function buildSignature(payload: unknown) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(payload));
  return hash.digest('base64');
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

  const stampX = width - 210;
  const stampY = 95;
  page.drawRectangle({
    x: stampX,
    y: stampY,
    width: 170,
    height: 55,
    borderColor: rgb(0.88, 0.07, 0.28),
    borderWidth: 2,
    color: rgb(1, 1, 1),
    rotate: degrees(-12),
  });
  page.drawText('BEATPOPPA VERIFIED', {
    x: stampX + 12,
    y: stampY + 28,
    size: 12,
    font: fontBold,
    color: rgb(0.88, 0.07, 0.28),
    rotate: degrees(-12),
  });
  page.drawText(args.code, {
    x: stampX + 28,
    y: stampY + 14,
    size: 8,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
    rotate: degrees(-12),
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

  let currentY = height - 160;
  const drawRow = (label: string, value: string) => {
    page.drawText(label.toUpperCase(), { x: 50, y: currentY, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(value, { x: 200, y: currentY, size: 11, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    currentY -= 25;
  };

  drawRow('Certificate ID', args.code);
  drawRow('Beat Title', args.beatTitle);
  drawRow('Producer', args.producerName);
  drawRow('License Type', args.licenseType);
  drawRow('BPM / Key', `${args.bpm} / ${args.key}`);
  drawRow('Buyer Name', args.buyerName);
  drawRow('Issue Date', new Date(args.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  drawRow('Transaction ID', args.transactionId);

  currentY -= 10;
  page.drawRectangle({
    x: 50,
    y: currentY - 150,
    width: width - 100,
    height: 150,
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

  const descLines = (args.licenseDescription || '').match(/.{1,88}(\s|$)/g)?.slice(0, 2) || [];
  let lineY = rightsY - 18;
  descLines.forEach((line) => {
    page.drawText(line.trim(), { x: 70, y: lineY, size: 8, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
    lineY -= 12;
  });

  const features = (args.licenseFeatures || []).slice(0, 6);
  if (features.length) {
    page.drawText('Included:', { x: 70, y: lineY - 2, size: 8, font: fontBold, color: rgb(0.35, 0.35, 0.35) });
    lineY -= 14;
    features.forEach((f) => {
      page.drawText(`• ${f}`, { x: 80, y: lineY, size: 8, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
      lineY -= 12;
    });
  }

  currentY -= 190;
  page.drawText('DIGITAL VERIFICATION SIGNATURE', { x: 50, y: currentY, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
  currentY -= 15;
  const signatureChunked = args.signature.match(/.{1,90}/g) || [];
  signatureChunked.forEach((chunk) => {
    page.drawText(chunk, { x: 50, y: currentY, size: 6, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
    currentY -= 10;
  });

  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 60,
    color: rgb(0.05, 0.05, 0.05),
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

  page.drawText('BEATPOPPA', {
    x: width - 150,
    y: 25,
    size: 12,
    font: fontBold,
    color: rgb(0.88, 0.07, 0.28),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ orderItemId: string }> }) {
  const { orderItemId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: item, error: itemError } = await supabase
    .from('order_items')
    .select('id, order_id, beat_id, license_type, price, orders(buyer_id, status, created_at, transaction_id), beats(title, bpm, key, profiles:artist_id(display_name))')
    .eq('id', orderItemId)
    .maybeSingle();

  if (itemError || !item) return NextResponse.json({ error: 'Order item not found' }, { status: 404 });

  const buyerId = (item as any)?.orders?.buyer_id;
  if (buyerId !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: buyerProfile } = await supabase.from('profiles').select('display_name, email').eq('id', buyerId).maybeSingle();

  const beatTitle = (item as any)?.beats?.title || 'Beat';
  const producerName = (item as any)?.beats?.profiles?.display_name || 'Producer';
  const buyerName = buyerProfile?.display_name || buyerProfile?.email || 'Customer';
  const rawLicenseTypeId = (item as any)?.license_type || '';
  const { data: licenseTypeRow } = await supabase
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    const admin = createAdminClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    await admin
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
  }

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
