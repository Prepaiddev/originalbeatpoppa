-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('beats', 'beats', true), ('covers', 'covers', true)
on conflict (id) do nothing;

-- Set up RLS for 'beats' bucket
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

-- Set up RLS for 'covers' bucket
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

-- Payment Settings Table
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

-- Enable RLS
alter table payment_settings enable row level security;

-- Only admins can view/edit payment settings
create policy "Admins can view payment settings"
  on payment_settings for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update payment settings"
  on payment_settings for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can insert payment settings"
  on payment_settings for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Initialize default settings (if empty)
insert into payment_settings (provider, currency, commission_percentage)
select 'stripe', 'USD', 10.00
where not exists (select 1 from payment_settings);
