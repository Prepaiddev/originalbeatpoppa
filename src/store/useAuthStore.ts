import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export type UserRole = 'guest' | 'buyer' | 'creator' | 'admin';

interface AuthState {
  user: User | null;
  profile: Record<string, unknown> | null;
  isLoading: boolean;
  role: UserRole;
  
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isInitialized: boolean;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
  isImpersonating: boolean;
  originalUser: User | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  role: 'guest',
  isInitialized: false,
  isImpersonating: false,
  originalUser: null,

  impersonateUser: async (userId: string) => {
    try {
      set({ isLoading: true });
      const { data: targetProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;

      const { user } = get();
      if (!get().isImpersonating) {
        set({ originalUser: user });
      }

      set({ 
        user: { id: userId } as User, 
        profile: targetProfile, 
        role: targetProfile.role as UserRole,
        isImpersonating: true,
        isLoading: false
      });
    } catch (error) {
      console.error('Impersonation error:', error);
      set({ isLoading: false });
    }
  },

  stopImpersonating: async () => {
    const { originalUser } = get();
    set({ isImpersonating: false, user: originalUser, originalUser: null });
    await get().refreshProfile();
  },

  initialize: async () => {
    // If already initializing or initialized, don't run again
    if (get().isInitialized) return;
    
    try {
      set({ isLoading: true });
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: session.user });
        await get().refreshProfile();
      } else {
        set({ user: null, profile: null, role: 'guest' });
      }

      // Mark as initialized
      set({ isInitialized: true });

      // Listen for changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentUser = get().user;
        if (session?.user?.id !== currentUser?.id) {
          set({ user: session?.user ?? null });
          if (session?.user) {
            await get().refreshProfile();
          } else {
            set({ profile: null, role: 'guest', user: null });
          }
        }
      });
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isInitialized: true }); // Still mark as initialized to prevent loop
    } finally {
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        // Only log if it's a real error, not just "no rows found"
        if (error.code !== 'PGRST116') {
          console.error('Error fetching profile:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
        }
        return;
      }

      if (data) {
        set({ profile: data, role: data.role as UserRole });
      }
    } catch (error) {
      // Catch network errors or unexpected issues
      console.warn('Profile fetch connection issue:', error);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, role: 'guest' });
  },
}));
