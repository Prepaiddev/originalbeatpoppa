-- Payouts Table for Creators
create table if not exists payouts (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references profiles(id) not null,
  amount decimal(10, 2) not null,
  status text check (status in ('pending', 'approved', 'rejected', 'completed')) default 'pending',
  payment_method text not null, -- 'paypal', 'stripe', 'bank'
  payment_email text,
  transaction_id text,
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table payouts enable row level security;

-- Policies
create policy "Users can view their own payouts." on payouts
  for select using (auth.uid() = creator_id);

create policy "Admins can view all payouts." on payouts
  for select using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Admins can update payouts." on payouts
  for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Creators can request payouts." on payouts
  for insert with check (auth.uid() = creator_id);

-- Update Trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_payouts_updated_at
    before update on payouts
    for each row
    execute procedure update_updated_at_column();
