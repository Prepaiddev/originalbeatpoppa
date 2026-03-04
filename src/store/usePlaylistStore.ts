import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

export interface Playlist {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  cover_url: string;
  is_public: boolean;
  created_at: string;
  beats_count?: number;
}

interface PlaylistState {
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  
  fetchPlaylists: (userId: string) => Promise<void>;
  createPlaylist: (userId: string, title: string, description?: string, isPublic?: boolean, coverFile?: File) => Promise<Playlist | null>;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>, coverFile?: File) => Promise<boolean>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addBeatToPlaylist: (playlistId: string, beatId: string) => Promise<boolean>;
  removeBeatFromPlaylist: (playlistId: string, beatId: string) => Promise<boolean>;
  isBeatInPlaylist: (playlistId: string, beatId: string) => Promise<boolean>;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  loading: false,
  error: null,

  fetchPlaylists: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_beats(count)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const playlistsWithCount = data?.map((p: any) => ({
        ...p,
        beats_count: p.playlist_beats?.[0]?.count || 0
      })) || [];

      set({ playlists: playlistsWithCount, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createPlaylist: async (userId: string, title: string, description: string = '', isPublic: boolean = true, coverFile?: File) => {
    try {
      let coverUrl = '';
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('covers')
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('covers')
          .getPublicUrl(fileName);
        
        coverUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          creator_id: userId,
          title,
          description,
          is_public: isPublic,
          cover_url: coverUrl
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({ playlists: [data, ...state.playlists] }));
      return data;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  updatePlaylist: async (playlistId: string, updates: Partial<Playlist>, coverFile?: File) => {
    try {
      let coverUrl = updates.cover_url;
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `playlists/${playlistId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('covers')
          .getPublicUrl(fileName);
        
        coverUrl = publicUrl;
      }

      const { error } = await supabase
        .from('playlists')
        .update({ ...updates, cover_url: coverUrl })
        .eq('id', playlistId);

      if (error) throw error;

      set(state => ({
        playlists: state.playlists.map(p => 
          p.id === playlistId ? { ...p, ...updates, cover_url: coverUrl } : p
        )
      }));

      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  deletePlaylist: async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      set(state => ({ playlists: state.playlists.filter(p => p.id !== playlistId) }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addBeatToPlaylist: async (playlistId: string, beatId: string) => {
    try {
      // Get current max position
      const { data: positions } = await supabase
        .from('playlist_beats')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = (positions?.[0]?.position || 0) + 1;

      const { error } = await supabase
        .from('playlist_beats')
        .insert({
          playlist_id: playlistId,
          beat_id: beatId,
          position: nextPosition
        });

      if (error) {
        if (error.code === '23505') return true; // Already in playlist
        throw error;
      }

      // Update local count
      set(state => ({
        playlists: state.playlists.map(p => 
          p.id === playlistId ? { ...p, beats_count: (p.beats_count || 0) + 1 } : p
        )
      }));

      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  removeBeatFromPlaylist: async (playlistId: string, beatId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_beats')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('beat_id', beatId);

      if (error) throw error;

      // Update local count
      set(state => ({
        playlists: state.playlists.map(p => 
          p.id === playlistId ? { ...p, beats_count: Math.max(0, (p.beats_count || 0) - 1) } : p
        )
      }));

      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  isBeatInPlaylist: async (playlistId: string, beatId: string) => {
    try {
      const { data, error } = await supabase
        .from('playlist_beats')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('beat_id', beatId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      return false;
    }
  }
}));
