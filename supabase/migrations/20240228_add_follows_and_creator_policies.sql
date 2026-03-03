-- Create Follows Table
create table if not exists follows (
  follower_id uuid references profiles(id) not null,
  following_id uuid references profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- RLS for Follows
alter table follows enable row level security;

create policy "Public follows are viewable by everyone." on follows
  for select using (true);

create policy "Users can follow others." on follows
  for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow." on follows
  for delete using (auth.uid() = follower_id);

-- RLS for Creators to view their sales (Order Items)
-- Existing policy: "Users can view their own order items" checks orders.buyer_id
-- We need a new policy for Sellers/Creators
create policy "Creators can view sales of their beats." on order_items
  for select using (
    exists (
      select 1 from beats
      where beats.id = order_items.beat_id
      and beats.artist_id = auth.uid()
    )
  );
