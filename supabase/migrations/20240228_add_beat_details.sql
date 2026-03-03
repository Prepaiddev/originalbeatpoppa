-- Add description and preview_duration columns to beats table if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'beats' and column_name = 'description') then
    alter table beats add column description text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'beats' and column_name = 'preview_duration') then
    alter table beats add column preview_duration integer default 15;
  end if;
end $$;
