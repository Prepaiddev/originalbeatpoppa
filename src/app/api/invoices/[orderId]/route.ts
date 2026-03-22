import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function buildInvoicePdf(args: {
  orderId: string;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{ title: string; licenseType: string; price: number }>;
  currency: string;
  total: number;
  paymentProvider: string;
  paymentStatus: string;
  transactionId: string;
  verifyUrl: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 780]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const createdAtDate = new Date(args.createdAt);
  const createdAtLabel = createdAtDate.toLocaleString();
  const hashId = crypto.createHash('sha256').update(`${args.orderId}:${args.transactionId}:${args.total}`).digest('hex').slice(0, 16).toUpperCase();

  page.drawText('BEATPOPPA', {
    x: 50,
    y: height - 52,
    size: 11,
    font: fontBold,
    color: rgb(0.88, 0.07, 0.28),
  });
  page.drawText('RECEIPT', {
    x: 50,
    y: height - 80,
    size: 26,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(`Invoice ${args.orderId.slice(0, 8).toUpperCase()}`, {
    x: 50,
    y: height - 97,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(`Date ${createdAtLabel}`, {
    x: 50,
    y: height - 111,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText(`Hash ID ${hashId}`, {
    x: 50,
    y: height - 125,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  page.drawText('BEATPOPPA AUTHENTIC', {
    x: 170,
    y: height - 390,
    size: 40,
    font: fontBold,
    color: rgb(0.94, 0.94, 0.94),
  });

  const stampR = 48;
  const stampCx = width - 88;
  const stampCy = height - 92;
  page.drawCircle({
    x: stampCx,
    y: stampCy,
    size: stampR,
    borderColor: rgb(0.95, 0.6, 0.7),
    borderWidth: 2,
    color: rgb(1, 1, 1),
  });
  page.drawText('PAID', {
    x: stampCx - 19,
    y: stampCy + 8,
    size: 18,
    font: fontBold,
    color: rgb(0.95, 0.6, 0.7),
  });
  page.drawText(createdAtDate.toLocaleDateString(), {
    x: stampCx - 30,
    y: stampCy - 8,
    size: 7,
    font: fontRegular,
    color: rgb(0.7, 0.7, 0.7),
  });

  page.drawLine({
    start: { x: 50, y: height - 142 },
    end: { x: width - 50, y: height - 142 },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText('Transaction Details', { x: 50, y: height - 168, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`Payment Method: ${args.paymentProvider || 'N/A'}`, { x: 50, y: height - 184, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Payment Status: ${args.paymentStatus || 'N/A'}`, { x: 50, y: height - 198, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Transaction ID: ${args.transactionId || 'N/A'}`, { x: 50, y: height - 212, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Currency: ${args.currency}`, { x: 50, y: height - 226, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  page.drawText('Billed To', { x: 345, y: height - 168, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(args.buyerName, { x: 345, y: height - 184, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(args.buyerEmail, { x: 345, y: height - 198, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  let y = height - 252;
  page.drawText('Item', { x: 50, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('License', { x: 340, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('Price', { x: 520, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });

  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.92, 0.92, 0.92) });
  y -= 18;

  const formatMoney = (amount: number) => {
    const decimals = args.currency === 'USD' ? 2 : 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: args.currency, maximumFractionDigits: decimals }).format(amount);
  };

  for (const item of args.items) {
    page.drawText(item.title.slice(0, 45), { x: 50, y, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(item.licenseType.slice(0, 18), { x: 340, y, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(formatMoney(item.price), { x: 520, y, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    y -= 18;
    if (y < 150) break;
  }

  const totalY = y - 8;
  page.drawLine({ start: { x: 50, y: totalY + 18 }, end: { x: width - 50, y: totalY + 18 }, thickness: 1, color: rgb(0.92, 0.92, 0.92) });
  page.drawText('Total', { x: 420, y: totalY, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(formatMoney(args.total), { x: 520, y: totalY, size: 12, font: fontBold, color: rgb(0.88, 0.07, 0.28) });

  let qrImage: any = null;
  try {
    const QRCode = (await import('qrcode')).default as any;
    const qrDataUrl = await QRCode.toDataURL(args.verifyUrl, { margin: 1, width: 150 });
    const qrBase64 = String(qrDataUrl).split(',')[1] || '';
    const qrBytes = Buffer.from(qrBase64, 'base64');
    qrImage = await pdfDoc.embedPng(qrBytes);
  } catch {}

  page.drawRectangle({ x: 50, y: 42, width: width - 100, height: 40, color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.92, 0.92, 0.92), borderWidth: 1 });
  page.drawText('Verified Purchase', { x: 135, y: 67, size: 9, font: fontBold, color: rgb(0.1, 0.45, 0.2) });
  page.drawText('Secured by BeatPoppa', { x: 270, y: 67, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('This receipt is digitally signed', { x: 425, y: 67, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Thank you for your purchase.', { x: 135, y: 52, size: 9, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });

  if (qrImage) {
    page.drawImage(qrImage, { x: 54, y: 42, width: 26, height: 26 });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ error: 'Invalid order id format' }, { status: 400 });
    }
    const auth = await createClient();
    const admin = createAdminClient();
    const db: any = admin || auth;

    const { data: userData } = await auth.auth.getUser();
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: order, error: orderError } = await db
      .from('orders')
      .select('id, buyer_id, created_at, status, total_amount, payment_provider, transaction_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) return NextResponse.json({ error: orderError?.message || 'Order not found' }, { status: 404 });

    if (order.buyer_id !== user.id) {
      if (admin) {
        const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      } else if (user.user_metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const buyerName = (user.user_metadata?.display_name as string) || user.email || 'Customer';
    const buyerEmail = user.email || '';

    const { data: itemsData, error: itemsError } = await db
      .from('order_items')
      .select('license_type, price, beats(title)')
      .eq('order_id', orderId);

    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

    const items = (itemsData || []).map((i: any) => ({
      title: i?.beats?.title || 'Beat',
      licenseType: i?.license_type || 'License',
      price: Number(i?.price || 0),
    }));

    let normalizedItems = items;
    try {
      const licenseTypeIds = Array.from(new Set(items.map((i) => i.licenseType).filter((x) => typeof x === 'string' && x.length > 0)));
      const licenseTypes = licenseTypeIds.length
        ? (await db.from('license_types').select('id, name').in('id', licenseTypeIds)).data
        : [];
      const licenseTypeMap = new Map<string, string>((licenseTypes || []).map((l: any) => [l.id, l.name]));
      normalizedItems = items.map((i: any) => ({ ...i, licenseType: licenseTypeMap.get(i.licenseType) || i.licenseType }));
    } catch {}

    const total = Number(order.total_amount || items.reduce((sum: number, i: any) => sum + Number(i.price || 0), 0));

    const verifyBase = process.env.NEXT_PUBLIC_APP_URL || 'https://beatpoppadjs.vercel.app';
    const verifyUrl = `${verifyBase.replace(/\/+$/, '')}/dashboard/buyer/orders`;

    const pdf = await buildInvoicePdf({
      orderId,
      createdAt: order.created_at,
      buyerName,
      buyerEmail,
      items: normalizedItems,
      currency: 'USD',
      total,
      paymentProvider: order.payment_provider || 'N/A',
      paymentStatus: order.status === 'completed' ? 'Paid' : order.status,
      transactionId: order.transaction_id || order.id,
      verifyUrl,
    });

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${orderId.slice(0, 8).toUpperCase()}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unable to generate receipt' }, { status: 500 });
  }
}
