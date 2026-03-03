"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Info, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";

export default function GlobalAlert() {
  const { maintenance, fetchSettings } = useSettingsStore();
  const { profile } = useAuthStore();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (!maintenance?.show_platform_alert || !isVisible) {
    return null;
  }

  const type = maintenance.platform_alert_type || 'info';
  const isAdmin = profile?.role === 'admin';
  const showMaintenanceBanner = maintenance.maintenance_mode && isAdmin;

  const styles = {
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    success: "bg-green-500/10 border-green-500/20 text-green-400",
  };

  const icons = {
    info: <Info size={16} />,
    warning: <AlertTriangle size={16} />,
    success: <CheckCircle size={16} />,
  };

  return (
    <div className={clsx(
      "fixed left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl px-4 py-3 rounded-2xl border backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 transition-all",
      showMaintenanceBanner ? "top-[94px]" : "top-[70px]",
      styles[type as keyof typeof styles]
    )}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {icons[type as keyof typeof icons]}
        </div>
        <p className="flex-1 text-xs font-bold uppercase tracking-widest leading-relaxed">
          {maintenance.platform_alert_message}
        </p>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
