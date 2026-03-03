"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Loader2, Sliders, Plus, Trash2, CheckCircle, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useUIStore, formatPrice } from '@/store/useUIStore';
import StatusModal from '@/components/StatusModal';
import { getAdminLink } from '@/constants/admin';
import { useSettingsStore } from '@/store/useSettingsStore';
import Link from 'next/link';

interface LicenseType {
  id: string;
  name: string;
  description: string;
  default_price: number;
  features: string[];
  is_active: boolean;
}

export default function AdminLicensesPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  const { adminPath: globalAdminPath } = useSettingsStore();
  const { currency, exchangeRates } = useUIStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenses, setLicenses] = useState<LicenseType[]>([]);
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const [editingLicense, setEditingLicense] = useState<Partial<LicenseType> | null>(null);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      router.push('/');
      return;
    }

    fetchLicenses();
  }, [user, profile, authLoading, router]);

  async function fetchLicenses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('license_types')
        .select('*')
        .order('default_price', { ascending: true });

      if (error) throw error;
      setLicenses(data || []);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveLicense = async () => {
    if (!editingLicense?.name || !editingLicense?.default_price) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setStatusModal({
      isOpen: true,
      type: 'loading',
      title: 'Saving...',
      message: 'Updating license information...'
    });

    try {
      const { data, error } = editingLicense.id 
        ? await supabase
            .from('license_types')
            .update(editingLicense)
            .eq('id', editingLicense.id)
            .select()
        : await supabase
            .from('license_types')
            .insert([editingLicense])
            .select();

      if (error) throw error;

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Success!',
        message: 'License has been saved successfully.'
      });

      setEditingLicense(null);
      fetchLicenses();
    } catch (error: any) {
      console.error('Error saving license:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to save license.'
      });
    } finally {
      setSaving(false);
    }
  }

  const handleDeleteLicense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this license type? This might affect existing beats using this license.')) return;

    try {
      const { error } = await supabase
        .from('license_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLicenses();
    } catch (error) {
      console.error('Error deleting license:', error);
      alert('Failed to delete license type.');
    }
  }

  const addFeature = () => {
    if (!newFeature.trim() || !editingLicense) return;
    const features = [...(editingLicense.features || []), newFeature.trim()];
    setEditingLicense({ ...editingLicense, features });
    setNewFeature('');
  }

  const removeFeature = (index: number) => {
    if (!editingLicense) return;
    const features = [...(editingLicense.features || [])];
    features.splice(index, 1);
    setEditingLicense({ ...editingLicense, features });
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <Link 
              href={getAdminLink('/settings', globalAdminPath)}
              className="flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold uppercase tracking-widest">Back to Settings</span>
            </Link>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">
              License <span className="text-primary">Management</span>
            </h1>
            <p className="text-zinc-500 font-medium">Configure license types, pricing and usage rights</p>
          </div>
          
          <button
            onClick={() => setEditingLicense({ name: '', description: '', default_price: 29.99, features: [], is_active: true })}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={20} />
            Add New License
          </button>
        </div>

        {editingLicense && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                  {editingLicense.id ? 'Edit' : 'Create'} <span className="text-primary">License</span>
                </h2>
                <button 
                  onClick={() => setEditingLicense(null)}
                  className="p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded-xl transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">License Name</label>
                    <input 
                      type="text"
                      value={editingLicense.name}
                      onChange={(e) => setEditingLicense({ ...editingLicense, name: e.target.value })}
                      placeholder="e.g. Basic License"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:outline-none focus:border-primary transition-colors text-white font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Default Price ($)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingLicense.default_price}
                      onChange={(e) => setEditingLicense({ ...editingLicense, default_price: parseFloat(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:outline-none focus:border-primary transition-colors text-white font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Description</label>
                  <textarea 
                    value={editingLicense.description || ''}
                    onChange={(e) => setEditingLicense({ ...editingLicense, description: e.target.value })}
                    placeholder="Short description of this license..."
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:outline-none focus:border-primary transition-colors text-white font-medium resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Features / Usage Rights</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                      placeholder="Add a feature (e.g. MP3 Download)"
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 focus:outline-none focus:border-primary transition-colors text-white font-medium"
                    />
                    <button 
                      onClick={addFeature}
                      className="p-4 bg-zinc-800 text-white rounded-2xl hover:bg-zinc-700 transition-colors"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    {editingLicense.features?.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-4 rounded-xl group">
                        <span className="text-zinc-300 font-medium">{feature}</span>
                        <button 
                          onClick={() => removeFeature(index)}
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                  <input 
                    type="checkbox"
                    id="is_active"
                    checked={editingLicense.is_active}
                    onChange={(e) => setEditingLicense({ ...editingLicense, is_active: e.target.checked })}
                    className="w-5 h-5 accent-primary rounded-lg"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-white cursor-pointer">This license type is active and available for use</label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setEditingLicense(null)}
                    className="flex-1 py-4 bg-zinc-800 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveLicense}
                    disabled={saving}
                    className="flex-1 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin mx-auto" /> : 'Save License'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {licenses.map((license) => (
            <div 
              key={license.id} 
              className={`bg-zinc-900 border ${license.is_active ? 'border-zinc-800' : 'border-red-500/20'} rounded-3xl p-8 flex flex-col relative group overflow-hidden`}
            >
              {!license.is_active && (
                <div className="absolute top-4 right-4 bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Inactive
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{license.name}</h3>
                <div className="text-3xl font-black text-primary">{formatPrice(license.default_price, currency, exchangeRates)}</div>
              </div>
              
              <p className="text-zinc-500 text-sm mb-8 font-medium leading-relaxed">
                {license.description || 'No description provided.'}
              </p>
              
              <div className="space-y-3 mb-10 flex-1">
                {license.features?.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 text-zinc-300 text-sm">
                    <CheckCircle size={16} className="text-primary flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 pt-6 border-t border-zinc-800">
                <button 
                  onClick={() => setEditingLicense(license)}
                  className="flex-1 py-3 bg-zinc-800 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-all"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteLicense(license.id)}
                  className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-600 hover:text-red-500 hover:border-red-500/50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          
          {licenses.length === 0 && !loading && (
            <div className="col-span-full py-20 bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                <Sliders size={32} />
              </div>
              <h3 className="text-xl font-black text-white uppercase mb-2">No Licenses Configured</h3>
              <p className="text-zinc-500 max-w-md font-medium">
                You haven't added any license types yet. Add your first license to start selling beats.
              </p>
              <button
                onClick={() => setEditingLicense({ name: '', description: '', default_price: 29.99, features: [], is_active: true })}
                className="mt-8 flex items-center gap-2 px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-primary/20"
              >
                <Plus size={20} />
                Create First License
              </button>
            </div>
          )}
        </div>
      </main>

      <StatusModal 
        isOpen={statusModal.isOpen}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
      />
    </div>
  );
}
