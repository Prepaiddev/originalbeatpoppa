-- Create a table for Bundles
create table bundles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  creator_id uuid references profiles(id) not null,
  price decimal(10, 2) not null,
  cover_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a junction table for Beats in Bundles
create table bundle_beats (
  bundle_id uuid references bundles(id) on delete cascade not null,
  beat_id uuid references beats(id) on delete cascade not null,
  primary key (bundle_id, beat_id)
);

-- Enable RLS
alter table bundles enable row level security;
alter table bundle_beats enable row level security;

-- Policies for bundles
create policy "Bundles are viewable by everyone." on bundles
  for select using (true);

create policy "Creators can manage their own bundles." on bundles
  for all using (auth.uid() = creator_id);

-- Policies for bundle_beats
create policy "Bundle beats are viewable by everyone." on bundle_beats
  for select using (true);

create policy "Creators can manage their own bundle beats." on bundle_beats
  for all using (
    exists (
      select 1 from bundles
      where bundles.id = bundle_beats.bundle_id
      and bundles.creator_id = auth.uid()
    )
  );

-- Update order_items to support bundles
alter table order_items add column bundle_id uuid references bundles(id);
alter table order_items alter column beat_id drop not null;

-- Add constraint to ensure either beat_id or bundle_id is set
alter table order_items add constraint order_items_check_item 
  check ((beat_id is not null and bundle_id is null) or (beat_id is null and bundle_id is not null));
