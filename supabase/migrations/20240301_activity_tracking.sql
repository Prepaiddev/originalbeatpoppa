-- Create Activity Logs table to track user interactions
create table if not exists activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  beat_id uuid references beats(id) on delete cascade not null,
  action text check (action in ('play', 'favorite', 'unfavorite', 'purchase')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster querying of forgotten favorites
create index if not exists idx_activity_logs_user_beat on activity_logs(user_id, beat_id, action);
create index if not exists idx_activity_logs_created_at on activity_logs(created_at);

-- Enable RLS
alter table activity_logs enable row level security;

-- Policies
create policy "Users can view their own activity logs." on activity_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert their own activity logs." on activity_logs
  for insert with check (auth.uid() = user_id);

-- Create a view or a function to simplify fetching forgotten favorites
-- Logic: (Plays > 3 OR Favorited) AND (Last activity > 2 days ago)
create or replace view forgotten_favorites_view as
with user_beat_stats as (
  select 
    user_id,
    beat_id,
    count(*) filter (where action = 'play') as play_count,
    exists(select 1 from favorites f where f.user_id = activity_logs.user_id and f.beat_id = activity_logs.beat_id) as is_favorited,
    max(created_at) as last_interaction
  from activity_logs
  group by user_id, beat_id
)
select * from user_beat_stats
where (play_count >= 3 or is_favorited = true)
and last_interaction < (now() - interval '2 days');
