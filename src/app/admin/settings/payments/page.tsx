"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Loader2, CreditCard, AlertCircle, CheckCircle, Plus, Trash2, DollarSign, Globe, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';
import { getAdminLink } from '@/constants/admin';
import { useSettingsStore } from '@/store/useSettingsStore';
import NextImage from 'next/image';

export default function AdminPaymentSettingsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  const { adminPath: globalAdminPath } = useSettingsStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading' | 'auth';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [paymentSettings, setPaymentSettings] = useState<any>({
    provider: 'stripe',
    public_key: '',
    secret_key: '',
    commission_percentage: 10.00,
    paypal_mode: 'sandbox',
    paypal_payouts_enabled: false
  });

  const [currencySettings, setCurrencySettings] = useState({
    default: 'USD',
    currencies: [
      { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, region: 'Global' },
      { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', rate: 1500, region: 'Nigeria' },
      { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', rate: 15, region: 'Ghana' },
      { code: 'KSH', name: 'Kenyan Shilling', symbol: 'KSh', rate: 130, region: 'Kenya' },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 19, region: 'South Africa' },
      { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79, region: 'UK' },
      { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92, region: 'Europe' },
    ]
  });

  const [newCurrency, setNewCurrency] = useState({ code: '', symbol: '', rate: '', name: '', region: '' });

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      router.push('/');
      return;
    }

    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('*')
          .in('key', ['payment_config', 'currency_settings']);

        if (error) throw error;

        if (data) {
          const paymentData = data.find(item => item.key === 'payment_config')?.value;
          const currencyData = data.find(item => item.key === 'currency_settings')?.value;

          if (paymentData) setPaymentSettings(paymentData);
          if (currencyData) setCurrencySettings(currencyData);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchSettings();
    }
  }, [user, profile, authLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusModal({
      isOpen: true,
      type: 'loading',
      title: 'Saving Settings',
      message: 'Updating payment and currency configurations...'
    });

    try {
      // Save payment settings
      const { error: paymentError } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'payment_config',
          value: paymentSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (paymentError) throw paymentError;

      // Save currency settings
      const { error: currencyError } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'currency_settings',
          value: currencySettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (currencyError) throw currencyError;

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'Payment and currency settings updated successfully.'
      });
      
      setTimeout(() => setStatusModal(prev => ({ ...prev, isOpen: false })), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save settings.'
      });
    } finally {
      setSaving(false);
    }
  };

  const addCurrency = () => {
    if (!newCurrency.code || !newCurrency.rate || !newCurrency.symbol) return;
    setCurrencySettings({
      ...currencySettings,
      currencies: [
        ...currencySettings.currencies,
        { 
          code: newCurrency.code.toUpperCase(), 
          symbol: newCurrency.symbol,
          rate: parseFloat(newCurrency.rate),
          name: newCurrency.name || newCurrency.code.toUpperCase(),
          region: newCurrency.region || 'Global'
        }
      ]
    });
    setNewCurrency({ code: '', symbol: '', rate: '', name: '', region: '' });
  };

  const removeCurrency = (code: string) => {
    if (code === 'USD') return; // Cannot remove base currency
    setCurrencySettings({
      ...currencySettings,
      currencies: currencySettings.currencies.filter(c => c.code !== code)
    });
  };

  const updateRate = (code: string, newRate: number) => {
    setCurrencySettings({
      ...currencySettings,
      currencies: currencySettings.currencies.map(c => 
        c.code === code ? { ...c, rate: newRate } : c
      )
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 animate-pulse font-medium">Loading Payment Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
      <Header />
      
      <main className="pt-[100px] max-w-5xl mx-auto px-6">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">
              Payment <span className="text-primary">& Currency</span>
            </h1>
            <p className="text-zinc-500 font-medium italic">Configure how BeatPoppa processes global transactions</p>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-black font-black py-4 px-10 rounded-2xl hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save All Changes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Payment Providers */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Payment Providers</h2>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Select and configure your primary gateways</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {['stripe', 'paystack', 'paypal'].map((prov) => (
                  <label 
                    key={prov}
                    className={`cursor-pointer p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-4 group ${paymentSettings.provider === prov ? 'border-primary bg-primary/5' : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'}`}
                  >
                    <input 
                      type="radio" 
                      name="provider" 
                      value={prov} 
                      checked={paymentSettings.provider === prov}
                      onChange={(e) => setPaymentSettings({...paymentSettings, provider: e.target.value})}
                      className="hidden"
                    />
                    <div className={`p-4 rounded-2xl w-full h-24 flex items-center justify-center transition-all bg-white`}>
                      {prov === 'stripe' && (
                        <div className="relative w-full h-10">
                          <NextImage 
                            src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" 
                            alt="Stripe" 
                            fill
                            className="object-contain" 
                          />
                        </div>
                      )}
                      {prov === 'paystack' && (
                        <div className="relative w-full h-10">
                          <NextImage 
                            src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Paystack_Logo.png"
                            alt="Paystack" 
                            fill
                            className="object-contain" 
                          />
                        </div>
                      )}
                      {prov === 'paypal' && (
                        <div className="relative w-full h-10">
                          <NextImage 
                            src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                            alt="PayPal" 
                            fill
                            className="object-contain" 
                          />
                        </div>
                      )}
                    </div>
                    <span className="font-black uppercase tracking-widest text-[10px] text-zinc-400">{prov}</span>
                    {paymentSettings.provider === prov && <CheckCircle size={16} className="text-primary" />}
                  </label>
                ))}
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">
                      {paymentSettings.provider === 'paypal' ? 'PayPal Client ID' : 'Public/Client Key'}
                    </label>
                    <input 
                      type="text" 
                      value={paymentSettings.public_key}
                      onChange={(e) => setPaymentSettings({...paymentSettings, public_key: e.target.value})}
                      placeholder={paymentSettings.provider === 'paypal' ? 'Enter Client ID' : `${paymentSettings.provider}_public_key`}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">
                      {paymentSettings.provider === 'paypal' ? 'PayPal Secret Key' : 'Secret/Private Key'}
                    </label>
                    <input 
                      type="password" 
                      value={paymentSettings.secret_key}
                      onChange={(e) => setPaymentSettings({...paymentSettings, secret_key: e.target.value})}
                      placeholder="••••••••••••••••"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all text-sm font-mono"
                    />
                  </div>
                </div>

                {paymentSettings.provider === 'paypal' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">PayPal Mode</label>
                      <select 
                        value={paymentSettings.paypal_mode || 'sandbox'}
                        onChange={(e) => setPaymentSettings({...paymentSettings, paypal_mode: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none appearance-none text-sm"
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="live">Live (Production)</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">PayPal Payout Status</label>
                      <div className="flex items-center h-[58px] px-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
                         <label className="flex items-center gap-3 cursor-pointer group w-full">
                            <input 
                              type="checkbox" 
                              checked={paymentSettings.paypal_payouts_enabled || false}
                              onChange={(e) => setPaymentSettings({...paymentSettings, paypal_payouts_enabled: e.target.checked})}
                              className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-primary focus:ring-primary"
                            />
                            <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors uppercase tracking-widest">Enable Automatic Payouts</span>
                         </label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 flex items-start gap-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-white mb-1">Security Note</h4>
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                      API keys are stored securely in your encrypted database. Never share these keys with anyone. For PayPal, use your Client ID and Secret from the Developer Dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Platform Fees</h2>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Configure your marketplace commission</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex-1 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Commission Percentage (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="100"
                      value={paymentSettings.commission_percentage}
                      onChange={(e) => setPaymentSettings({...paymentSettings, commission_percentage: parseFloat(e.target.value)})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-700 font-black">%</span>
                  </div>
                </div>
                <div className="w-1/3 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Estimated Earnings</p>
                  <p className="text-2xl font-black text-white">{paymentSettings.commission_percentage}%</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Per Transaction</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Currency Conversion */}
          <div className="space-y-8">
            <section className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                  <Globe size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Currency</h2>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Global pricing engine</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Base Marketplace Currency</label>
                  <select 
                    value={currencySettings.default}
                    onChange={(e) => setCurrencySettings({...currencySettings, default: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white font-bold focus:border-primary outline-none appearance-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-zinc-800">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 ml-4 flex items-center justify-between">
                    <span>Exchange Rates (vs {currencySettings.default})</span>
                    <span className="text-primary/50 normal-case font-medium">1 {currencySettings.default} = X</span>
                  </h4>
                  
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {currencySettings.currencies?.map((curr) => (
                      <div key={curr.code} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 group hover:border-zinc-700 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-xs text-zinc-400 group-hover:text-primary transition-colors">
                            {curr.symbol}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-xs text-white uppercase tracking-wider">{curr.code}</span>
                              <span className="text-[9px] text-zinc-600 font-bold uppercase truncate">{curr.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={curr.rate}
                                onChange={(e) => updateRate(curr.code, parseFloat(e.target.value))}
                                className="bg-transparent border-none p-0 text-white font-mono text-sm w-24 focus:outline-none focus:text-primary transition-colors"
                                step="0.00001"
                              />
                              <span className="text-[10px] text-zinc-700 font-bold">/ {currencySettings.default}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-zinc-900 rounded-lg border border-zinc-800">
                              <span className="text-[9px] text-zinc-500 font-black uppercase">Example</span>
                              <span className="text-[11px] font-mono text-zinc-400">
                                {curr.symbol}{ (100 * curr.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                              </span>
                            </div>
                            {curr.code !== currencySettings.default && (
                              <button 
                                onClick={() => removeCurrency(curr.code)}
                                className="p-2.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-6 bg-zinc-950/50 rounded-[24px] border border-zinc-800 border-dashed">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 ml-1">Add New Currency</p>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <input 
                        type="text" 
                        placeholder="ISO CODE (USD)"
                        value={newCurrency.code}
                        onChange={(e) => setNewCurrency({...newCurrency, code: e.target.value.toUpperCase()})}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                        maxLength={3}
                      />
                      <input 
                        type="text" 
                        placeholder="SYMBOL ($)"
                        value={newCurrency.symbol}
                        onChange={(e) => setNewCurrency({...newCurrency, symbol: e.target.value})}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder="REGION (Global)"
                        value={newCurrency.region}
                        onChange={(e) => setNewCurrency({...newCurrency, region: e.target.value})}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input 
                        type="text" 
                        placeholder="NAME (US Dollar)"
                        value={newCurrency.name}
                        onChange={(e) => setNewCurrency({...newCurrency, name: e.target.value})}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                      />
                      <input 
                        type="number" 
                        placeholder="RATE (1.00)"
                        value={newCurrency.rate}
                        onChange={(e) => setNewCurrency({...newCurrency, rate: e.target.value})}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <button 
                      onClick={addCurrency}
                      disabled={!newCurrency.code || !newCurrency.symbol || !newCurrency.rate}
                      className="w-full bg-white text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add Currency
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
