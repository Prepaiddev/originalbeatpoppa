"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function RealtimeMaintenance() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { maintenance, fetchSettings } = useSettingsStore();

  // 1. Redirect logic reacts whenever maintenance state OR pathname changes
  useEffect(() => {
    if (maintenance === null) return;
    
    const isMaintenance = maintenance.maintenance_mode;
    const isAdmin = profile?.role === 'admin';

    // Define excluded paths (don't redirect these)
    const isExcluded = 
      pathname.startsWith('/maintenance') || 
      pathname.startsWith('/auth') || 
      pathname.startsWith('/admin') ||
      pathname.startsWith('/_next') ||
      pathname.includes('.') ||
      isAdmin;

    if (isMaintenance && !isExcluded) {
      console.log('Maintenance is ON: Redirecting...');
      router.push('/maintenance');
    } else if (!isMaintenance && pathname.startsWith('/maintenance')) {
      console.log('Maintenance is OFF: Restoring access...');
      router.push('/');
    }
  }, [maintenance, pathname, profile, router]);

  // 2. Subscription logic runs once on mount
  useEffect(() => {
    // Initial fetch
    fetchSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('maintenance_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_settings'
        },
        async (payload: any) => {
          console.log('Realtime settings update detected:', payload);
          // Refresh settings in the Zustand store
          // This will trigger the redirect logic above automatically
          await fetchSettings();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return null;
}
