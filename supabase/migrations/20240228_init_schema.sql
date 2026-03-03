-- Create a table for public profiles
create table profiles (
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

-- Enable RLS
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for Beats
create table beats (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  artist_id uuid references profiles(id) not null,
  description text,
  audio_url text not null, -- Path to storage
  cover_url text, -- Path to storage
  price decimal(10, 2) not null default 29.99,
  bpm integer,
  key text,
  genre text,
  tags text[],
  plays integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table beats enable row level security;

create policy "Beats are viewable by everyone." on beats
  for select using (true);

create policy "Creators can insert their own beats." on beats
  for insert with check (auth.uid() = artist_id);

create policy "Creators can update their own beats." on beats
  for update using (auth.uid() = artist_id);

-- Create a table for Orders
create table orders (
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

-- Create a table for Order Items (Beats within an order)
create table order_items (
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

-- Create a table for Favorites
create table favorites (
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

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'buyer'));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
