-- Update activity_logs to support follow actions and creator targets
alter table activity_logs drop constraint if exists activity_logs_action_check;
alter table activity_logs add constraint activity_logs_action_check 
  check (action in ('play', 'favorite', 'unfavorite', 'purchase', 'follow', 'unfollow'));

-- Add following_id to activity_logs for follow/unfollow actions
alter table activity_logs add column if not exists following_id uuid references profiles(id) on delete cascade;

-- Update target check constraint to include following_id
alter table activity_logs drop constraint if exists activity_logs_target_check;
alter table activity_logs add constraint activity_logs_target_check 
  check (
    (beat_id is not null and bundle_id is null and following_id is null) or 
    (beat_id is null and bundle_id is not null and following_id is null) or
    (beat_id is null and bundle_id is null and following_id is not null)
  );
