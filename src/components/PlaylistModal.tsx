"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlaylistStore, Playlist } from '@/store/usePlaylistStore';
import { X, Plus, Music, Check, Loader2, Lock, Globe } from 'lucide-react';
import clsx from 'clsx';
import Image from 'next/image';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  beatId: string;
  beatTitle: string;
  beatCover: string;
}

export default function PlaylistModal({ isOpen, onClose, beatId, beatTitle, beatCover }: PlaylistModalProps) {
  const { user } = useAuthStore();
  const { playlists, loading, fetchPlaylists, createPlaylist, addBeatToPlaylist, removeBeatFromPlaylist, isBeatInPlaylist } = usePlaylistStore();
  
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [playlistStatuses, setPlaylistStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && user) {
      fetchPlaylists(user.id);
    }
  }, [isOpen, user, fetchPlaylists]);

  useEffect(() => {
    async function checkStatuses() {
      if (isOpen && playlists.length > 0) {
        const statuses: Record<string, boolean> = {};
        for (const playlist of playlists) {
          statuses[playlist.id] = await isBeatInPlaylist(playlist.id, beatId);
        }
        setPlaylistStatuses(statuses);
      }
    }
    checkStatuses();
  }, [isOpen, playlists, beatId, isBeatInPlaylist]);

  const handleTogglePlaylist = async (playlistId: string) => {
    const isIn = playlistStatuses[playlistId];
    if (isIn) {
      const success = await removeBeatFromPlaylist(playlistId, beatId);
      if (success) {
        setPlaylistStatuses(prev => ({ ...prev, [playlistId]: false }));
      }
    } else {
      const success = await addBeatToPlaylist(playlistId, beatId);
      if (success) {
        setPlaylistStatuses(prev => ({ ...prev, [playlistId]: true }));
      }
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    setCreating(true);
    const newPlaylist = await createPlaylist(user.id, newTitle, '', isPublic);
    if (newPlaylist) {
      await addBeatToPlaylist(newPlaylist.id, beatId);
      setPlaylistStatuses(prev => ({ ...prev, [newPlaylist.id]: true }));
      setNewTitle('');
      setShowCreate(false);
    }
    setCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-black">Add to Playlist</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Beat Preview */}
          <div className="flex items-center gap-4 mb-8 p-3 bg-black/40 rounded-2xl border border-zinc-800/50">
            <div className="w-12 h-12 relative rounded-lg overflow-hidden flex-shrink-0">
              <Image src={beatCover} alt={beatTitle} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">Adding to playlist</p>
              <h3 className="font-bold truncate">{beatTitle}</h3>
            </div>
          </div>

          {!showCreate ? (
            <>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : playlists.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <Music size={40} className="mx-auto mb-3 opacity-20" />
                    <p>No playlists found.</p>
                  </div>
                ) : (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleTogglePlaylist(playlist.id)}
                      className={clsx(
                        "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                        playlistStatuses[playlist.id] 
                          ? "bg-primary/10 border-primary/50" 
                          : "bg-zinc-800/30 border-transparent hover:bg-zinc-800 hover:border-zinc-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center text-zinc-500">
                          {playlist.cover_url ? (
                            <Image src={playlist.cover_url} alt={playlist.title} width={40} height={40} className="rounded" />
                          ) : (
                            <Music size={16} />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm truncate max-w-[200px]">{playlist.title}</p>
                          <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                            {playlist.is_public ? <Globe size={10} /> : <Lock size={10} />}
                            {playlist.beats_count || 0} tracks
                          </p>
                        </div>
                      </div>
                      <div className={clsx(
                        "w-5 h-5 rounded flex items-center justify-center border transition-all",
                        playlistStatuses[playlist.id] ? "bg-primary border-primary text-white" : "border-zinc-700"
                      )}>
                        {playlistStatuses[playlist.id] && <Check size={12} strokeWidth={4} />}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button 
                onClick={() => setShowCreate(true)}
                className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-primary transition-all group"
              >
                <Plus size={20} className="group-hover:text-primary" />
                <span className="font-bold">Create New Playlist</span>
              </button>
            </>
          ) : (
            <form onSubmit={handleCreatePlaylist} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Playlist Title</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  placeholder="e.g. Smooth R&B Vibes"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-zinc-800">
                <div>
                  <p className="font-bold text-sm">Public Playlist</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Visible to everyone</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={clsx(
                    "w-12 h-6 rounded-full relative transition-colors",
                    isPublic ? "bg-primary" : "bg-zinc-800"
                  )}
                >
                  <div className={clsx(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                    isPublic ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="flex-[2] py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="animate-spin h-5 w-5" /> : "Create & Add"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
