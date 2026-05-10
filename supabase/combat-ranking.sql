create table if not exists public.combat_ranking (
  id uuid primary key default gen_random_uuid(),
  player_id text not null unique,
  name text not null check (char_length(name) between 1 and 10),
  score integer not null check (score >= 0),
  round integer not null check (round >= 1),
  kills integer not null check (kills >= 0),
  seconds integer not null check (seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists combat_ranking_set_updated_at on public.combat_ranking;

create trigger combat_ranking_set_updated_at
before update on public.combat_ranking
for each row
execute function public.set_updated_at();

alter table public.combat_ranking enable row level security;

drop policy if exists "Public combat ranking read" on public.combat_ranking;
drop policy if exists "Public combat ranking insert" on public.combat_ranking;
drop policy if exists "Public combat ranking update" on public.combat_ranking;

create policy "Public combat ranking read"
on public.combat_ranking
for select
to anon
using (true);

create policy "Public combat ranking insert"
on public.combat_ranking
for insert
to anon
with check (
  char_length(name) between 1 and 10
  and score >= 0
  and round >= 1
  and kills >= 0
  and seconds >= 0
);

create policy "Public combat ranking update"
on public.combat_ranking
for update
to anon
using (true)
with check (
  char_length(name) between 1 and 10
  and score >= 0
  and round >= 1
  and kills >= 0
  and seconds >= 0
);

grant select, insert, update on public.combat_ranking to anon;
