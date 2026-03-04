
-- Create a private bucket for master files
insert into storage.buckets (id, name, public)
values ('masters', 'masters', false)
on conflict (id) do nothing;

-- Set up RLS for 'masters' bucket
-- Only creators can upload their masters, and only admins or authorized buyers can download
create policy "Creators can upload masters"
  on storage.objects for insert
  with check ( bucket_id = 'masters' and auth.role() = 'authenticated' );

create policy "Creators can view their own masters"
  on storage.objects for select
  using ( bucket_id = 'masters' and auth.uid() = owner );

create policy "Admins can view all masters"
  on storage.objects for select
  using ( bucket_id = 'masters' and exists (select 1 from profiles where id = auth.uid() and role = 'admin') );

-- Add master_url column to beats table
alter table beats add column if not exists master_url text;
