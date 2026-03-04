"use client";

import Header from '@/components/Header';
import { useCartStore } from '@/store/useCartStore';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CreditCard, Smartphone, Globe, CheckCircle, Loader2, Lock } from 'lucide-react';
import NextImage from 'next/image';
import clsx from 'clsx';
import axios from 'axios';

// Stripe Elements Imports
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// PayPal Imports
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function CheckoutPage() {
  const { items, total, subtotal, coupon, clearCart } = useCartStore();
  const { currency, exchangeRates, setCurrency } = useUIStore();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  const [paymentSettings, setPaymentSettings] = useState({
    provider: 'stripe',
    currency: 'USD',
    publicKey: '',
    paypalClientId: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // Auto-switch currency based on payment method
  useEffect(() => {
    if (paymentMethod === 'paystack') {
      setCurrency('NGN');
    } else if (paymentMethod === 'paypal' || paymentMethod === 'card') {
      setCurrency('USD');
    }
  }, [paymentMethod]);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Load Stripe outside component to prevent re-renders
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    async function fetchPaymentSettings() {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'payment_config')
          .single();
        
        if (data?.value) {
          const config = data.value;
          const updatedSettings = {
            provider: config.provider || 'stripe',
            currency: config.currency || 'USD',
            publicKey: config.public_key || '',
            paypalClientId: config.provider === 'paypal' ? config.public_key : '',
          };
          setPaymentSettings(updatedSettings);

          if (config.provider === 'stripe' && config.public_key) {
            setStripePromise(loadStripe(config.public_key));
          }

          if (config.provider === 'stripe') setPaymentMethod('card');
          else if (config.provider === 'paystack') setPaymentMethod('paystack');
          else if (config.provider === 'paypal') setPaymentMethod('paypal');
        }
      } catch (error) {
        console.error('Error loading payment settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    }
    
    fetchPaymentSettings();
  }, []);

  useEffect(() => {
    if (items.length === 0 && !isSuccess && !loadingSettings) {
      router.push('/cart');
    }
  }, [items.length, isSuccess, loadingSettings, router]);

  const createBaseOrder = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not logged in');

    // Final coupon validation before order creation
    if (coupon) {
      const { data: validCoupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', coupon.code)
        .eq('is_active', true)
        .single();
      
      if (couponError || !validCoupon) {
        throw new Error('This coupon is no longer valid. Please remove it and try again.');
      }

      if (validCoupon.expires_at && new Date(validCoupon.expires_at) < new Date()) {
        throw new Error('This coupon has expired. Please remove it and try again.');
      }

      if (validCoupon.max_uses && validCoupon.used_count >= validCoupon.max_uses) {
        throw new Error('This coupon has reached its maximum usage limit.');
      }
    }

    // Create Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        total_amount: total,
        subtotal_amount: subtotal,
        discount_amount: subtotal - total,
        coupon_code: coupon?.code || null,
        currency: currency,
        status: 'pending',
        payment_provider: paymentMethod === 'card' ? 'stripe' : paymentMethod
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create Order Items
    const orderItems = items.map(item => ({
      order_id: order.id,
      beat_id: item.type === 'beat' ? item.id : null,
      bundle_id: item.type === 'bundle' ? item.id : null,
      license_type: item.type === 'beat' ? item.license?.id : 'bundle',
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order;
  };

  const completeOrderUI = async (orderId: string, trxId: string) => {
    // If coupon was used, increment usage
    if (coupon) {
      const { data: success, error: rpcError } = await supabase.rpc('increment_coupon_usage', { coupon_code: coupon.code });
      if (rpcError || !success) {
        console.error('Failed to increment coupon usage:', rpcError);
        // We still complete the order, but log the error
      }
    }

    // Update order status and transaction ID
    if (orderId !== 'paypal_order') {
      await supabase
        .from('orders')
        .update({ 
          status: 'completed', 
          transaction_id: trxId,
          // Re-calculate discount based on actual subtotal/total
          discount_amount: subtotal - total,
          coupon_code: coupon?.code || null
        })
        .eq('id', orderId);
    }
    
    setIsSuccess(true);
    clearCart();
  };

  const handlePaystackPayment = async (order: any) => {
    try {
      const { data } = await axios.post('/api/payments/paystack/initialize', {
        amount: total,
        email,
        orderId: order.id,
        currency: currency === 'NGN' ? 'NGN' : 'USD'
      });
      
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Paystack initialization failed');
      setIsProcessing(false);
    }
  };

  const handleStripePayment = async (stripe: any, elements: any, order: any) => {
    if (!stripe || !elements) return;

    try {
      const { data } = await axios.post('/api/payments/stripe/create-intent', {
        amount: total,
        currency: currency.toLowerCase(),
        orderId: order.id
      });

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: `${firstName} ${lastName}`,
            email: email,
          },
        },
      });

      if (error) {
        setPaymentError(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        await completeOrderUI(order.id, paymentIntent.id);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Stripe payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    { 
      id: 'card', 
      name: 'Credit Card (Stripe)', 
      logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      provider: 'stripe' 
    },
    { 
      id: 'paystack', 
      name: 'Paystack', 
      logo: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Paystack_Logo.png",
      provider: 'paystack' 
    },
    { 
      id: 'paypal', 
      name: 'PayPal', 
      logo: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
      provider: 'paypal' 
    },
  ];

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          Thank you for your purchase. Your beats are now available for download in your dashboard.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={() => router.push('/dashboard/buyer/orders')}
            className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-red-600 transition-colors"
          >
            Go to Orders
          </button>
          <button 
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-full hover:bg-zinc-800 transition-colors"
          >
            Back Home
          </button>
        </div>
      </div>
    );
  }

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Payment Form Wrapper */}
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CreditCard size={20} className="text-primary" /> Payment Details
            </h2>
            
            <div className="space-y-6">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">First Name</label>
                  <input 
                    required 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Last Name</label>
                  <input 
                    required 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Email Address</label>
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" 
                />
              </div>

              {/* Payment Methods Selection */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3">Payment Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={clsx(
                        "flex flex-col items-center justify-center p-4 rounded-xl border transition-all h-24",
                        paymentMethod === method.id 
                          ? "bg-primary/10 border-primary" 
                          : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                      )}
                    >
                      <div className="relative w-full h-8 mb-2">
                        <NextImage 
                          src={method.logo} 
                          alt={method.name} 
                          fill
                          className="object-contain" 
                          style={{ 
                            filter: (paymentMethod !== method.id) 
                              ? 'brightness(0) invert(1)' 
                              : 'none'
                          }}
                        />
                      </div>
                      <span className={clsx(
                        "text-[10px] font-bold uppercase tracking-wider",
                        paymentMethod === method.id ? "text-primary" : "text-zinc-500"
                      )}>
                        {method.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Specific Forms */}
              {paymentMethod === 'card' && stripePromise && (
                <Elements stripe={stripePromise}>
                  <StripeForm 
                    onStart={() => setIsProcessing(true)}
                    onComplete={completeOrderUI}
                    onError={(msg: string) => setPaymentError(msg)}
                    orderCreator={createBaseOrder}
                    amount={total}
                    currency={currency}
                    customerName={`${firstName} ${lastName}`}
                    customerEmail={email}
                  />
                </Elements>
              )}

              {paymentMethod === 'paystack' && (
                <div className="space-y-4">
                  <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/50 text-center">
                    <p className="text-zinc-400 text-sm mb-4 font-medium">
                      You will be redirected to Paystack to complete your secure payment.
                    </p>
                    <div className="w-full h-12 relative opacity-90 hover:opacity-100 transition-opacity">
                      <NextImage 
                        src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Paystack_Logo.png" 
                        alt="Paystack" 
                        fill
                        className="object-contain" 
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      setIsProcessing(true);
                      const order = await createBaseOrder();
                      await handlePaystackPayment(order);
                    }}
                    disabled={isProcessing || !email || !firstName}
                    className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? 'Redirecting...' : `Pay ${formatPrice(total, currency, exchangeRates)} with Paystack`}
                  </button>
                </div>
              )}

              {paymentMethod === 'paypal' && paymentSettings.paypalClientId && (
                <PayPalScriptProvider options={{ clientId: paymentSettings.paypalClientId, currency: currency.toUpperCase() }}>
                  <div className="space-y-4">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest text-center">Complete purchase via PayPal</p>
                    <PayPalButtons 
                      style={{ layout: "vertical", shape: "rect", color: "blue" }}
                      createOrder: async () => {
                        const order = await createBaseOrder();
                        setPendingOrderId(order.id);
                        const { data } = await axios.post('/api/payments/paypal/create-order', {
                          amount: total,
                          currency: currency,
                          orderId: order.id
                        });
                        return data.id;
                      },
                      onApprove: async (data, actions) => {
                        const response = await axios.post('/api/payments/paypal/capture-order', {
                          orderID: data.orderID
                        });
                        if (response.data.status === 'success') {
                          await completeOrderUI(pendingOrderId || 'paypal_order', data.orderID);
                        }
                      }
                    />
                  </div>
                </PayPalScriptProvider>
              )}

              {paymentError && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm font-medium">
                  {paymentError}
                </div>
              )}
            </div>
          </div>

          {/* Order Preview */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 h-fit">
            <h3 className="font-bold text-lg mb-4">Your Order</h3>
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
              {items.map((item) => {
                const isBeat = item.type === 'beat';
                const track = isBeat ? item.item as any : null;
                const bundle = !isBeat ? item.item as any : null;
                
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                      <NextImage 
                        src={isBeat ? track.coverUrl : (bundle.cover_url || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop")} 
                        alt={isBeat ? track.title : bundle.title} 
                        fill 
                        className="object-cover" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{isBeat ? track.title : bundle.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                        {isBeat ? item.license?.name : 'Bundle Pack'}
                      </p>
                    </div>
                    <span className="font-bold text-sm">{formatPrice(item.price, currency, exchangeRates)}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400 font-medium">Subtotal</span>
                <span className="text-zinc-300 font-bold">{formatPrice(subtotal, currency, exchangeRates)}</span>
              </div>
              
              {coupon && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-500 font-medium flex items-center gap-1">
                    <CheckCircle size={14} /> Discount ({coupon.code})
                  </span>
                  <span className="text-green-500 font-bold">-{formatPrice(subtotal - total, currency, exchangeRates)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50">
                <span className="text-white font-bold">Total</span>
                <span className="text-2xl font-black text-primary">
                  {formatPrice(total, currency, exchangeRates)}
                </span>
              </div>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-black justify-center">
              <Lock size={12} className="text-primary" />
              Secure Encrypted Transaction
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Internal Stripe Component
function StripeForm({ onStart, onComplete, onError, orderCreator, amount, currency, customerName, customerEmail }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    onStart();

    try {
      const order = await orderCreator();
      const { data } = await axios.post('/api/payments/stripe/create-intent', {
        amount,
        currency: currency.toLowerCase(),
        orderId: order.id
      });

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: customerName,
            email: customerEmail,
          },
        },
      });

      if (error) {
        onError(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        await onComplete(order.id, paymentIntent.id);
      }
    } catch (err: any) {
      onError(err.message || 'Stripe failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/50">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-xs font-bold text-zinc-500 uppercase">Card Details</label>
          <div className="w-16 h-8 relative opacity-90">
            <NextImage 
              src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
              alt="Stripe" 
              fill
              className="object-contain" 
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        </div>
        
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#ffffff',
                '::placeholder': { color: '#71717a' },
                fontFamily: 'Geist, sans-serif',
              },
            },
          }} />
        </div>
      </div>

      <button 
        type="submit"
        disabled={processing || !stripe}
        className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? 'Processing...' : `Pay Now`}
        {!processing && <Lock size={16} />}
      </button>
    </form>
  );
}
