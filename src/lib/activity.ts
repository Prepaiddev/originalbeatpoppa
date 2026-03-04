import { supabase } from './supabase/client';

export async function recordActivity(
  userId: string | undefined, 
  targetId: string, 
  action: 'play' | 'favorite' | 'unfavorite' | 'purchase' | 'follow' | 'unfollow',
  type: 'beat' | 'bundle' | 'creator' = 'beat'
) {
  if (!userId) return;
  
  try {
    const data: any = {
      user_id: userId,
      action
    };

    if (type === 'beat') {
      data.beat_id = targetId;
    } else if (type === 'bundle') {
      data.bundle_id = targetId;
    } else if (type === 'creator') {
      data.following_id = targetId;
    }

    const { error } = await supabase.from('activity_logs').insert(data);
    
    if (error) {
      // Silently fail activity logging to not disrupt user experience
      console.warn('Activity logging failed:', error.message);
    }
  } catch (err) {
    console.warn('Activity logging error:', err);
  }
}
