-- Add plays column to bundles
alter table bundles add column if not exists plays integer default 0;

-- Update activity_logs to support bundles
alter table activity_logs add column if not exists bundle_id uuid references bundles(id) on delete cascade;

-- Update activity_logs check constraint to allow either beat_id or bundle_id
-- First, we need to drop the old check constraint if it exists
-- Actually, the initial schema didn't have a check constraint on activity_logs for beat_id/bundle_id, 
-- but it had a NOT NULL on beat_id. Let's fix that.

alter table activity_logs alter column beat_id drop not null;

-- Add a check constraint to ensure one of them is set
alter table activity_logs add constraint activity_logs_target_check 
  check ((beat_id is not null and bundle_id is null) or (beat_id is null and bundle_id is not null));

-- Trigger to update plays count in beats and bundles
create or replace function update_plays_count()
returns trigger as $$
begin
  if (new.action = 'play') then
    if (new.beat_id is not null) then
      update beats set plays = plays + 1 where id = new.beat_id;
    elsif (new.bundle_id is not null) then
      update bundles set plays = plays + 1 where id = new.bundle_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_play_activity
  after insert on activity_logs
  for each row execute procedure update_plays_count();
