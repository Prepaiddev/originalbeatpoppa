"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function RealtimeMaintenance() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, isLoading: authLoading } = useAuthStore();
  const { maintenance, fetchSettings, adminPath } = useSettingsStore();

  // 1. Redirect logic reacts whenever maintenance state OR pathname changes
  useEffect(() => {
    // Wait for auth to initialize before making redirection decisions
    if (authLoading || maintenance === null) return;
    
    const isMaintenance = maintenance.maintenance_mode;
    const isAdmin = profile?.role === 'admin';

    // Define excluded paths (don't redirect these)
    // We must include the dynamic secret admin path as well
    const isExcluded = 
      pathname.startsWith('/maintenance') || 
      pathname.startsWith('/auth') || 
      pathname.startsWith('/admin') ||
      (adminPath && pathname.startsWith(`/${adminPath}`)) ||
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
  }, [maintenance, pathname, profile, router, adminPath, authLoading]);

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
          // Only refetch if the change is relevant to maintenance or general settings
          if (
            payload.new?.key === 'maintenance_settings' || 
            payload.new?.key === 'general_settings' ||
            payload.old?.key === 'maintenance_settings' ||
            payload.old?.key === 'general_settings'
          ) {
            console.log('Relevant realtime settings update detected:', payload.new?.key);
            await fetchSettings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return null;
}
