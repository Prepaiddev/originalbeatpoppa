import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';

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
  bpm: number;
  key: string;
  issuedAt: string;
  transactionId: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

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

  currentY -= 20;
  page.drawRectangle({
    x: 50,
    y: currentY - 100,
    width: width - 100,
    height: 100,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 1,
  });

  const statementY = currentY - 25;
  page.drawText('OFFICIAL CLEARANCE STATEMENT', {
    x: 70,
    y: statementY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const statementLines = [
    'This document serves as official proof of purchase and license clearance for the musical work',
    'listed above. The bearer of this certificate is authorized to use the composition and master',
    'recording according to the terms of the selected license.',
  ];

  let lineY = statementY - 20;
  statementLines.forEach((line) => {
    page.drawText(line, { x: 70, y: lineY, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    lineY -= 15;
  });

  currentY -= 150;
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

  page.drawText(`https://beatpoppadjs.vercel.app/verify/${args.code}`, {
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
  const licenseType = (item as any)?.license_type || 'License';
  const bpm = Number((item as any)?.beats?.bpm || 0);
  const musicalKey = String((item as any)?.beats?.key || 'N/A');
  const issuedAt = (item as any)?.orders?.created_at || new Date().toISOString();
  const transactionId = (item as any)?.orders?.transaction_id || (item as any)?.order_id || 'N/A';

  const code = buildVerificationCode(orderItemId);
  const signature = buildSignature({
    order_item_id: orderItemId,
    beat_title: beatTitle,
    producer_name: producerName,
    buyer_name: buyerName,
    license_type: licenseType,
    bpm,
    key: musicalKey,
    issued_at: issuedAt,
    transaction_id: transactionId,
    code,
  });

  const pdfBuffer = await buildLicensePdf({
    code,
    signature,
    beatTitle,
    producerName,
    buyerName,
    licenseType,
    bpm,
    key: musicalKey,
    issuedAt,
    transactionId,
  });

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${beatTitle.replaceAll('"', '')}_License_${code}.pdf"`,
    },
  });
}

