import { supabase } from './supabase/client';

export async function recordActivity(userId: string | undefined, beatId: string, action: 'play' | 'favorite' | 'unfavorite' | 'purchase') {
  if (!userId) return;
  
  try {
    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      beat_id: beatId,
      action
    });
    
    if (error) {
      // Silently fail activity logging to not disrupt user experience
      console.warn('Activity logging failed:', error.message);
    }
  } catch (err) {
    console.warn('Activity logging error:', err);
  }
}
