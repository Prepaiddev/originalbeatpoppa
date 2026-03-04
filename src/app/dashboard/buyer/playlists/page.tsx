"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlaylistStore, Playlist } from '@/store/usePlaylistStore';
import Header from '@/components/Header';
import { Music, Plus, Trash2, ExternalLink, Globe, Lock, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import clsx from 'clsx';

export default function BuyerPlaylistsPage() {
  const { user } = useAuthStore();
  const { playlists, loading, fetchPlaylists, deletePlaylist, createPlaylist } = usePlaylistStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPlaylists(user.id);
    }
  }, [user, fetchPlaylists]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;
    
    const p = await createPlaylist(user.id, newTitle, newDescription, isPublic, coverFile || undefined);
    if (p) {
      setNewTitle('');
      setNewDescription('');
      setCoverFile(null);
      setCoverPreview(null);
      setShowCreate(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      await deletePlaylist(id);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <Header />
      
      <main className="pt-[100px] max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black mb-2">My Playlists</h1>
            <p className="text-zinc-400">Organize your favorite beats into collections.</p>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors self-start"
          >
            <Plus size={20} />
            New Playlist
          </button>
        </div>

        {showCreate && (
          <div className="mb-12 p-8 bg-zinc-900 border border-zinc-800 rounded-3xl animate-in slide-in-from-top-4 duration-300 shadow-2xl">
            <h3 className="text-2xl font-black mb-8">Create New Playlist</h3>
            <form onSubmit={handleCreate} className="space-y-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Cover Upload */}
                <div className="w-full lg:w-1/3">
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-3">Cover Art</label>
                  <div 
                    onClick={() => document.getElementById('playlist-cover')?.click()}
                    className="aspect-square bg-black border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-zinc-900/50 transition-all overflow-hidden group relative"
                  >
                    {coverPreview ? (
                      <>
                        <Image src={coverPreview} alt="Preview" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus className="text-white" size={32} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Music size={40} className="text-zinc-700 mb-3" />
                        <span className="text-sm font-bold text-zinc-500">Upload Image</span>
                      </>
                    )}
                    <input 
                      id="playlist-cover"
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-6">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Playlist Title</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Afrobeats 2024 Hits"
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-4 text-white focus:border-primary outline-none transition-all text-lg font-bold"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Description (Optional)</label>
                    <textarea 
                      placeholder="What's this playlist about?"
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-4 text-white focus:border-primary outline-none transition-all min-h-[120px] resize-none"
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Privacy</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setIsPublic(true)}
                          className={clsx(
                            "flex-1 py-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all",
                            isPublic ? "bg-primary/10 border-primary text-primary" : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700"
                          )}
                        >
                          <Globe size={16} /> Public
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsPublic(false)}
                          className={clsx(
                            "flex-1 py-3.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all",
                            !isPublic ? "bg-primary/10 border-primary text-primary" : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700"
                          )}
                        >
                          <Lock size={16} /> Private
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-zinc-800">
                <button 
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-8 py-4 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-12 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Music size={40} className="text-zinc-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Playlists Yet</h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-8">
              Start organizing your favorite beats. You can add any beat to a playlist from its menu.
            </p>
            <button 
              onClick={() => setShowCreate(true)}
              className="px-8 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Create Your First Playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col group hover:border-primary/50 transition-colors">
                <div className="relative h-48 w-full">
                  {playlist.cover_url ? (
                    <Image src={playlist.cover_url} alt={playlist.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <Music size={48} className="text-zinc-700 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white line-clamp-1">{playlist.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      {playlist.is_public ? <Globe size={12} /> : <Lock size={12} />}
                      {playlist.beats_count || 0} Beats
                    </div>
                  </div>
                  <Link 
                    href={`/playlist/${playlist.id}`}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                  >
                    <Play size={24} fill="white" className="ml-1" />
                  </Link>
                </div>
                
                <div className="p-5 flex items-center gap-2">
                  <Link 
                    href={`/playlist/${playlist.id}`}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} />
                    View Details
                  </Link>
                  <button 
                    onClick={() => handleDelete(playlist.id)}
                    className="p-2.5 bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 text-zinc-400 rounded-xl transition-all"
                    title="Delete Playlist"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
