import axios from 'axios';

type PayPalMode = 'sandbox' | 'live';

function resolvePayPalMode(mode?: string): PayPalMode {
  return mode === 'live' ? 'live' : 'sandbox';
}

function resolveBaseUrl(mode: PayPalMode) {
  return mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

async function getAccessToken(opts?: { clientId?: string; secretKey?: string; mode?: PayPalMode }) {
  const clientId = opts?.clientId || process.env.PAYPAL_CLIENT_ID;
  const secretKey = opts?.secretKey || process.env.PAYPAL_SECRET_KEY;
  const mode = opts?.mode || resolvePayPalMode(process.env.PAYPAL_MODE);

  if (!clientId || !secretKey) throw new Error('PayPal credentials are not configured');

  const baseUrl = resolveBaseUrl(mode);
  const auth = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
  const response = await axios.post(
    `${baseUrl}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data.access_token;
}

export const paypal = {
  async createOrder(amount: number, currency: string, orderId: string, opts?: { clientId?: string; secretKey?: string; mode?: PayPalMode }) {
    const mode = opts?.mode || resolvePayPalMode(process.env.PAYPAL_MODE);
    const baseUrl = resolveBaseUrl(mode);
    const accessToken = await getAccessToken(opts);
    const response = await axios.post(
      `${baseUrl}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            reference_id: orderId,
            metadata: {
              order_id: orderId,
            }
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  async captureOrder(paypalOrderId: string, opts?: { clientId?: string; secretKey?: string; mode?: PayPalMode }) {
    const mode = opts?.mode || resolvePayPalMode(process.env.PAYPAL_MODE);
    const baseUrl = resolveBaseUrl(mode);
    const accessToken = await getAccessToken(opts);
    const response = await axios.post(
      `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }
};
