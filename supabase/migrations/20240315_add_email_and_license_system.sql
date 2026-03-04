
-- 1. Create email_templates table
create table if not exists email_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  subject text not null,
  body text not null, -- HTML content
  variables jsonb default '[]'::jsonb, -- Array of strings: ['order_id', 'user_name']
  version integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create email_providers table
create table if not exists email_providers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('resend', 'sendgrid', 'smtp', 'supabase')) not null,
  config jsonb not null, -- API keys, SMTP host/port/user/pass, etc.
  is_primary boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create email_logs table
create table if not exists email_logs (
  id uuid default gen_random_uuid() primary key,
  template_id uuid references email_templates(id),
  recipient text not null,
  status text check (status in ('sent', 'failed', 'pending')) default 'pending',
  error_message text,
  tracking_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create licenses table
create table if not exists licenses (
  id uuid default gen_random_uuid() primary key,
  order_item_id uuid references order_items(id) on delete cascade not null,
  beat_id uuid references beats(id) not null,
  license_type text not null,
  verification_code text unique not null,
  cryptographic_signature text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table email_templates enable row level security;
alter table email_providers enable row level security;
alter table email_logs enable row level security;
alter table licenses enable row level security;

-- Admin policies
create policy "Admins can manage email_templates" on email_templates
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can manage email_providers" on email_providers
  for all using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can view email_logs" on email_logs
  for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- License policies
create policy "Licenses are viewable by everyone (public verification)" on licenses
  for select using (true);

-- Insert default email templates
insert into email_templates (name, subject, body, variables)
values 
('Order Confirmed', 'Order Confirmed: {{order_id}}', '<h1>Hello {{user_name}}</h1><p>Your order for {{beat_title}} has been confirmed.</p><p>Download link: {{download_url}}</p>', '["order_id", "user_name", "beat_title", "download_url"]'),
('Review Received', 'New Review Received for {{beat_title}}', '<h1>New Review!</h1><p>A user left a review for {{beat_title}}.</p><p>Rating: {{rating}}</p><p>Comment: {{comment}}</p>', '["beat_title", "rating", "comment"]');

-- Trigger to update updated_at
create trigger update_email_templates_updated_at
    before update on email_templates
    for each row
    execute procedure update_updated_at_column();

create trigger update_email_providers_updated_at
    before update on email_providers
    for each row
    execute procedure update_updated_at_column();
