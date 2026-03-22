import Stripe from 'stripe';

export function getStripe(secretKey?: string) {
  const key = secretKey || process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
  return new Stripe(key, {
    apiVersion: '2026-02-25.clover' as const,
    typescript: true,
  });
}
