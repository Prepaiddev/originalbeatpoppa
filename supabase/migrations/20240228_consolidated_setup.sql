-- ============================================================================
-- CONSOLIDATED MIGRATION SCRIPT FOR BEATPOPPA
-- ============================================================================
-- This script sets up the entire database schema, storage policies, and payment settings.
-- Run this in the Supabase SQL Editor to fix "relation profiles does not exist" errors.

-- 1. Create PROFILES table (Must exist before other tables reference it)
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  email text,
  display_name text,
  avatar_url text,
  role text check (role in ('buyer', 'creator', 'admin')) default 'buyer',
  bio text,
  location text,
  website text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- 2. Create BEATS table
create table if not exists beats (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  artist_id uuid references profiles(id) not null,
  description text,
  audio_url text not null,
  cover_url text,
  price decimal(10, 2) not null default 29.99,
  bpm integer,
  key text,
  genre text,
  tags text[],
  plays integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for beats
alter table beats enable row level security;

-- Beats Policies
create policy "Beats are viewable by everyone." on beats
  for select using (true);

create policy "Creators can insert their own beats." on beats
  for insert with check (auth.uid() = artist_id);

create policy "Creators can update their own beats." on beats
  for update using (auth.uid() = artist_id);

create policy "Creators can delete their own beats." on beats
  for delete using (auth.uid() = artist_id);

-- 3. Create ORDERS table
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  buyer_id uuid references profiles(id) not null,
  total_amount decimal(10, 2) not null,
  status text check (status in ('pending', 'completed', 'failed')) default 'pending',
  payment_provider text,
  transaction_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table orders enable row level security;

create policy "Users can view their own orders." on orders
  for select using (auth.uid() = buyer_id);
  
create policy "Users can insert their own orders." on orders
  for insert with check (auth.uid() = buyer_id);

create policy "Users can update their own orders." on orders
  for update using (auth.uid() = buyer_id);

-- 4. Create ORDER ITEMS table
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade not null,
  beat_id uuid references beats(id) not null,
  license_type text not null,
  price decimal(10, 2) not null
);

alter table order_items enable row level security;

create policy "Users can view their own order items." on order_items
  for select using (
    exists ( select 1 from orders where id = order_items.order_id and buyer_id = auth.uid() )
  );
  
create policy "Users can insert their own order items." on order_items
  for insert with check (
    exists ( select 1 from orders where id = order_items.order_id and buyer_id = auth.uid() )
  );

-- 5. Create FAVORITES table
create table if not exists favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  beat_id uuid references beats(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, beat_id)
);

alter table favorites enable row level security;

create policy "Users can view their own favorites." on favorites
  for select using (auth.uid() = user_id);

create policy "Users can insert their own favorites." on favorites
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own favorites." on favorites
  for delete using (auth.uid() = user_id);

-- 6. Setup PAYMENT SETTINGS table
create table if not exists payment_settings (
  id uuid default gen_random_uuid() primary key,
  provider text check (provider in ('stripe', 'paystack')) not null default 'stripe',
  is_enabled boolean default true,
  public_key text,
  secret_key text,
  currency text default 'USD',
  commission_percentage decimal(5, 2) default 10.00,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table payment_settings enable row level security;

-- Admin policies for payment settings
create policy "Admins can view payment settings"
  on payment_settings for select
  using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Admins can update payment settings"
  on payment_settings for update
  using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Admins can insert payment settings"
  on payment_settings for insert
  with check (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

-- Insert default payment settings if empty
insert into payment_settings (provider, currency, commission_percentage)
select 'stripe', 'USD', 10.00
where not exists (select 1 from payment_settings);

-- 7. Setup STORAGE BUCKETS
insert into storage.buckets (id, name, public)
values ('beats', 'beats', true), ('covers', 'covers', true)
on conflict (id) do nothing;

-- Storage Policies for BEATS bucket
create policy "Public Access to Beats"
  on storage.objects for select
  using ( bucket_id = 'beats' );

create policy "Authenticated Users can Upload Beats"
  on storage.objects for insert
  with check ( bucket_id = 'beats' and auth.role() = 'authenticated' );

create policy "Users can Update own Beats"
  on storage.objects for update
  using ( bucket_id = 'beats' and auth.uid() = owner );

create policy "Users can Delete own Beats"
  on storage.objects for delete
  using ( bucket_id = 'beats' and auth.uid() = owner );

-- Storage Policies for COVERS bucket
create policy "Public Access to Covers"
  on storage.objects for select
  using ( bucket_id = 'covers' );

create policy "Authenticated Users can Upload Covers"
  on storage.objects for insert
  with check ( bucket_id = 'covers' and auth.role() = 'authenticated' );

create policy "Users can Update own Covers"
  on storage.objects for update
  using ( bucket_id = 'covers' and auth.uid() = owner );

create policy "Users can Delete own Covers"
  on storage.objects for delete
  using ( bucket_id = 'covers' and auth.uid() = owner );

-- 8. Setup USER SIGNUP TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'buyer'));
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid errors on re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
