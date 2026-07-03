-- Party Mode: one table. The host device runs the game engine and stores its
-- authoritative RoomSnapshot (full game state + seats + reveal gates) here as
-- jsonb; player phones mirror it via Realtime postgres_changes. Player intents
-- travel over Realtime *broadcast* channels (topic `party-intents:{code}`),
-- which need no table. Supabase never computes game rules.
--
-- Secrecy model is deliberately "trust the group": the snapshot (roles
-- included) is world-readable; phones simply render only their own seat's
-- private info. Hence the permissive anon RLS below — do not tighten it
-- without redesigning the sync model.

create table public.party_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{4}$'),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.party_rooms is
  'Party Mode rooms: latest host-published game snapshot per join code. World-readable by design (trust-the-group secrecy).';

-- Relaxed, anonymous access: anyone with the anon key can create, read and
-- update rooms. RLS is enabled so the table is not wide open to other roles,
-- but the policies themselves are permissive on purpose.
alter table public.party_rooms enable row level security;

create policy "anon can read rooms"
  on public.party_rooms for select
  to anon, authenticated
  using (true);

create policy "anon can create rooms"
  on public.party_rooms for insert
  to anon, authenticated
  with check (true);

create policy "anon can update rooms"
  on public.party_rooms for update
  to anon, authenticated
  using (true)
  with check (true);

-- Realtime: stream row updates to player phones. (Broadcast channels used for
-- intents are enabled by default and need no publication entry.)
alter publication supabase_realtime add table public.party_rooms;

-- postgres_changes payloads must include the full new row (the snapshot).
alter table public.party_rooms replica identity full;
