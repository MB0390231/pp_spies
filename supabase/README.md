# Supabase setup for networked play (Party Mode & Host & Join)

The two networked modes — **Party Mode** (big screen + phone controllers) and
**Host & Join** (phones only, host is a player) — both run over the same
`party_rooms` table and transport; a `mode` field in the snapshot tells each
phone which shell to render. They work fully offline in dev, tests and the
storybook via the in-memory transport — Supabase is only needed to play across
real devices. The app degrades gracefully: without the env vars below, the
networked-mode choosers show a "not configured" notice and Pass & Play (plus
everything else) still works.

Supabase is **pure transport**. The host device runs the game engine; the
`party_rooms` table just stores the latest snapshot per room (so refreshed
devices rehydrate) and Realtime relays snapshots (postgres_changes) and player
intents (broadcast). No edge functions, no server-side rules.

Project ref: `igfbgvokozpmawwveivc`

## One-time setup

1. **Apply the migration** (creates `party_rooms`, permissive RLS, realtime):

   ```bash
   # with the Supabase CLI, linked to the project
   supabase link --project-ref igfbgvokozpmawwveivc
   supabase db push
   ```

   Or paste `migrations/20260703000000_party_rooms.sql` into the SQL editor in
   the Supabase dashboard and run it.

2. **Verify Realtime is on for the table**: Dashboard → Database →
   Replication → `supabase_realtime` publication should list `party_rooms`
   (the migration adds it; older projects may need the toggle flipped under
   Table Editor → party_rooms → Realtime).

3. **Set env vars** for the app (copy `.env.example` → `.env.local` and fill
   in; both values are on Dashboard → Settings → API):

   ```
   VITE_SUPABASE_URL=https://igfbgvokozpmawwveivc.supabase.co
   VITE_SUPABASE_ANON_KEY=<the anon/publishable key>
   ```

   Set the same two variables in your static host's build environment for
   production (see below). Restart `npm run dev` after changing env vars.

## Deploying to Cloudflare Pages

The app is a pure static SPA (`npm run build` → `dist/`) with **no** Workers,
Functions, or server routes — Supabase is the only backend. Node 22 is pinned
via the repo's version file, which Pages honors.

Vite **inlines** `VITE_*` env vars at build time, so they must exist in the
Pages *build* environment (the gitignored `.env.local` is never deployed):

1. Pages → your project → **Settings → Environment variables**. Add to
   **Production** (and **Preview**, if you use PR previews):

   ```
   VITE_SUPABASE_URL=https://igfbgvokozpmawwveivc.supabase.co
   VITE_SUPABASE_ANON_KEY=<the anon/publishable key>
   ```

2. **Redeploy** (Deployments → Retry, or push a commit). Env vars only apply to
   builds made *after* they're set — a build without them succeeds but the
   networked modes show "not configured".

Build settings are unchanged: **build command** `npm run build`, **output
directory** `dist`. No `_redirects` file is needed — there's no client-side URL
routing (rooms are joined by code, not URL). Nothing to configure on the
Supabase side for the domain: the app uses no Supabase Auth, so there are no
redirect URLs to allowlist, and the anon key in the client bundle is expected
and safe under the trust-the-group model below.

> If you enable the vars for **Preview** too, preview deployments share the
> **same** `party_rooms` table as production — harmless here, just not isolated.

## Security model (deliberate)

Secrecy is "trust the group": the full game snapshot — roles included — lives
in a world-readable row, and phones simply render only their own seat's
private info. RLS is enabled but permissive for the anon key (select, insert,
update). Do not tighten these policies without redesigning the sync model.

## Housekeeping

Rooms are never deleted by the app; stale rows are harmless (a new room with a
colliding code overwrites via upsert). If you want tidiness, run occasionally
(or wire up `pg_cron`):

```sql
delete from public.party_rooms where updated_at < now() - interval '1 day';
```
