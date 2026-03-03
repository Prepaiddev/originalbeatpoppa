"use client";

import Header from '@/components/Header';
import { Camera, Save, Loader2, Sparkles, Instagram, Twitter, Youtube, Globe, CheckCircle2, AlertCircle, Trash2, Plus, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import CreatorUpgradeModal from '@/components/CreatorUpgradeModal';
import ImageCropModal from '@/components/ImageCropModal';
import StatusModal from '@/components/StatusModal';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile, signOut } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [status, setStatus] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'loading';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'loading',
    title: '',
    message: ''
  });
  
  // Crop Modal State
  const [cropModal, setCropModal] = useState<{
    isOpen: boolean;
    imageSrc: string;
    type: 'avatar' | 'cover';
    aspect: number;
  }>({
    isOpen: false,
    imageSrc: '',
    type: 'avatar',
    aspect: 1
  });

  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    location: '',
    bio: '',
    website: '',
    avatar_url: '',
    cover_url: '',
    social_links: {
      instagram: '',
      twitter: '',
      youtube: ''
    } as Record<string, string>,
    genres: [] as string[]
  });
  
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFullProfile = async () => {
      if (profile && user) {
        // Fetch creator profile if exists
        const { data: creatorData } = await supabase
          .from('creator_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (isMounted) {
          setFormData({
            display_name: profile.display_name || '',
            username: profile.username || '',
            location: profile.location || '',
            bio: profile.bio || '',
            website: profile.website || '',
            avatar_url: profile.avatar_url || '',
            cover_url: creatorData?.cover_url || profile.cover_url || '',
            social_links: profile.social_links || { instagram: '', twitter: '', youtube: '' },
            genres: creatorData?.genres || []
          });
        }
      }
    };

    fetchFullProfile();
    return () => { isMounted = false; };
  }, [profile?.id, user?.id]);

  // Check username availability
  useEffect(() => {
    let isMounted = true;
    const checkUsername = async () => {
      if (!formData.username || formData.username === profile?.username) {
        if (isMounted) setUsernameStatus('idle');
        return;
      }

      if (formData.username.length < 3) {
        if (isMounted) setUsernameStatus('idle');
        return;
      }

      if (isMounted) setUsernameStatus('checking');
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', formData.username.toLowerCase())
        .single();

      if (!isMounted) return;

      if (error && error.code === 'PGRST116') { // Not found
        setUsernameStatus('available');
      } else {
        setUsernameStatus('taken');
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.username, profile?.username]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    if (!e.target.files || !e.target.files.length || !user) return;

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropModal({
        isOpen: true,
        imageSrc: reader.result?.toString() || '',
        type,
        aspect: type === 'avatar' ? 1 : 16 / 5, // Wider aspect for cover
      });
    });
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!user) return;
    setCropModal(prev => ({ ...prev, isOpen: false }));
    setUploading(true);

    const type = cropModal.type;
    
    try {
      const fileName = `${user.id}-${type}-${Date.now()}.jpg`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('beats')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('beats')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [`${type}_url`]: publicUrl }));
      
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      alert(`Error uploading ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (usernameStatus === 'taken') {
      setStatus({
        isOpen: true,
        type: 'error',
        title: 'Username Taken',
        message: 'That username is already being used. Please try another one.'
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          username: formData.username.toLowerCase(),
          location: formData.location,
          bio: formData.bio,
          website: formData.website,
          avatar_url: formData.avatar_url,
          social_links: formData.social_links
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // 2. If user is creator, update creator_profiles table
      if (profile?.role === 'creator') {
        const { error: creatorError } = await supabase
          .from('creator_profiles')
          .update({
            cover_url: formData.cover_url,
            genres: formData.genres,
          })
          .eq('user_id', user.id);

        if (creatorError) {
          console.error('Creator profile update error:', creatorError);
          throw creatorError;
        }
      }

      await refreshProfile(); // Refresh global state
      
      setStatus({
        isOpen: true,
        type: 'success',
        title: 'Profile Updated!',
        message: 'Your profile has been successfully saved.'
      });

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setStatus({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Something went wrong while saving your profile. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Delete user record from profiles (should cascade to other tables)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;

      // 2. Sign out the user
      await signOut();
      
      setStatus({
        isOpen: true,
        type: 'success',
        title: 'Account Deleted',
        message: 'Your account has been successfully removed.'
      });

      // 3. Redirect to home
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error: any) {
      console.error('Error deleting account:', error);
      setStatus({
        isOpen: true,
        type: 'error',
        title: 'Deletion Failed',
        message: error.message || 'We could not delete your account. You may need to sign out and sign back in before trying again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[80px] max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-12">
          {/* 1. Media Section */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Camera size={20} className="text-primary" />
              Profile Branding
            </h2>
            
            <div 
              className="relative w-full h-48 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 group cursor-pointer shadow-inner"
              onClick={() => coverInputRef.current?.click()}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all z-10">
                <Camera size={32} className="text-white mb-2" />
                <span className="text-white text-sm font-medium">Change Cover Photo</span>
                <span className="text-white/50 text-[10px] mt-1 uppercase tracking-widest font-bold">Recommended: 1600x500</span>
              </div>
              <Image 
                src={formData.cover_url || "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1200&auto=format&fit=crop"} 
                alt="Cover" 
                fill 
                className="object-cover"
                unoptimized={true}
              />
              <input 
                type="file" 
                ref={coverInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'cover')}
              />
            </div>

            <div className="flex justify-center -mt-20 relative z-10">
              <div 
                className="relative w-36 h-36 rounded-full border-4 border-black bg-zinc-800 overflow-hidden group cursor-pointer shadow-2xl"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image 
                  src={formData.avatar_url || "https://placehold.co/200x200/101010/ffffff?text=User"} 
                  alt="Avatar" 
                  fill 
                  className="object-cover"
                  unoptimized={true}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-all">
                  {uploading ? (
                    <Loader2 className="animate-spin text-white" size={28} />
                  ) : (
                    <>
                      <Camera size={28} className="text-white mb-1" />
                      <span className="text-white text-[10px] font-bold uppercase">Change</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'avatar')}
                />
              </div>
            </div>
          </section>

          {/* Account Type Status */}
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Account Type</h3>
                <p className="text-sm text-zinc-400">
                  Currently active as a <span className="text-primary font-bold uppercase tracking-wider">{profile?.role || 'Buyer'}</span>
                </p>
              </div>
            </div>
            
            {profile?.role === 'buyer' && (
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="w-full md:w-auto px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group relative z-10"
              >
                Upgrade to Creator
                <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
              </button>
            )}
          </div>

          <ImageCropModal
            isOpen={cropModal.isOpen}
            onClose={() => setCropModal(prev => ({ ...prev, isOpen: false }))}
            imageSrc={cropModal.imageSrc}
            aspect={cropModal.aspect}
            onCropComplete={handleCropComplete}
            title={`Crop ${cropModal.type === 'avatar' ? 'Profile Photo' : 'Cover Photo'}`}
          />

          <CreatorUpgradeModal 
             isOpen={showUpgradeModal} 
             onClose={() => setShowUpgradeModal(false)} 
          />

          {/* 2. Basic Info Section */}
          <section className="space-y-6">
            <h2 className="text-xl font-bold">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                  Display Name <span className="text-primary">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.display_name || ''}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:border-primary outline-none transition-colors" 
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                  Username / Handle <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">@</div>
                  <input 
                    type="text" 
                    required
                    value={formData.username || ''}
                    onChange={(e) => setFormData({...formData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '')})}
                    className={`w-full bg-zinc-900 border ${
                      usernameStatus === 'available' ? 'border-green-500/50' : 
                      usernameStatus === 'taken' ? 'border-red-500/50' : 'border-zinc-800'
                    } rounded-xl p-4 pl-8 text-white focus:border-primary outline-none transition-colors`} 
                    placeholder="username"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && <Loader2 size={18} className="animate-spin text-zinc-500" />}
                    {usernameStatus === 'available' && <CheckCircle2 size={18} className="text-green-500" />}
                    {usernameStatus === 'taken' && <AlertCircle size={18} className="text-red-500" />}
                  </div>
                </div>
                {usernameStatus === 'taken' && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold uppercase tracking-tighter">This username is already taken</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Location</label>
                <input 
                  type="text" 
                  value={formData.location || ''}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:border-primary outline-none transition-colors" 
                  placeholder="e.g. Lagos, Nigeria"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Bio</label>
              <textarea 
                rows={4} 
                value={formData.bio || ''}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:border-primary outline-none resize-none transition-colors"
                placeholder="Tell the world about yourself..."
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Personal Website</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="url" 
                  placeholder="https://yourwebsite.com" 
                  value={formData.website || ''}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 pl-12 text-white focus:border-primary outline-none transition-colors" 
                />
              </div>
            </div>
          </section>

          {/* 3. Social Links Section - Creator Only */}
          {profile?.role === 'creator' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Social Media</h2>
                <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-1 rounded">Creator Feature</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Instagram username" 
                    value={formData.social_links?.instagram || ''}
                    onChange={(e) => setFormData({
                      ...formData, 
                      social_links: { ...(formData.social_links || {}), instagram: e.target.value }
                    })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 pl-12 text-white focus:border-primary outline-none transition-colors" 
                  />
                </div>
                <div className="relative">
                  <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Twitter handle" 
                    value={formData.social_links?.twitter || ''}
                    onChange={(e) => setFormData({
                      ...formData, 
                      social_links: { ...(formData.social_links || {}), twitter: e.target.value }
                    })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 pl-12 text-white focus:border-primary outline-none transition-colors" 
                  />
                </div>
                <div className="relative">
                  <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="YouTube channel" 
                    value={formData.social_links?.youtube || ''}
                    onChange={(e) => setFormData({
                      ...formData, 
                      social_links: { ...(formData.social_links || {}), youtube: e.target.value }
                    })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 pl-12 text-white focus:border-primary outline-none transition-colors" 
                  />
                </div>
              </div>
            </section>
          )}

          {/* 4. Creator Specific Section */}
          {profile?.role === 'creator' && (
            <section className="space-y-6 p-8 bg-zinc-900/30 border border-zinc-800 rounded-3xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <h2 className="text-xl font-bold">Creator Settings</h2>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-4 tracking-widest">Specialized Genres</label>
                <div className="flex flex-wrap gap-2">
                  {['Afrobeats', 'Amapiano', 'Hip Hop', 'R&B', 'Trap', 'Dancehall', 'Reggaeton'].map((genre) => {
                    const isSelected = formData.genres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormData({ ...formData, genres: formData.genres.filter(g => g !== genre) });
                          } else {
                            setFormData({ ...formData, genres: [...formData.genres, genre] });
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                          isSelected 
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {genre}
                        {isSelected && <CheckCircle2 size={14} className="inline ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Danger Zone */}
          <section className="pt-12 border-t border-zinc-800/50">
            <h2 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-2">
              <Trash2 size={20} />
              Danger Zone
            </h2>
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white mb-1">Delete Account</h3>
                <p className="text-sm text-zinc-500">Permanently remove your account and all data. This cannot be undone.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-2 border border-red-500/50 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all"
              >
                Delete
              </button>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="sticky bottom-8 left-0 right-0 z-40 px-4 md:px-0">
            <div className="max-w-2xl mx-auto bg-black/80 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
              <button 
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 text-zinc-400 font-bold hover:text-white transition-colors"
              >
                Discard Changes
              </button>
              <button 
                type="submit"
                disabled={loading || uploading || usernameStatus === 'taken'}
                className="flex-1 md:flex-none px-12 py-3 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <StatusModal
          isOpen={status.isOpen}
          onClose={() => setStatus({ ...status, isOpen: false })}
          type={status.type}
          title={status.title}
          message={status.message}
          autoClose={status.type === 'success'}
        />

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account?"
          message="This will permanently delete your profile and all associated data. This action cannot be undone."
          confirmText="Yes, Delete My Account"
          variant="danger"
        />
      </main>
    </div>
  );
}
