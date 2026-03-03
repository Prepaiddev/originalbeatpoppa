import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

interface MaintenanceSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  expected_back_at: string;
  show_platform_alert: boolean;
  platform_alert_message: string;
  platform_alert_type: 'info' | 'warning' | 'success';
}

interface GeneralSettings {
  site_name: string;
  site_description: string;
  logo_url: string;
  contact_email: string;
  support_email: string;
  favicon_url: string;
}

interface SettingsState {
  adminPath: string;
  maintenance: MaintenanceSettings | null;
  general: GeneralSettings | null;
  loading: boolean;
  fetchAdminPath: () => Promise<string>;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  adminPath: 'beatpoppa-secured',
  maintenance: null,
  general: null,
  loading: false,
  fetchAdminPath: async () => {
    const currentPath = get().adminPath;
    if (currentPath !== 'beatpoppa-secured') return currentPath;

    set({ loading: true });
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'admin_config')
        .single();
      
      const path = data?.value?.path || 'beatpoppa-secured';
      set({ adminPath: path });
      return path;
    } catch (error: any) {
      if (error?.message === 'Failed to fetch') {
        console.warn('Network connection issue fetching admin path. Check your internet or ad-blocker.');
      } else {
        console.error('Error fetching admin path:', error?.message || error);
      }
      return 'beatpoppa-secured';
    } finally {
      set({ loading: false });
    }
  },

  fetchSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['maintenance_settings', 'general_settings']);
      
      if (error) throw error;

      if (data) {
        const maintenance = data.find(s => s.key === 'maintenance_settings')?.value;
        const general = data.find(s => s.key === 'general_settings')?.value;
        set({ maintenance, general });
      }
    } catch (error: any) {
      if (error?.message === 'Failed to fetch') {
        console.warn('Network connection issue fetching settings. Check your internet or ad-blocker.');
      } else {
        console.error('Error fetching settings:', error?.message || error);
      }
    }
  }
}));
