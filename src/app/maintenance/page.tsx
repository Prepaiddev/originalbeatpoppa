import { AlertTriangle, Clock, Mail, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function MaintenancePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'maintenance_settings')
    .single();
  
  const settings = data?.value || null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-xl w-full text-center relative z-10">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-[32px] flex items-center justify-center text-primary shadow-2xl shadow-primary/20 animate-pulse">
            <AlertTriangle size={48} />
          </div>
        </div>

        <h1 className="text-5xl font-black tracking-tight mb-6 uppercase italic">
          Under <span className="text-primary">Maintenance</span>
        </h1>
        
        <p className="text-zinc-400 text-lg font-medium leading-relaxed mb-10">
          {settings?.maintenance_message || "BeatPoppa is currently undergoing scheduled maintenance to improve your experience. We'll be back online shortly."}
        </p>

        {settings?.expected_back_at && (
          <div className="inline-flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 px-6 py-4 rounded-2xl mb-12">
            <Clock className="text-primary" size={20} />
            <span className="text-sm font-black uppercase tracking-widest">
              Estimated Return: <span className="text-white">{settings.expected_back_at}</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl group hover:border-zinc-700 transition-all">
            <Mail className="text-zinc-500 mb-4 group-hover:text-primary transition-colors" size={24} />
            <h3 className="font-black uppercase tracking-tight text-xs mb-1">Need Support?</h3>
            <p className="text-[10px] text-zinc-500 font-medium">Contact our team at support@beatpoppa.com</p>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl group hover:border-zinc-700 transition-all">
            <Globe className="text-zinc-500 mb-4 group-hover:text-primary transition-colors" size={24} />
            <h3 className="font-black uppercase tracking-tight text-xs mb-1">Status Updates</h3>
            <p className="text-[10px] text-zinc-500 font-medium">Follow us on social media for live updates</p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-900">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
            &copy; {new Date().getFullYear()} BeatPoppa Platform. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
