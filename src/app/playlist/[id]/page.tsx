"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import { Music, Play, Pause, ChevronLeft, Trash2, Globe, Lock, Share2, MoreVertical, Edit2, X, Camera, Plus, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { usePlaylistStore } from '@/store/usePlaylistStore';
import clsx from 'clsx';

export default function PlaylistDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  const { removeBeatFromPlaylist, updatePlaylist, deletePlaylist } = usePlaylistStore();
  
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [beats, setBeats] = useState<Track[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchPlaylist() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          profiles:creator_id(display_name, username, avatar_url),
          playlist_beats(
            beat_id,
            position,
            beats(
              *,
              profiles(display_name, username, is_verified)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setPlaylist(data);
      setIsOwner(user?.id === data.creator_id);
      
      // Initialize edit state
      setEditTitle(data.title);
      setEditDescription(data.description || '');
      setEditIsPublic(data.is_public);
      setEditCoverPreview(data.cover_url);

      const mappedBeats = data.playlist_beats
        .sort((a: any, b: any) => a.position - b.position)
        .map((pb: any) => ({
          id: pb.beats.id,
          title: pb.beats.title,
          artist: pb.beats.profiles?.display_name || 'Unknown Producer',
          username: pb.beats.profiles?.username,
          isVerified: pb.beats.profiles?.is_verified,
          audioUrl: pb.beats.audio_url,
          coverUrl: pb.beats.cover_url || 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=400&auto=format&fit=crop',
          price: pb.beats.price,
          bpm: pb.beats.bpm,
          key: pb.beats.key,
          genre: pb.beats.genre,
          plays: pb.beats.plays
        }));
      setBeats(mappedBeats);
      setLoading(false);
    }

    fetchPlaylist();
  }, [id, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isUpdating) return;

    setIsUpdating(true);
    const success = await updatePlaylist(
      id as string, 
      { 
        title: editTitle, 
        description: editDescription, 
        is_public: editIsPublic 
      },
      editCoverFile || undefined
    );

    if (success) {
      // Refresh local state
      setPlaylist(prev => ({
        ...prev,
        title: editTitle,
        description: editDescription,
        is_public: editIsPublic,
        cover_url: editCoverPreview
      }));
      setIsEditModalOpen(false);
    }
    setIsUpdating(false);
  };

  const handleDeletePlaylist = async () => {
    if (window.confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
      await deletePlaylist(id as string);
      router.push('/dashboard/buyer/playlists');
    }
  };

  const handlePlayAll = () => {
    if (beats.length > 0) {
      play(beats[0], beats);
    }
  };

  const handlePlayBeat = (beat: Track) => {
    if (currentTrack?.id === beat.id && isPlaying) {
      pause();
    } else {
      play(beat, beats);
    }
  };

  const handleRemoveBeat = async (beatId: string) => {
    if (!id) return;
    const success = await removeBeatFromPlaylist(id as string, beatId);
    if (success) {
      setBeats(beats.filter(b => b.id !== beatId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">Playlist Not Found</h1>
        <Link href="/explore" className="text-primary hover:underline">Go back to Explore</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-32">
      <Header />
      
      {/* Hero Header */}
      <div className="relative h-[40vh] min-h-[300px] w-full">
        {playlist.cover_url ? (
          <Image 
            src={playlist.cover_url} 
            alt={playlist.title} 
            fill 
            className="object-cover opacity-30"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900 opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 max-w-7xl mx-auto">
          <Link 
            href="/dashboard/buyer/playlists" 
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors text-sm font-bold"
          >
            <ChevronLeft size={16} />
            Back to My Playlists
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-800 flex-shrink-0 bg-zinc-800 flex items-center justify-center">
               {playlist.cover_url ? (
                 <Image 
                   src={playlist.cover_url} 
                   alt={playlist.title} 
                   fill 
                   className="object-cover" 
                 />
               ) : (
                 <Music size={64} className="text-zinc-700" />
               )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded uppercase font-black tracking-widest">
                  Playlist
                </span>
                {playlist.is_public ? (
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-black tracking-widest flex items-center gap-1">
                    <Globe size={10} /> Public
                  </span>
                ) : (
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase font-black tracking-widest flex items-center gap-1">
                    <Lock size={10} /> Private
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">{playlist.title}</h1>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full overflow-hidden relative border border-zinc-800">
                  <Image 
                    src={playlist.profiles?.avatar_url || "https://placehold.co/100x100"} 
                    alt={playlist.profiles?.display_name} 
                    fill 
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm text-white font-bold">
                    {playlist.profiles?.display_name} • {beats.length} tracks
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <button 
                  onClick={handlePlayAll}
                  className="px-8 py-4 bg-primary text-white font-black rounded-xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                >
                  <Play size={20} fill="currentColor" />
                  Play All
                </button>
                
                <button className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all">
                  <Share2 size={20} />
                </button>

                {isOwner && (
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"
                  >
                    <Edit2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 mt-12">
        {playlist.description && (
          <div className="mb-12">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">About this playlist</h3>
            <p className="text-zinc-400 max-w-3xl leading-relaxed">{playlist.description}</p>
          </div>
        )}

        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-sm">
          <div className="p-4 md:p-6 border-b border-zinc-800/50 grid grid-cols-[auto_1fr_auto] md:grid-cols-[40px_1fr_150px_100px_auto] gap-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest items-center">
            <div className="hidden md:block">#</div>
            <div>Title</div>
            <div className="hidden md:block">Genre</div>
            <div className="hidden md:block">BPM</div>
            <div className="text-right">Action</div>
          </div>

          {beats.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">
              <Music size={48} className="mx-auto mb-4 opacity-10" />
              <p>This playlist is empty.</p>
              <Link href="/explore" className="text-primary hover:underline mt-2 inline-block">Explore Beats</Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/30">
              {beats.map((beat, idx) => {
                const isCurrent = currentTrack?.id === beat.id;
                const isActive = isCurrent && isPlaying;
                return (
                  <div 
                    key={beat.id} 
                    className={clsx(
                      "group grid grid-cols-[auto_1fr_auto] md:grid-cols-[40px_1fr_150px_100px_auto] gap-4 p-4 md:p-6 hover:bg-white/[0.03] transition-all items-center",
                      isCurrent && "bg-primary/5"
                    )}
                  >
                    <div className="hidden md:flex items-center justify-center text-zinc-600 font-mono text-xs group-hover:hidden">
                      {idx + 1}
                    </div>
                    <div className="hidden group-hover:flex items-center justify-center">
                      <button onClick={() => handlePlayBeat(beat)}>
                        {isActive ? <Pause size={16} className="text-primary" fill="currentColor" /> : <Play size={16} className="text-primary" fill="currentColor" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 relative rounded overflow-hidden flex-shrink-0">
                        <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={clsx("font-bold text-sm truncate", isCurrent ? "text-primary" : "text-white")}>{beat.title}</h4>
                        <p className="text-[11px] text-zinc-500 truncate">{beat.artist}</p>
                      </div>
                    </div>

                    <div className="hidden md:block text-xs text-zinc-500 font-medium">{beat.genre}</div>
                    <div className="hidden md:block text-xs text-zinc-500 font-medium">{beat.bpm} BPM</div>

                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handlePlayBeat(beat)}
                        className="md:hidden p-2 text-zinc-400"
                      >
                        {isActive ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      
                      {isOwner && (
                        <button 
                          onClick={() => handleRemoveBeat(beat.id)}
                          className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                          title="Remove from playlist"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      
                      <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-black">Edit Playlist</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-8 space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Cover Art Edit */}
                <div className="w-full md:w-1/3">
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Cover Art</label>
                  <div 
                    onClick={() => document.getElementById('edit-playlist-cover')?.click()}
                    className="aspect-square bg-black border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-zinc-900/50 transition-all overflow-hidden group relative"
                  >
                    {editCoverPreview ? (
                      <>
                        <Image src={editCoverPreview} alt="Preview" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="text-white" size={32} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Music size={40} className="text-zinc-700 mb-3" />
                        <span className="text-sm font-bold text-zinc-500">Upload Image</span>
                      </>
                    )}
                    <input 
                      id="edit-playlist-cover"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Title</label>
                    <input 
                      required
                      type="text"
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all font-bold"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all min-h-[100px] resize-none text-sm"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Privacy</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setEditIsPublic(true)}
                        className={clsx(
                          "flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all",
                          editIsPublic ? "bg-primary/10 border-primary text-primary" : "bg-black border-zinc-800 text-zinc-500"
                        )}
                      >
                        <Globe size={16} /> Public
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditIsPublic(false)}
                        className={clsx(
                          "flex-1 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all",
                          !editIsPublic ? "bg-primary/10 border-primary text-primary" : "bg-black border-zinc-800 text-zinc-500"
                        )}
                      >
                        <Lock size={16} /> Private
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
                <button 
                  type="button"
                  onClick={handleDeletePlaylist}
                  className="text-red-500 text-sm font-bold hover:underline flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete Playlist
                </button>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="px-10 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUpdating && <Loader2 size={16} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
