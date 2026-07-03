// Supabase-backed transport: the `party_rooms` table stores the latest
// snapshot per room (so refreshed devices rehydrate), postgres_changes relays
// snapshot updates to mirrors, and Realtime broadcast carries player intents
// to the host. Supabase is pure pipe + parking spot — it never computes rules.
//
// Reads env safely and degrades gracefully: without VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY this module exports null transports and the UI shows
// a "not configured" notice. Dev, tests and Storybook use the in-memory
// transport and never touch this file's network paths.

import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Intent, RoomSnapshot } from './protocol'
import type { PartyTransport } from './transport'

const TABLE = 'party_rooms'

function env(name: string): string | undefined {
  // Reference `import.meta.env` *literally* so Vite statically replaces it with
  // the injected env object (dev) / inlined values (build). Aliasing
  // `import.meta` to a variable first defeats that replacement and yields
  // `undefined` at runtime — which silently disables Supabase everywhere.
  // Typing comes from the `vite/client` reference in src/vite-env.d.ts.
  const value = import.meta.env[name] as string | undefined
  return value && value.length > 0 ? value : undefined
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env('VITE_SUPABASE_URL') && env('VITE_SUPABASE_ANON_KEY'))
}

let cachedClient: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!cachedClient) {
    cachedClient = createClient(env('VITE_SUPABASE_URL')!, env('VITE_SUPABASE_ANON_KEY')!, {
      // No accounts in this game — never persist an auth session.
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return cachedClient
}

/** The live transport, or null when env vars are absent (degrade gracefully). */
export function getSupabaseTransport(): PartyTransport | null {
  const client = getClient()
  return client ? createSupabaseTransport(client) : null
}

export function createSupabaseTransport(client: SupabaseClient): PartyTransport {
  const channels = new Set<RealtimeChannel>()
  // Send-only channels are never joined: `.send()` then uses Supabase's HTTP
  // broadcast endpoint, which reaches websocket subscribers on the same topic.
  // This also avoids double-subscribing a topic on one client.
  const sendChannels = new Map<string, RealtimeChannel>()
  // Reconnect fan-out, keyed by room code. A channel re-`SUBSCRIBED` after any
  // error/timeout/close is a live reconnect — fire so client/host re-fetch or
  // re-publish. We only fire on the *re*-subscribe (not the first) so opening a
  // room doesn't spuriously trigger a "reconnect".
  const reconnectCbs = new Map<string, Set<() => void>>()

  function intentTopic(code: string): string {
    return `party-intents:${code}`
  }

  /** Subscribe with reconnect detection wired into the room's fan-out. */
  function subscribeWithReconnect(ch: RealtimeChannel, code: string): RealtimeChannel {
    let hadSubscribed = false
    let dropped = false
    return ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (hadSubscribed && dropped) {
          dropped = false
          for (const cb of [...(reconnectCbs.get(code) ?? [])]) cb()
        }
        hadSubscribed = true
      } else {
        // CHANNEL_ERROR | TIMED_OUT | CLOSED — the socket for this room dropped.
        if (hadSubscribed) dropped = true
      }
    })
  }

  return {
    async createRoom(snapshot) {
      const { error } = await client
        .from(TABLE)
        .upsert({ code: snapshot.code, snapshot })
      if (error) throw new Error(`createRoom failed: ${error.message}`)
    },

    async fetchSnapshot(code) {
      const { data, error } = await client
        .from(TABLE)
        .select('snapshot')
        .eq('code', code)
        .maybeSingle()
      if (error) throw new Error(`fetchSnapshot failed: ${error.message}`)
      return (data?.snapshot as RoomSnapshot | undefined) ?? null
    },

    async publishSnapshot(snapshot) {
      const { error } = await client
        .from(TABLE)
        .update({ snapshot, updated_at: new Date().toISOString() })
        .eq('code', snapshot.code)
      if (error) throw new Error(`publishSnapshot failed: ${error.message}`)
    },

    onSnapshot(code, cb) {
      const base = client.channel(`party-room:${code}`).on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: TABLE, filter: `code=eq.${code}` },
        (payload) => {
          const snap = (payload.new as { snapshot?: RoomSnapshot }).snapshot
          if (snap) cb(snap)
        },
      )
      const ch = subscribeWithReconnect(base, code)
      channels.add(ch)
      return () => {
        channels.delete(ch)
        void client.removeChannel(ch)
      }
    },

    async sendIntent(code, intent) {
      let ch = sendChannels.get(code)
      if (!ch) {
        ch = client.channel(intentTopic(code))
        sendChannels.set(code, ch)
        channels.add(ch)
      }
      await ch.send({ type: 'broadcast', event: 'intent', payload: intent })
    },

    onIntent(code, cb) {
      const base = client
        .channel(intentTopic(code))
        .on('broadcast', { event: 'intent' }, ({ payload }) => cb(payload as Intent))
      const ch = subscribeWithReconnect(base, code)
      channels.add(ch)
      return () => {
        channels.delete(ch)
        void client.removeChannel(ch)
      }
    },

    onReconnect(code, cb) {
      let set = reconnectCbs.get(code)
      if (!set) {
        set = new Set()
        reconnectCbs.set(code, set)
      }
      set.add(cb)
      return () => set!.delete(cb)
    },

    close() {
      for (const ch of [...channels]) void client.removeChannel(ch)
      channels.clear()
      sendChannels.clear()
      reconnectCbs.clear()
    },
  }
}
