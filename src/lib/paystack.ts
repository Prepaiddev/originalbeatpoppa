import axios from 'axios';

function resolvePaystackSecretKey(secretKey?: string) {
  const resolved = secretKey || process.env.PAYSTACK_SECRET_KEY;
  if (!resolved) throw new Error('Paystack secret key is not configured');
  return resolved;
}

function resolveCallbackBaseUrl(callbackBaseUrl?: string) {
  const resolved = callbackBaseUrl || process.env.NEXT_PUBLIC_APP_URL;
  if (!resolved) throw new Error('App URL is not configured for Paystack callback');
  return resolved.replace(/\/+$/, '');
}

export const paystack = {
  async initializeTransaction(
    amount: number,
    email: string,
    orderId: string,
    currency: string = 'NGN',
    opts?: { secretKey?: string; callbackBaseUrl?: string }
  ) {
    const secretKey = resolvePaystackSecretKey(opts?.secretKey);
    const callbackBaseUrl = resolveCallbackBaseUrl(opts?.callbackBaseUrl);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount: Math.round(amount * 100), // convert to kobo
        email,
        currency,
        reference: orderId,
        callback_url: `${callbackBaseUrl}/checkout/verify?provider=paystack`,
        metadata: {
          orderId,
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: orderId
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  async verifyTransaction(reference: string, opts?: { secretKey?: string }) {
    const secretKey = resolvePaystackSecretKey(opts?.secretKey);
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });
    return response.data;
  }
};
