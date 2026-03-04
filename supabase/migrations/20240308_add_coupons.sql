-- Create Coupons table
create table coupons (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  description text,
  discount_percent integer not null check (discount_percent > 0 and discount_percent <= 100),
  is_active boolean default true,
  expires_at timestamp with time zone,
  max_uses integer,
  used_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table coupons enable row level security;

-- Policies for coupons
create policy "Coupons are viewable by everyone." on coupons
  for select using (true);

create policy "Admins can manage coupons." on coupons
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Update orders table to support coupons
alter table orders add column coupon_code text;
alter table orders add column discount_amount decimal(10, 2) default 0.00;
alter table orders add column subtotal_amount decimal(10, 2);

-- Function to increment coupon usage
create or replace function increment_coupon_usage(coupon_code text)
returns void as $$
begin
  update coupons
  set used_count = used_count + 1
  where code = coupon_code;
end;
$$ language plpgsql security definer;
