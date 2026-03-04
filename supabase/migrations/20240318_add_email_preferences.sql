
-- Add marketing_emails preference to profiles
alter table profiles add column if not exists marketing_emails boolean default true;

-- Allow users to update their own preference
create policy "Users can update their own email preferences"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
