"use client";

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Layout, Music, Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import StatusModal from '@/components/StatusModal';
import Image from 'next/image';
import clsx from 'clsx';

interface Beat {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
}

interface SectionConfig {
  id: string;
  title: string;
  subtitle?: string;
  beatIds: string[];
}

export default function AdminContentManagementPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sections, setSections] = useState<SectionConfig[]>([
    { id: 'mixed', title: 'Mixed for you', subtitle: 'FOR FEELING GOOD', beatIds: [] },
    { id: 'quick', title: 'Quick picks', beatIds: [] },
    { id: 'suggested', title: 'Audios you might like', beatIds: [] }
  ]);

  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'loading' | 'auth',
    title: '',
    message: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      router.push('/');
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        // 1. Fetch all beats for selection
        const { data: beatsData } = await supabase
          .from('beats')
          .select('id, title, profiles(display_name), cover_url')
          .limit(100);

        if (beatsData) {
          setBeats(beatsData.map((b: any) => ({
            id: b.id,
            title: b.title,
            artist: b.profiles?.display_name || 'Unknown',
            coverUrl: b.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop'
          })));
        }

        // 2. Fetch current section config
        const { data: configData } = await supabase
          .from('platform_settings')
          .select('*')
          .eq('key', 'homepage_sections')
          .single();

        if (configData?.value) {
          setSections(configData.value);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchData();
  }, [user, profile, authLoading, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'homepage_sections',
          value: sections,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Saved',
        message: 'Homepage sections updated successfully.'
      });
    } catch (err) {
      console.error('Error saving:', err);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to save configuration.'
      });
    } finally {
      setSaving(false);
    }
  };

  const addBeatToSection = (sectionId: string, beatId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId && !s.beatIds.includes(beatId)) {
        return { ...s, beatIds: [...s.beatIds, beatId] };
      }
      return s;
    }));
  };

  const removeBeatFromSection = (sectionId: string, beatId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return { ...s, beatIds: s.beatIds.filter(id => id !== beatId) };
      }
      return s;
    }));
  };

  const filteredBeats = beats.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[100px] max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Content Management</h1>
            <p className="text-zinc-500">Arrange beats in frontend sections</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Section Editors */}
          <div className="lg:col-span-2 space-y-8">
            {sections.map((section) => (
              <div key={section.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Layout size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{section.title}</h2>
                    {section.subtitle && <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{section.subtitle}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  {section.beatIds.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600">
                      No beats assigned to this section
                    </div>
                  )}
                  {section.beatIds.map((bid) => {
                    const beat = beats.find(b => b.id === bid);
                    if (!beat) return null;
                    return (
                      <div key={bid} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-3 rounded-xl group">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white truncate">{beat.title}</h4>
                          <p className="text-xs text-zinc-500 truncate">{beat.artist}</p>
                        </div>
                        <button 
                          onClick={() => removeBeatFromSection(section.id, bid)}
                          className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Info Box */}
            <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                <Info size={20} />
              </div>
              <div>
                <h4 className="font-bold text-blue-500 mb-1">Automated Sections</h4>
                <p className="text-sm text-zinc-400">
                  The <span className="text-white font-medium">Forgotten Favourites</span> section is automatically generated based on user activity (listened {'>'}3 times or favorited, appearing after 2 days of inactivity).
                </p>
              </div>
            </div>
          </div>

          {/* Right: Beat Picker */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-28">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Music size={20} className="text-primary" />
                Select Beats
              </h3>
              
              <div className="relative mb-6">
                <input 
                  type="text" 
                  placeholder="Search beats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 hide-scrollbar">
                {filteredBeats.map((beat) => (
                  <div key={beat.id} className="bg-black/40 border border-zinc-800/50 p-3 rounded-xl hover:border-zinc-700 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{beat.title}</h4>
                        <p className="text-[10px] text-zinc-500 truncate">{beat.artist}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {sections.map(s => (
                        <button
                          key={s.id}
                          onClick={() => addBeatToSection(s.id, beat.id)}
                          disabled={s.beatIds.includes(beat.id)}
                          className={clsx(
                            "text-[9px] font-bold py-1.5 rounded-lg border transition-all",
                            s.beatIds.includes(beat.id)
                              ? "bg-green-500/10 border-green-500/50 text-green-500"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-primary hover:text-primary"
                          )}
                        >
                          {s.beatIds.includes(beat.id) ? 'Added' : s.id.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
    </div>
  );
}

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={clsx("lucide lucide-loader-2", className)}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const Info = ({ size }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);
