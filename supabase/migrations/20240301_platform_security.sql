-- 1. Create Platform Settings table for dynamic configurations
create table if not exists platform_settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Insert default admin path (can be changed later by the admin)
insert into platform_settings (key, value)
values ('admin_config', '{"path": "beatpoppa-secured"}'::jsonb)
on conflict (key) do nothing;

-- 3. Enable RLS for platform_settings
alter table platform_settings enable row level security;

-- Only admins can view or update platform settings
create policy "Admins can view platform settings" on platform_settings
  for select using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Admins can update platform settings" on platform_settings
  for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

-- 4. Initial Admin SQL (Run this AFTER signing up a user through your website)
-- Replace 'YOUR_USER_ID_HERE' with the ID from your Supabase Auth dashboard
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID_HERE';

-- 5. Trigger for updated_at in platform_settings
create trigger update_platform_settings_updated_at
    before update on platform_settings
    for each row
    execute procedure update_updated_at_column();
