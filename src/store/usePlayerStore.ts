import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artist_id?: string;
  username?: string;
  isVerified?: boolean;
  audioUrl: string;
  coverUrl: string;
  price: number;
  preview_duration?: number;
  bpm?: number;
  key?: string;
  genre?: string;
  tags?: string[];
  plays?: number;
  sales?: number;
}

interface PlayerStore {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  play: (track: Track, newQueue?: Track[]) => void;
  pause: () => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  setQueue: (tracks: Track[]) => void;
  setCurrentTrack: (track: Track | null) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  queue: [],

  setCurrentTrack: (track) => set({ currentTrack: track }),

  play: (track, newQueue) => {
    set((state) => {
       // If a new queue is provided, use it. Otherwise, keep existing queue or initialize with single track
       const queue = newQueue || (state.queue.length > 0 ? state.queue : [track]);
       return { currentTrack: track, isPlaying: true, queue };
    });
  },

  pause: () => set({ isPlaying: false }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  playNext: () => {
    const { currentTrack, queue } = get();
    if (!currentTrack || queue.length === 0) return;

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % queue.length;
    set({ currentTrack: queue[nextIndex], isPlaying: true });
  },

  playPrev: () => {
    const { currentTrack, queue } = get();
    if (!currentTrack || queue.length === 0) return;

    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    set({ currentTrack: queue[prevIndex], isPlaying: true });
  },

  setQueue: (tracks) => set({ queue: tracks }),
}));
