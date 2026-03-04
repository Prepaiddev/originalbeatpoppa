"use client";

import Header from '@/components/Header';
import { Edit, Trash2, Play, Pause, Plus } from 'lucide-react';
import Image from 'next/image';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function MyBeatsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  
  const [beats, setBeats] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchMyBeats() {
      try {
        const { data, error } = await supabase
          .from('beats')
          .select('*, order_items(count)')
          .eq('artist_id', user!.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setBeats(data.map((b: any) => ({
            id: b.id,
            title: b.title,
            artist: 'Me', // Or user display name
            audioUrl: b.audio_url,
            coverUrl: b.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
            price: b.price,
            bpm: b.bpm,
            key: b.key,
            genre: b.genre,
            tags: b.tags,
            plays: b.plays,
            sales: b.order_items?.[0]?.count || 0
          })));
        }
      } catch (error) {
        console.error('Error fetching my beats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyBeats();
  }, [user?.id]);

  const handleDelete = async (beatId: string) => {
    try {
      const { error } = await supabase
        .from('beats')
        .delete()
        .eq('id', beatId);

      if (error) throw error;

      setBeats(beats.filter(b => b.id !== beatId));
    } catch (error) {
      console.error('Error deleting beat:', error);
      alert('Failed to delete beat');
    }
  };

  const confirmDelete = (beatId: string) => {
    setDeleteId(beatId);
  };

  const handlePlay = (beat: Track) => {
    if (currentTrack?.id === beat.id && isPlaying) {
      pause();
    } else {
      play(beat);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pb-24">
        <Header />
        <main className="pt-[80px] max-w-7xl mx-auto px-4 flex justify-center">
           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      <main className="pt-[80px] max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Beats</h1>
          <Link 
            href="/dashboard/creator/upload" 
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-600 transition-colors"
          >
            <Plus size={18} /> Upload New
          </Link>
        </div>
        
        {beats.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-xl border border-zinc-800">
            <p className="text-zinc-500 mb-4">You haven't uploaded any beats yet.</p>
            <Link 
              href="/dashboard/creator/upload" 
              className="text-primary hover:underline font-bold"
            >
              Upload your first beat
            </Link>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs hidden md:table-header-group">
                <tr>
                  <th className="px-6 py-4 font-bold">Track</th>
                  <th className="px-6 py-4 font-bold">Price</th>
                  <th className="px-6 py-4 font-bold">Plays</th>
                  <th className="px-6 py-4 font-bold">Sales</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {beats.map((beat) => (
                  <tr key={beat.id} className="hover:bg-zinc-800/50 transition-colors flex flex-col md:table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 group cursor-pointer bg-zinc-800" 
                          onClick={() => handlePlay(beat)}
                        >
                          <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover" />
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === beat.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                             {currentTrack?.id === beat.id && isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-white text-base">{beat.title}</p>
                          <p className="text-xs text-zinc-500">{beat.bpm} BPM • {beat.key}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2 md:py-4 flex justify-between md:table-cell">
                      <span className="md:hidden text-zinc-500">Price:</span>
                      <span className="text-zinc-300 font-medium">{beat.price === 0 ? 'Free' : `$${beat.price}`}</span>
                    </td>
                    <td className="px-6 py-2 md:py-4 flex justify-between md:table-cell">
                      <span className="md:hidden text-zinc-500">Plays:</span>
                      <span className="text-zinc-400">{beat.plays || 0}</span>
                    </td>
                    <td className="px-6 py-2 md:py-4 flex justify-between md:table-cell">
                      <span className="md:hidden text-zinc-500">Sales:</span>
                      <span className="text-zinc-400">{beat.sales || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => router.push(`/dashboard/creator/upload?id=${beat.id}`)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => confirmDelete(beat.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <ConfirmationModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteId && handleDelete(deleteId)}
          title="Delete Beat"
          message="Are you sure you want to delete this beat? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
        />
      </main>
    </div>
  );
}
