"use client";

import Header from '@/components/Header';
import { UploadCloud, Music, DollarSign, Image as ImageIcon, FileAudio, CheckCircle, AlertCircle, FileText, Clock } from 'lucide-react';
import { useState, useRef, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, useSearchParams } from 'next/navigation';
import AccessDenied from '@/components/AccessDenied';
import { useUIStore, formatPrice } from '@/store/useUIStore';

function UploadBeatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const { user, profile } = useAuthStore();
  const { currency, exchangeRates } = useUIStore();
  const [accessDenied, setAccessDenied] = useState(false);

  // Check if user is a creator and enforce strictly
  useEffect(() => {
    if (profile && profile.role === 'buyer') {
       setAccessDenied(true);
    }
  }, [profile?.role]);

  // Don't render content if access denied, BUT keep hooks order consistent
  // Instead of early return, we render conditionally below
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [files, setFiles] = useState<{ audio: File | null; cover: File | null }>({
    audio: null,
    cover: null
  });

  const [existingUrls, setExistingUrls] = useState<{ audio: string | null; cover: string | null }>({
    audio: null,
    cover: null
  });

  const [metadata, setMetadata] = useState({
    title: '',
    bpm: '',
    key: '',
    tags: '',
    description: '',
    previewDuration: '15'
  });

  const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);
  const [selectedLicenses, setSelectedLicenses] = useState<Record<string, { enabled: boolean, price: number }>>({});
  const [isFree, setIsFree] = useState(false);
  const [preFreeLicenses, setPreFreeLicenses] = useState<Record<string, { enabled: boolean, price: number }> | null>(null);
  const [commissionPercent, setCommissionPercent] = useState<number>(0);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Fetch available licenses
  useEffect(() => {
    async function fetchLicenses() {
      try {
        const { data, error } = await supabase
          .from('license_types')
          .select('*')
          .eq('is_active', true)
          .order('default_price', { ascending: true });

        if (error) throw error;
        if (data) {
          setAvailableLicenses(data);
          
          // Initialize selected licenses with defaults if not editing
          if (!editId) {
            const initial: Record<string, { enabled: boolean, price: number }> = {};
            data.forEach((l: any) => {
              initial[l.id] = { enabled: l.name.includes('Basic'), price: l.default_price };
            });
            setSelectedLicenses(initial);
          }
        }
      } catch (err) {
        console.error('Error fetching license types:', err);
      }
    }
    fetchLicenses();
  }, [editId]);

  useEffect(() => {
    async function fetchCommission() {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'payment_config')
          .maybeSingle();

        const value = (data?.value as any) || {};
        const pct = typeof value?.commission_percentage === 'number' ? value.commission_percentage : Number(value?.commission_percentage || 0);
        setCommissionPercent(Number.isFinite(pct) ? pct : 0);
      } catch {
        setCommissionPercent(0);
      }
    }
    fetchCommission();
  }, []);

  useEffect(() => {
    if (!editId) return;
    if (!availableLicenses.length) return;
    setSelectedLicenses((prev) => {
      const next: Record<string, { enabled: boolean; price: number }> = { ...prev };
      availableLicenses.forEach((l: any) => {
        if (!next[l.id]) next[l.id] = { enabled: false, price: l.default_price };
        if (typeof next[l.id].price !== 'number' || Number.isNaN(next[l.id].price)) next[l.id].price = l.default_price;
      });
      return next;
    });
  }, [editId, availableLicenses.length]);

  useEffect(() => {
    if (!availableLicenses.length) return;

    const cheapest = [...availableLicenses].sort((a: any, b: any) => (a.default_price || 0) - (b.default_price || 0))[0];
    if (!cheapest) return;

    if (isFree) {
      setPreFreeLicenses((prev) => prev ?? selectedLicenses);
      setSelectedLicenses((prev) => {
        const next: Record<string, { enabled: boolean; price: number }> = { ...prev };
        availableLicenses.forEach((l: any) => {
          const basePrice = typeof next[l.id]?.price === 'number' ? next[l.id].price : l.default_price;
          next[l.id] = { enabled: l.id === cheapest.id, price: l.id === cheapest.id ? 0 : basePrice };
        });
        return next;
      });
    } else if (preFreeLicenses) {
      setSelectedLicenses(preFreeLicenses);
      setPreFreeLicenses(null);
    }
  }, [isFree, availableLicenses.length]);

  // Load existing beat if editing
  useEffect(() => {
    if (!editId || !user) return;

    async function fetchBeat() {
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from('beats')
          .select('*, beat_licenses(*)')
          .eq('id', editId)
          .single();

        if (error) throw error;
        
        if (data) {
          // Verify ownership
          if (data.artist_id !== user!.id) {
             setError("You don't have permission to edit this beat.");
             router.push('/dashboard/creator/my-beats');
             return;
          }

          setMetadata({
            title: data.title,
            bpm: data.bpm?.toString() || '',
            key: data.key || '',
            tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
            description: data.description || '',
            previewDuration: data.preview_duration?.toString() || '15'
          });
          
          setExistingUrls({
            audio: data.audio_url,
            cover: data.cover_url
          });

          // Initialize selected licenses from database
          if (data.beat_licenses && data.beat_licenses.length > 0) {
            const initial: Record<string, { enabled: boolean, price: number }> = {};
            data.beat_licenses.forEach((bl: any) => {
              initial[bl.license_type_id] = { enabled: bl.is_active, price: bl.price };
            });
            setSelectedLicenses(initial);
          }
          
          // Start at step 2 (Details) since files are already there
          setStep(2);
        }
      } catch (err) {
        console.error('Error fetching beat:', err);
        setError('Failed to load beat details.');
      } finally {
        setFetching(false);
      }
    }

    fetchBeat();
  }, [editId, user?.id, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
      if (type === 'audio') setStep(2);
    }
  };

  const handlePriceChange = (id: string, value: string) => {
    const price = parseFloat(value);
    setSelectedLicenses(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { enabled: true, price: 0 }), price: isNaN(price) ? 0 : price }
    }));
  };

  const toggleLicense = (id: string) => {
    if (isFree) return;
    const license = availableLicenses.find((l: any) => l.id === id);
    const defaultPrice = typeof license?.default_price === 'number' ? license.default_price : 0;
    setSelectedLicenses((prev) => {
      const current = prev[id];
      const nextEnabled = !current?.enabled;
      const nextPrice = typeof current?.price === 'number' ? current.price : defaultPrice;
      return {
        ...prev,
        [id]: { enabled: nextEnabled, price: nextEnabled ? nextPrice : nextPrice }
      };
    });
  };

  const handleUpload = async () => {
    if (!user) {
      setError('You must be logged in.');
      return;
    }
    
    // Validation
    if (!editId) {
       if (!files.audio || !files.cover) {
         setError('Please upload both audio and cover art.');
         return;
       }
    } else {
       // In edit mode, we need either new files or existing URLs
       if (!files.audio && !existingUrls.audio) {
          setError('Audio file is missing.');
          return;
       }
       if (!files.cover && !existingUrls.cover) {
          setError('Cover art is missing.');
          return;
       }
    }

    setLoading(true);
    setError(null);

    try {
      const timestamp = Date.now();
      let audioUrl = existingUrls.audio;
      let coverUrl = existingUrls.cover;

      // 1. Upload Audio if new file selected
      if (files.audio) {
        const audioPath = `${user.id}/${timestamp}-${files.audio.name}`;
        const { error: audioError } = await supabase.storage
          .from('beats')
          .upload(audioPath, files.audio);

        if (audioError) throw new Error(`Audio upload failed: ${audioError.message}`);
        
        const { data: { publicUrl } } = supabase.storage
          .from('beats')
          .getPublicUrl(audioPath);
        audioUrl = publicUrl;
      }

      // 2. Upload Cover if new file selected
      if (files.cover) {
        const coverPath = `${user.id}/${timestamp}-${files.cover.name}`;
        const { error: coverError } = await supabase.storage
          .from('covers')
          .upload(coverPath, files.cover);
        
        let finalCoverPath = coverPath;
        let coverBucket = 'covers';

        if (coverError) {
           console.warn('Cover upload to "covers" bucket failed, trying "beats" bucket...', coverError);
           const { error: retryError } = await supabase.storage
              .from('beats')
              .upload(`covers/${coverPath}`, files.cover);
           
           if (retryError) throw new Error(`Cover upload failed: ${retryError.message}`);
           finalCoverPath = `covers/${coverPath}`;
           coverBucket = 'beats';
        }

        const { data: { publicUrl } } = supabase.storage
          .from(coverBucket)
          .getPublicUrl(finalCoverPath);
        coverUrl = publicUrl;
      }

      // 3. Insert or Update Database
      const selectedIds = Object.keys(selectedLicenses).filter(id => selectedLicenses[id]?.enabled);
      if (selectedIds.length === 0 && !isFree) {
        throw new Error('Please select at least one license or set as free.');
      }

      const startingPrice = isFree ? 0 : Math.min(...selectedIds.map(id => selectedLicenses[id].price || 0));

      const beatData = {
          title: metadata.title,
          artist_id: user.id,
          audio_url: audioUrl,
          cover_url: coverUrl,
          price: startingPrice,
          bpm: parseInt(metadata.bpm) || 0,
          key: metadata.key,
          tags: metadata.tags.split(',').map(t => t.trim()),
          genre: 'Afrobeats', // Could make this dynamic later
          description: metadata.description,
          preview_duration: parseInt(metadata.previewDuration),
          is_active: true
      };

      let beatId = editId;

      if (editId) {
         const { error: dbError } = await supabase
           .from('beats')
           .update(beatData)
           .eq('id', editId);
         if (dbError) throw dbError;
      } else {
         const { data: newBeat, error: dbError } = await supabase
           .from('beats')
           .insert(beatData)
           .select('id, title')
           .single();
         if (dbError) throw dbError;
         beatId = newBeat.id;
         
         // Notify creator
         await supabase.from('notifications').insert({
           user_id: user.id,
           type: 'beat_submission',
           title: 'Beat Submitted',
           message: `Your beat "${metadata.title}" has been submitted and is pending approval.`,
           link: '/dashboard/creator/my-beats'
         });

         // Notify admin
         await supabase.from('admin_notifications').insert({
           type: 'beat_submission',
           title: 'New Beat Submission',
           message: `A new beat "${metadata.title}" has been submitted by ${profile?.display_name || user.email}.`,
           link: '/admin/beats'
         });
      }

      // 4. Update beat_licenses
      if (beatId) {
        // First delete existing licenses if editing
        if (editId) {
          await supabase.from('beat_licenses').delete().eq('beat_id', beatId);
        }

        // Insert new license selections
        const licenseInserts = selectedIds.map((licenseTypeId) => {
          const license = availableLicenses.find((l: any) => l.id === licenseTypeId);
          const defaultPrice = typeof license?.default_price === 'number' ? license.default_price : 0;
          const price = typeof selectedLicenses[licenseTypeId]?.price === 'number' ? selectedLicenses[licenseTypeId].price : defaultPrice;
          return {
            beat_id: beatId,
            license_type_id: licenseTypeId,
            price,
            is_active: true
          };
        });

        if (licenseInserts.length > 0) {
          const { error: lError } = await supabase.from('beat_licenses').insert(licenseInserts);
          if (lError) throw lError;
        }
      }

      router.push('/dashboard/creator/my-beats');
      router.refresh();

    } catch (err: any) {
      console.error('Upload/Update error:', err);
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
     return (
        <div className="pt-[100px] flex justify-center">
           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
     );
  }

  if (accessDenied) {
    return <AccessDenied />;
  }

  return (
    <main className="pt-[80px] max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{editId ? 'Edit Beat' : 'Upload New Beat'}</h1>
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => setStep(1)}
              className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-zinc-900 text-zinc-500'}`}
            >
              1. Audio
            </button>
            <span className="text-zinc-600">→</span>
            <button 
              onClick={() => { if (files.audio || existingUrls.audio) setStep(2); }}
              className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-zinc-900 text-zinc-500'}`}
            >
              2. Details
            </button>
            <span className="text-zinc-600">→</span>
            <button 
               onClick={() => { if ((files.audio || existingUrls.audio) && metadata.title) setStep(3); }}
               className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-primary text-white' : 'bg-zinc-900 text-zinc-500'}`}
            >
              3. Pricing
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {step === 1 && (
          <div 
            onClick={() => audioInputRef.current?.click()}
            className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:bg-zinc-900/50 transition-colors cursor-pointer"
          >
            <input 
              type="file" 
              ref={audioInputRef} 
              className="hidden" 
              accept="audio/*" 
              onChange={(e) => handleFileChange(e, 'audio')}
            />
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              {files.audio || existingUrls.audio ? <CheckCircle size={32} className="text-green-500" /> : <UploadCloud size={32} className="text-primary" />}
            </div>
            <h3 className="text-xl font-bold mb-2">
              {files.audio ? files.audio.name : (existingUrls.audio ? 'Audio file uploaded (Click to change)' : 'Drag and drop your audio files')}
            </h3>
            <p className="text-zinc-400 text-sm mb-6">WAV, MP3, or ZIP (Max 200MB)</p>
            <button 
              className="px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-red-600 transition-colors"
            >
              {files.audio || existingUrls.audio ? 'Change File' : 'Select Files'}
            </button>
            {(files.audio || existingUrls.audio) && (
               <button 
                 onClick={(e) => { e.stopPropagation(); setStep(2); }}
                 className="mt-4 text-primary hover:underline"
                 type="button"
               >
                 Continue to Details →
               </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => coverInputRef.current?.click()}
                className="bg-zinc-900 border border-zinc-800 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-zinc-700 relative overflow-hidden"
              >
                <input 
                  type="file" 
                  ref={coverInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, 'cover')}
                />
                {files.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(files.cover)} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : existingUrls.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={existingUrls.cover} alt="Current Cover" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon size={32} className="text-zinc-600 mb-2" />
                    <span className="text-sm text-zinc-500">Upload Artwork</span>
                  </>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Title</label>
                  <input 
                    type="text" 
                    value={metadata.title}
                    onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" 
                    placeholder="Enter beat title" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">BPM</label>
                  <input 
                    type="number" 
                    value={metadata.bpm}
                    onChange={(e) => setMetadata({...metadata, bpm: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" 
                    placeholder="140" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Key</label>
                  <input 
                    type="text" 
                    value={metadata.key}
                    onChange={(e) => setMetadata({...metadata, key: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" 
                    placeholder="C Minor" 
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Description</label>
              <textarea 
                value={metadata.description}
                onChange={(e) => setMetadata({...metadata, description: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none resize-none"
                placeholder="Tell us about your beat..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tags</label>
              <input 
                type="text" 
                value={metadata.tags}
                onChange={(e) => setMetadata({...metadata, tags: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:border-primary outline-none" 
                placeholder="Afrobeats, Amapiano, Chill..." 
              />
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="text-zinc-500 hover:text-white">Back</button>
              <button 
                onClick={() => setStep(3)} 
                disabled={!metadata.title || (!files.cover && !existingUrls.cover)}
                className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2">
                    <DollarSign size={20} className="text-primary" /> 
                    Licensing & Pricing
                  </h3>
                  <p className="text-zinc-500 text-xs font-medium">Select which licenses you want to offer for this beat</p>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">
                    Marketplace commission: {commissionPercent.toFixed(2)}%
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-zinc-800">
                  <input 
                    type="checkbox" 
                    id="free-beat"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-700 bg-black text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="free-beat" className="text-xs font-black uppercase tracking-widest text-zinc-300 cursor-pointer">
                    Free Download
                  </label>
                </div>
              </div>

              {!isFree ? (
                <div className="space-y-4">
                  {availableLicenses.map((license) => (
                    <div 
                      key={license.id}
                      className={`p-5 rounded-2xl border-2 transition-all ${
                        selectedLicenses[license.id]?.enabled 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'bg-black/40 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleLicense(license.id)}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                              selectedLicenses[license.id]?.enabled 
                                ? 'bg-primary text-black' 
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            <CheckCircle size={20} strokeWidth={3} />
                          </button>
                          
                          <div>
                            <h4 className={`font-black uppercase text-xs tracking-widest ${selectedLicenses[license.id]?.enabled ? 'text-white' : 'text-zinc-500'}`}>
                              {license.name}
                            </h4>
                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                              {license.features?.join(' • ')}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-2">
                              You earn: {formatPrice(
                                (Number(selectedLicenses[license.id]?.price ?? license.default_price) || 0) * (1 - commissionPercent / 100),
                                currency,
                                exchangeRates,
                                true
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="w-32 relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">
                            {formatPrice(0, currency, exchangeRates).replace(/[0-9.,\s]/g, '')}
                          </div>
                          <input 
                            type="number"
                            value={selectedLicenses[license.id]?.price || license.default_price}
                            onChange={(e) => handlePriceChange(license.id, e.target.value)}
                            disabled={!selectedLicenses[license.id]?.enabled}
                            className={`w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-8 pr-3 text-sm font-bold text-white focus:border-primary outline-none transition-all ${
                              !selectedLicenses[license.id]?.enabled ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                    <Music size={32} />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-tight mb-2">Free Download Enabled</h4>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                    Users will be able to obtain this beat for free under the selected free license. Receipts and license certificates will still be available.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={16} className="text-yellow-500" /> 
                Preview Settings
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                {['15', '30', '60'].map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setMetadata({...metadata, previewDuration: duration})}
                    className={`py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
                      metadata.previewDuration === duration 
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
                        : 'bg-zinc-800 text-zinc-500 hover:text-white border border-transparent hover:border-zinc-700'
                    }`}
                  >
                    {duration}s
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 font-medium mt-4 text-center">
                Set the maximum preview duration for non-purchased listens.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setStep(2)} 
                className="flex-1 py-4 bg-zinc-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-all"
              >
                Back
              </button>
              <button 
                type="button"
                onClick={handleUpload}
                disabled={loading}
                className="flex-[2] py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-primary/25 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    {editId ? 'Saving Changes...' : 'Publishing Beat...'}
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {editId ? 'Update Beat' : 'Publish Beat'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
    </main>
  );
}

export default function UploadBeatPage() {
  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <Suspense fallback={<div className="pt-[100px] flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}>
        <UploadBeatContent />
      </Suspense>
    </div>
  );
}
