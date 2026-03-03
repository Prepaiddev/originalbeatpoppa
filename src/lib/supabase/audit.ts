import { supabase } from './client';

export type AuditAction = 
  | 'login' 
  | 'logout' 
  | 'settings_updated' 
  | 'beat_uploaded' 
  | 'beat_approved' 
  | 'beat_rejected' 
  | 'payout_requested' 
  | 'payout_processed' 
  | 'user_banned' 
  | 'user_unbanned' 
  | 'user_deleted'
  | 'verification_approved'
  | 'verification_rejected'
  | 'system_update';

export async function logActivity(
  action: AuditAction, 
  entityType?: string, 
  entityId?: string, 
  details?: any
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from('audit_logs').insert({
      admin_id: session?.user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Audit log error:', error);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
