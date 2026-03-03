"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  ShieldCheck, 
  Upload, 
  User, 
  FileText, 
  Camera, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import StatusModal from '@/components/StatusModal';
import Image from 'next/image';

export default function CreatorVerificationPage() {
  const { user, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<any>(null);
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

  const [formData, setFormData] = useState({
    full_name: '',
    id_type: 'government_id',
    id_number: '',
    id_image_url: '',
    selfie_image_url: '',
    social_link: ''
  });

  useEffect(() => {
    if (user) {
      fetchVerificationStatus();
    }
  }, [user]);

  async function fetchVerificationStatus() {
    try {
      const { data, error } = await supabase
        .from('creator_verifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setVerification(data);
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'id_image_url' | 'selfie_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubmitting(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${field}_${Date.now()}.${fileExt}`;
      const filePath = `verifications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [field]: publicUrl }));
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_image_url || !formData.selfie_image_url) {
      alert('Please upload both ID and selfie images.');
      return;
    }

    setSubmitting(true);
    setStatusModal({
      isOpen: true,
      type: 'loading',
      title: 'Submitting...',
      message: 'Uploading your verification details for review.'
    });

    try {
      const { error } = await supabase
        .from('creator_verifications')
        .insert({
          user_id: user?.id,
          full_name: formData.full_name,
          id_type: formData.id_type,
          id_number: formData.id_number,
          id_image_url: formData.id_image_url,
          selfie_image_url: formData.selfie_image_url,
          social_link: formData.social_link,
          status: 'pending'
        });

      if (error) throw error;

      // Also notify admin
      await supabase.from('notifications').insert({
        user_id: 'admin', // Placeholder or real admin ID if known
        type: 'new_verification',
        title: 'New Creator Verification',
        message: `${profile?.display_name || user?.email} has submitted a verification request.`,
        link: '/admin/creators'
      });

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Submitted!',
        message: 'Your verification request has been sent to our team for review. This usually takes 24-48 hours.'
      });

      fetchVerificationStatus();
    } catch (error: any) {
      console.error('Submission error:', error);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to submit verification request.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 animate-pulse font-medium">Loading status...</p>
      </div>
    );
  }

  // If already approved
  if (profile?.role === 'creator' || (verification && verification.status === 'approved')) {
    return (
      <div className="min-h-screen bg-black pb-24 text-white">
        <Header />
        <main className="pt-[150px] max-w-2xl mx-auto px-6 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 text-primary shadow-[0_0_50px_rgba(255,10,10,0.1)]">
            <ShieldCheck size={48} />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4 uppercase">You are <span className="text-primary">Verified!</span></h1>
          <p className="text-zinc-500 font-medium mb-12">Your identity has been verified and your account is in good standing.</p>
          
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">Verification Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-zinc-800/50">
                <span className="text-zinc-400 font-medium">Status</span>
                <span className="text-green-500 font-black uppercase tracking-widest text-[10px] bg-green-500/10 px-3 py-1 rounded-full">Approved</span>
              </div>
              <div className="flex justify-between py-3 border-b border-zinc-800/50">
                <span className="text-zinc-400 font-medium">Verified On</span>
                <span className="text-white font-bold">{verification?.processed_at ? new Date(verification.processed_at).toLocaleDateString() : 'Lifetime'}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If pending
  if (verification && verification.status === 'pending') {
    return (
      <div className="min-h-screen bg-black pb-24 text-white">
        <Header />
        <main className="pt-[150px] max-w-2xl mx-auto px-6 text-center">
          <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-yellow-500">
            <Clock size={48} />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4 uppercase">Review <span className="text-yellow-500">In Progress</span></h1>
          <p className="text-zinc-500 font-medium mb-12">Our team is currently reviewing your identity documents. This usually takes 24-48 hours.</p>
          
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[32px] p-8 text-left">
            <div className="flex items-center gap-3 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800">
              <Info className="text-primary" size={20} />
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                You will receive a notification and an email once your verification status is updated.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If rejected
  if (verification && verification.status === 'rejected') {
    return (
      <div className="min-h-screen bg-black pb-24 text-white">
        <Header />
        <main className="pt-[150px] max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500">
              <AlertTriangle size={48} />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4 uppercase">Verification <span className="text-red-500">Rejected</span></h1>
            <p className="text-zinc-500 font-medium">Your previous application was not approved. Please review the notes and try again.</p>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-[32px] p-8 mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-4">Admin Notes</h3>
            <p className="text-white font-medium italic">"{verification.admin_notes || 'No specific reason provided. Please ensure your documents are clear and valid.'}"</p>
          </div>

          <button 
            onClick={() => setVerification(null)}
            className="w-full bg-primary text-black font-black py-5 rounded-2xl hover:scale-[1.02] transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            Resubmit Verification
          </button>
        </main>
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
      
      <main className="pt-[120px] max-w-4xl mx-auto px-6">
        <div className="mb-12">
          <h1 className="text-5xl font-black tracking-tight mb-4 uppercase">
            Verify <span className="text-primary">Identity</span>
          </h1>
          <p className="text-zinc-500 font-medium italic">Required for selling beats and processing payouts</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Legal Information</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Must match your ID documents</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Full Legal Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                  placeholder="As shown on ID"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Social Profile Link</label>
                <input 
                  type="url" 
                  required
                  value={formData.social_link}
                  onChange={(e) => setFormData({...formData, social_link: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-white font-bold focus:border-primary outline-none transition-all"
                  placeholder="Instagram, Twitter, or Portfolio"
                />
              </div>
            </div>
          </section>

          {/* Document Upload */}
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-[40px] p-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Identity Verification</h2>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Upload clear, readable images</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* ID Image */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Government Issued ID</p>
                <div className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-4 group ${formData.id_image_url ? 'border-primary/50' : 'border-zinc-800 hover:border-primary/30 bg-zinc-950/50'}`}>
                  {formData.id_image_url ? (
                    <>
                      <img src={formData.id_image_url} alt="ID" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                          Change Image
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'id_image_url')} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-600 group-hover:text-primary transition-colors">
                        <Camera size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-white mb-1">Click to upload ID</p>
                        <p className="text-[9px] text-zinc-500 font-medium">Passport, Driver's License, or National ID</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'id_image_url')} />
                      <label className="absolute inset-0 cursor-pointer" />
                    </>
                  )}
                </div>
              </div>

              {/* Selfie Image */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Selfie with ID</p>
                <div className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-4 group ${formData.selfie_image_url ? 'border-primary/50' : 'border-zinc-800 hover:border-primary/30 bg-zinc-950/50'}`}>
                  {formData.selfie_image_url ? (
                    <>
                      <img src={formData.selfie_image_url} alt="Selfie" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
                          Change Image
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'selfie_image_url')} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-600 group-hover:text-primary transition-colors">
                        <Camera size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-white mb-1">Upload Selfie</p>
                        <p className="text-[9px] text-zinc-500 font-medium">Hold your ID next to your face</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'selfie_image_url')} />
                      <label className="absolute inset-0 cursor-pointer" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="p-8 bg-primary/5 border border-primary/20 rounded-[32px] flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-xl text-primary mt-1">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight mb-1">Privacy Guarantee</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Your documents are stored securely and encrypted. We only use them for identity verification and never share them with third parties or other users.
              </p>
            </div>
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-black font-black py-6 rounded-3xl hover:scale-[1.02] transition-all active:scale-95 uppercase tracking-[0.2em] text-sm shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
            Submit Verification
          </button>
        </form>
      </main>
    </div>
  );
}
