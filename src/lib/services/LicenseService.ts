
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase/client';

interface LicenseMetadata {
  order_item_id: string;
  beat_id: string;
  beat_title: string;
  producer_name: string;
  buyer_name: string;
  license_type: string;
  bpm: number;
  key: string;
  timestamp: string;
  transaction_id: string;
}

export class LicenseService {
  private static instance: LicenseService;
  private privateKey: string;
  private publicKey: string;

  private constructor() {
    // Generate Rsa key pair for signing (in a real app, load from env)
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  public static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService();
    }
    return LicenseService.instance;
  }

  public async generateLicense(metadata: LicenseMetadata): Promise<{ code: string; signature: string; pdfBuffer: Buffer }> {
    const verificationCode = `BP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const signature = this.signMetadata(metadata, verificationCode);

    const pdfBuffer = await this.createPDF(metadata, verificationCode, signature);

    // Save to database
    const { error } = await supabase.from('licenses').insert({
      order_item_id: metadata.order_item_id,
      beat_id: metadata.beat_id,
      license_type: metadata.license_type,
      verification_code: verificationCode,
      cryptographic_signature: signature,
      metadata: { ...metadata, public_key: this.publicKey }
    });

    if (error) {
      console.error('Error saving license to database:', error);
      throw error;
    }

    return { code: verificationCode, signature, pdfBuffer };
  }

  private signMetadata(metadata: LicenseMetadata, code: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(metadata) + code);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  public verifySignature(metadata: LicenseMetadata, code: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(metadata) + code);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  }

  private async createPDF(metadata: LicenseMetadata, code: string, signature: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Header
    page.drawText('LICENSE & CLEARANCE CERTIFICATE', {
      x: 50,
      y: height - 80,
      size: 24,
      font: fontBold,
      color: rgb(0.88, 0.07, 0.28), // primary color #e11d48
    });

    page.drawText('Official BeatPoppa Marketplace Clearance', {
      x: 50,
      y: height - 105,
      size: 12,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Decorative Line
    page.drawLine({
      start: { x: 50, y: height - 120 },
      end: { x: width - 50, y: height - 120 },
      thickness: 2,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Content
    let currentY = height - 160;
    const drawRow = (label: string, value: string) => {
      page.drawText(label.toUpperCase(), { x: 50, y: currentY, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
      page.drawText(value, { x: 200, y: currentY, size: 11, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      currentY -= 25;
    };

    drawRow('Certificate ID', code);
    drawRow('Beat Title', metadata.beat_title);
    drawRow('Producer', metadata.producer_name);
    drawRow('License Type', metadata.license_type);
    drawRow('BPM / Key', `${metadata.bpm} / ${metadata.key}`);
    drawRow('Buyer Name', metadata.buyer_name);
    drawRow('Issue Date', new Date(metadata.timestamp).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
    drawRow('Transaction ID', metadata.transaction_id);

    // Clearance Statement
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
      'recording according to the terms of the selected license. This clearance is valid for submission',
      'to streaming platforms (Spotify, Apple Music, etc.) and Content ID systems.'
    ];

    let lineY = statementY - 20;
    statementLines.forEach(line => {
      page.drawText(line, { x: 70, y: lineY, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
      lineY -= 15;
    });

    // Signature
    currentY -= 150;
    page.drawText('DIGITAL VERIFICATION SIGNATURE', { x: 50, y: currentY, size: 9, font: fontBold, color: rgb(0.5, 0.5, 0.5) });
    currentY -= 15;
    const signatureChunked = signature.match(/.{1,90}/g) || [];
    signatureChunked.forEach(chunk => {
      page.drawText(chunk, { x: 50, y: currentY, size: 6, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
      currentY -= 10;
    });

    // Footer with QR-like code area or branding
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

    page.drawText(`https://beatpoppa.com/verify/${code}`, {
      x: 50,
      y: 20,
      size: 10,
      font: fontRegular,
      color: rgb(1, 1, 1),
    });

    page.drawText('BEATPOPPA © 2024', {
      x: width - 150,
      y: 25,
      size: 10,
      font: fontBold,
      color: rgb(0.88, 0.07, 0.28),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
