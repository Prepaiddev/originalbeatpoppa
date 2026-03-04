
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

export type EmailProviderType = 'resend' | 'sendgrid' | 'smtp' | 'supabase';

interface EmailProviderConfig {
  id: string;
  name: string;
  type: EmailProviderType;
  config: any;
  is_primary: boolean;
  is_active: boolean;
}

interface SendEmailOptions {
  template_id?: string;
  recipient: string;
  subject: string;
  body: string;
  variables?: Record<string, any>;
  attachments?: any[];
  idempotency_key?: string;
  max_retries?: number;
}

export class EmailService {
  private static instance: EmailService;
  private providers: EmailProviderConfig[] = [];
  private retryDelayBase = 1000; // 1 second base delay for retries

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async loadProviders() {
    const { data, error } = await supabase
      .from('email_providers')
      .select('*')
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error loading email providers:', error);
      return;
    }

    this.providers = data || [];
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }

  private async checkIdempotency(key?: string): Promise<boolean> {
    if (!key) return false;
    const { data } = await supabase
      .from('email_logs')
      .select('id')
      .eq('idempotency_key', key)
      .eq('status', 'sent')
      .limit(1);
    return data && data.length > 0;
  }

  public getUnsubscribeUrl(userId: string): string {
    const secret = process.env.APP_SECRET || 'beatpoppa';
    const token = crypto.createHash('sha256').update(userId + secret).digest('hex');
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?uid=${userId}&token=${token}`;
  }

  public async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { idempotency_key, max_retries = 3 } = options;

    // 1. Check idempotency
    if (idempotency_key && await this.checkIdempotency(idempotency_key)) {
      console.log(`Email with idempotency key ${idempotency_key} already sent.`);
      return true;
    }

    await this.loadProviders();

    if (this.providers.length === 0) {
      console.error('No active email providers found.');
      return false;
    }

    const { template_id, recipient, subject, body, variables = {} } = options;
    const finalSubject = this.replaceVariables(subject, variables);
    const finalBody = this.replaceVariables(body, variables);

    // 2. Try providers one by one (failover)
    for (const provider of this.providers) {
      let attempts = 0;
      while (attempts < max_retries) {
        try {
          const sent = await this.sendWithProvider(provider, {
            recipient,
            subject: finalSubject,
            body: finalBody,
            attachments: options.attachments
          });

          if (sent) {
            await this.logEmail({
              template_id,
              recipient,
              status: 'sent',
              idempotency_key,
              metadata: { provider_id: provider.id, type: provider.type, attempts: attempts + 1 }
            });
            return true;
          }
        } catch (err) {
          attempts++;
          console.error(`Attempt ${attempts} failed for ${provider.name}:`, err);
          
          if (attempts >= max_retries) {
            await this.logEmail({
              template_id,
              recipient,
              status: 'failed',
              idempotency_key,
              error_message: String(err),
              metadata: { provider_id: provider.id, type: provider.type, attempts }
            });
          } else {
            // Wait with exponential backoff before retry
            await new Promise(resolve => setTimeout(resolve, this.retryDelayBase * Math.pow(2, attempts - 1)));
          }
        }
      }
    }

    return false;
  }

  private async sendWithProvider(provider: EmailProviderConfig, options: any): Promise<boolean> {
    const { recipient, subject, body, attachments } = options;

    switch (provider.type) {
      case 'resend': {
        const resend = new Resend(provider.config.apiKey);
        const { error } = await resend.emails.send({
          from: provider.config.from || 'no-reply@beatpoppa.com',
          to: recipient,
          subject,
          html: body,
          attachments: attachments?.map(a => ({
            filename: a.filename,
            content: a.content,
          }))
        });
        if (error) throw error;
        return true;
      }

      case 'sendgrid': {
        sgMail.setApiKey(provider.config.apiKey);
        await sgMail.send({
          from: provider.config.from || 'no-reply@beatpoppa.com',
          to: recipient,
          subject,
          html: body,
          attachments: attachments?.map(a => ({
            filename: a.filename,
            content: a.content.toString('base64'),
            type: a.contentType,
            disposition: 'attachment',
          }))
        });
        return true;
      }

      case 'smtp': {
        const transporter = nodemailer.createTransport({
          host: provider.config.host,
          port: provider.config.port,
          secure: provider.config.secure,
          auth: {
            user: provider.config.user,
            pass: provider.config.pass,
          },
        });
        await transporter.sendMail({
          from: provider.config.from || 'no-reply@beatpoppa.com',
          to: recipient,
          subject,
          html: body,
          attachments: attachments?.map(a => ({
            filename: a.filename,
            content: a.content,
          }))
        });
        return true;
      }

      case 'supabase': {
        // Supabase built-in auth email service
        // This is usually for auth, but we can potentially use it for transactional if configured.
        // For now, let's treat it as a placeholder or throw error as it's not a general-purpose SMTP.
        throw new Error('Supabase general-purpose email sending not yet implemented.');
      }

      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  private async logEmail(data: any) {
    try {
      await supabase.from('email_logs').insert(data);
    } catch (err) {
      console.error('Error logging email:', err);
    }
  }
}
