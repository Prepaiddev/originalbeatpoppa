import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

async function buildInvoicePdf(args: {
  orderId: string;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{ title: string; licenseType: string; price: number }>;
  currency: string;
  total: number;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 780]);
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const stampX = width - 190;
  const stampY = 75;
  page.drawRectangle({
    x: stampX,
    y: stampY,
    width: 140,
    height: 55,
    borderColor: rgb(0.88, 0.07, 0.28),
    borderWidth: 2,
    color: rgb(1, 1, 1),
    rotate: degrees(-12),
  });
  page.drawText('PAID', {
    x: stampX + 48,
    y: stampY + 26,
    size: 18,
    font: fontBold,
    color: rgb(0.88, 0.07, 0.28),
    rotate: degrees(-12),
  });
  page.drawText(args.orderId.slice(0, 8).toUpperCase(), {
    x: stampX + 32,
    y: stampY + 12,
    size: 8,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
    rotate: degrees(-12),
  });

  page.drawText('BEATPOPPA RECEIPT', {
    x: 50,
    y: height - 70,
    size: 22,
    font: fontBold,
    color: rgb(0.88, 0.07, 0.28),
  });

  page.drawText(`Invoice: ${args.orderId.slice(0, 8).toUpperCase()}`, {
    x: 50,
    y: height - 100,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  page.drawText(`Date: ${new Date(args.createdAt).toLocaleString()}`, {
    x: 50,
    y: height - 115,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  page.drawLine({
    start: { x: 50, y: height - 130 },
    end: { x: width - 50, y: height - 130 },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText('Billed To', { x: 50, y: height - 165, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(args.buyerName, { x: 50, y: height - 182, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(args.buyerEmail, { x: 50, y: height - 197, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  let y = height - 235;
  page.drawText('Item', { x: 50, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('License', { x: 330, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
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
    page.drawText(item.licenseType.slice(0, 18), { x: 330, y, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(formatMoney(item.price), { x: 520, y, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
    y -= 18;
    if (y < 120) break;
  }

  y = 110;
  page.drawLine({ start: { x: 50, y: y + 25 }, end: { x: width - 50, y: y + 25 }, thickness: 1, color: rgb(0.92, 0.92, 0.92) });
  page.drawText('Total', { x: 420, y: y + 5, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(formatMoney(args.total), { x: 520, y: y + 5, size: 12, font: fontBold, color: rgb(0.88, 0.07, 0.28) });

  page.drawText('Thank you for your purchase.', {
    x: 50,
    y: 40,
    size: 10,
    font: fontRegular,
    color: rgb(0.35, 0.35, 0.35),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, buyer_id, created_at, status, total_amount')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (order.buyer_id !== user.id) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: buyerProfile } = await supabase.from('profiles').select('display_name, email').eq('id', order.buyer_id).maybeSingle();
  const buyerName = buyerProfile?.display_name || buyerProfile?.email || 'Customer';
  const buyerEmail = buyerProfile?.email || '';

  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('license_type, price, beats(title)')
    .eq('order_id', orderId);

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  const items = (itemsData || []).map((i: any) => ({
    title: i?.beats?.title || 'Beat',
    licenseType: i?.license_type || 'License',
    price: Number(i?.price || 0),
  }));

  const licenseTypeIds = Array.from(new Set(items.map((i) => i.licenseType).filter((x) => typeof x === 'string' && x.length > 0)));
  const { data: licenseTypes } = await supabase.from('license_types').select('id, name').in('id', licenseTypeIds);
  const licenseTypeMap = new Map<string, string>((licenseTypes || []).map((l: any) => [l.id, l.name]));
  const normalizedItems = items.map((i: any) => ({ ...i, licenseType: licenseTypeMap.get(i.licenseType) || i.licenseType }));

  const total = Number(order.total_amount || items.reduce((sum: number, i: any) => sum + Number(i.price || 0), 0));

  const pdf = await buildInvoicePdf({
    orderId,
    createdAt: order.created_at,
    buyerName,
    buyerEmail,
    items: normalizedItems,
    currency: 'USD',
    total,
  });

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice_${orderId.slice(0, 8).toUpperCase()}.pdf"`,
    },
  });
}
