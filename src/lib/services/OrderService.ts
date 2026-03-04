
import { supabase } from '@/lib/supabase/client';
import { LicenseService } from './LicenseService';
import { EmailService } from './EmailService';
import archiver from 'archiver';
import { Readable } from 'stream';

export class OrderService {
  private static instance: OrderService;

  private constructor() {}

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  public async completeOrder(orderId: string, transactionId: string): Promise<boolean> {
    try {
      // 1. Update order status
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({ status: 'completed', transaction_id: transactionId })
        .eq('id', orderId)
        .select('*, buyer:profiles(*)')
        .single();

      if (orderError || !order) {
        console.error('Error updating order:', orderError);
        return false;
      }

      // 2. Fetch order items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*, beat:beats(*, artist:profiles(*))')
        .eq('order_id', orderId);

      if (itemsError || !items) {
        console.error('Error fetching order items:', itemsError);
        return false;
      }

      const licenseService = LicenseService.getInstance();
      const emailService = EmailService.getInstance();
      const attachments = [];

      for (const item of items) {
        // 3. Generate license
        const metadata = {
          order_item_id: item.id,
          beat_id: item.beat_id,
          beat_title: item.beat.title,
          producer_name: item.beat.artist.display_name || 'Producer',
          buyer_name: order.buyer.display_name || 'Customer',
          license_type: item.license_type,
          bpm: item.beat.bpm || 0,
          key: item.beat.key || 'N/A',
          timestamp: new Date().toISOString(),
          transaction_id: transactionId
        };

        const { code, pdfBuffer } = await licenseService.generateLicense(metadata);
        
        attachments.push({
          filename: `${item.beat.title}_License_${code}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });

        // 4. Create ZIP package (Optional: can be done on demand to save storage)
        // For now, let's just send the PDF and audio links in the email.
      }

      // 5. Send "Order Confirmed" email to buyer
      const { data: buyerTemplate } = await supabase
        .from('email_templates')
        .select('*')
        .eq('name', 'Order Confirmed')
        .single();

      if (buyerTemplate) {
        const unsubscribeUrl = emailService.getUnsubscribeUrl(order.buyer_id);
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beatpoppa.com';

        await emailService.sendEmail({
          template_id: buyerTemplate.id,
          recipient: order.buyer.email,
          subject: buyerTemplate.subject,
          body: buyerTemplate.body,
          variables: {
            order_id: orderId.slice(0, 8),
            user_name: order.buyer.display_name || 'Customer',
            download_url: `${siteUrl}/dashboard/buyer/downloads`,
            dashboard_url: `${siteUrl}/dashboard/buyer`,
            site_url: siteUrl,
            current_year: new Date().getFullYear().toString(),
            unsubscribe_url: unsubscribeUrl
          },
          attachments,
          idempotency_key: `order_confirmed_buyer_${orderId}`
        });
      }

      // 6. Send "New Sale Alert" to each producer
      const { data: saleTemplate } = await supabase
        .from('email_templates')
        .select('*')
        .eq('name', 'New Sale Alert')
        .single();

      if (saleTemplate) {
        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beatpoppa.com';
        
        for (const item of items) {
          const producer = item.beat.artist;
          if (producer?.email) {
            await emailService.sendEmail({
              template_id: saleTemplate.id,
              recipient: producer.email,
              subject: saleTemplate.subject,
              body: saleTemplate.body,
              variables: {
                creator_name: producer.display_name || 'Creator',
                beat_title: item.beat.title,
                license_type: item.license_type,
                amount: `$${item.price.toFixed(2)}`, // Assuming price is in USD
                dashboard_url: `${siteUrl}/dashboard/creator`,
                current_year: new Date().getFullYear().toString()
              },
              idempotency_key: `sale_alert_producer_${item.id}`
            });
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Error completing order:', err);
      return false;
    }
  }
}
