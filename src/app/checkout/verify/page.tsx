"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function VerifyPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider');
  const reference = searchParams.get('reference') || searchParams.get('trxref'); // Paystack
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    async function verify() {
      if (!provider || !reference) {
        setStatus('error');
        setMessage('Invalid payment reference or provider.');
        return;
      }

      try {
        if (provider === 'paystack') {
          const { data } = await axios.post('/api/payments/paystack/verify', { reference });
          if (data.status === 'success') {
            setStatus('success');
            setMessage('Payment verified! Your order is being processed.');
            // Order is already updated by webhook or we can do it here as backup
            setTimeout(() => router.push('/dashboard/buyer/orders'), 3000);
          } else {
            setStatus('error');
            setMessage('Payment verification failed.');
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('An error occurred while verifying your payment.');
      }
    }

    verify();
  }, [provider, reference, router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
      {status === 'loading' && (
        <div className="space-y-4">
          <Loader2 size={48} className="animate-spin text-primary mx-auto" />
          <h1 className="text-2xl font-bold">{message}</h1>
        </div>
      )}
      {status === 'success' && (
        <div className="space-y-4">
          <CheckCircle size={64} className="text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold">Payment Successful!</h1>
          <p className="text-zinc-400">{message}</p>
          <button 
            onClick={() => router.push('/dashboard/buyer/orders')}
            className="px-8 py-3 bg-primary text-white font-bold rounded-full mt-4"
          >
            Go to Orders
          </button>
        </div>
      )}
      {status === 'error' && (
        <div className="space-y-4">
          <XCircle size={64} className="text-red-500 mx-auto" />
          <h1 className="text-3xl font-bold">Payment Failed</h1>
          <p className="text-zinc-400">{message}</p>
          <button 
            onClick={() => router.push('/checkout')}
            className="px-8 py-3 bg-zinc-800 text-white font-bold rounded-full mt-4"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
