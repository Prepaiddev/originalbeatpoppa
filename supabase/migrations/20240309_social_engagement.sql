-- Create Likes table (Polymorphic: beat or bundle)
create table likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  beat_id uuid references beats(id) on delete cascade,
  bundle_id uuid references bundles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure only one of beat_id or bundle_id is set
  constraint likes_check_target check (
    (beat_id is not null and bundle_id is null) or 
    (beat_id is null and bundle_id is not null)
  ),
  -- Unique constraint per user per target
  unique(user_id, beat_id),
  unique(user_id, bundle_id)
);

-- Create Comments table (Polymorphic: beat or bundle)
create table comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  beat_id uuid references beats(id) on delete cascade,
  bundle_id uuid references bundles(id) on delete cascade,
  content text not null,
  parent_id uuid references comments(id) on delete cascade, -- for replies
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure only one of beat_id or bundle_id is set
  constraint comments_check_target check (
    (beat_id is not null and bundle_id is null) or 
    (beat_id is null and bundle_id is not null)
  )
);

-- Enable RLS
alter table likes enable row level security;
alter table comments enable row level security;

-- Policies for likes
create policy "Likes are viewable by everyone." on likes
  for select using (true);

create policy "Users can like items." on likes
  for insert with check (auth.uid() = user_id);

create policy "Users can unlike items." on likes
  for delete using (auth.uid() = user_id);

-- Policies for comments
create policy "Comments are viewable by everyone." on comments
  for select using (true);

create policy "Authenticated users can comment." on comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update their own comments." on comments
  for update using (auth.uid() = user_id);

create policy "Users can delete their own comments." on comments
  for delete using (auth.uid() = user_id);

-- Add count columns to beats and bundles
alter table beats add column if not exists likes_count integer default 0;
alter table beats add column if not exists comments_count integer default 0;
alter table bundles add column if not exists likes_count integer default 0;
alter table bundles add column if not exists comments_count integer default 0;

-- Triggers to update counts
-- Like count triggers
create or replace function update_like_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if (new.beat_id is not null) then
      update beats set likes_count = likes_count + 1 where id = new.beat_id;
    elsif (new.bundle_id is not null) then
      update bundles set likes_count = likes_count + 1 where id = new.bundle_id;
    end if;
  elsif (tg_op = 'DELETE') then
    if (old.beat_id is not null) then
      update beats set likes_count = likes_count - 1 where id = old.beat_id;
    elsif (old.bundle_id is not null) then
      update bundles set likes_count = likes_count - 1 where id = old.bundle_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_like_change
  after insert or delete on likes
  for each row execute procedure update_like_count();

-- Comment count triggers
create or replace function update_comment_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if (new.beat_id is not null) then
      update beats set comments_count = comments_count + 1 where id = new.beat_id;
    elsif (new.bundle_id is not null) then
      update bundles set comments_count = comments_count + 1 where id = new.bundle_id;
    end if;
  elsif (tg_op = 'DELETE') then
    if (old.beat_id is not null) then
      update beats set comments_count = comments_count - 1 where id = old.beat_id;
    elsif (old.bundle_id is not null) then
      update bundles set comments_count = comments_count - 1 where id = old.bundle_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_comment_change
  after insert or delete on comments
  for each row execute procedure update_comment_count();
