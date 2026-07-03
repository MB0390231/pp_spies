// In-memory transport: a hub shared by any number of transport instances in
// the same JS context. This is what lets Storybook render a live big screen +
// phones side by side, and what the host/reveal-gate unit tests run against —
// no backend, no network, fully synchronous delivery.

import type { Intent, RoomSnapshot } from './protocol'
import type { PartyTransport, Unsubscribe } from './transport'

interface Room {
  snapshot: RoomSnapshot | null
  snapshotSubs: Set<(s: RoomSnapshot) => void>
  intentSubs: Set<(i: Intent) => void>
  reconnectSubs: Set<() => void>
}

export interface MemoryHub {
  /** A fresh transport handle sharing this hub's rooms (one per simulated device). */
  transport(): PartyTransport
  /**
   * Simulate a realtime drop+reconnect for a room: fires every registered
   * onReconnect callback, exactly as the Supabase transport does when a channel
   * re-subscribes. Lets tests exercise the "catch up after being offline" path
   * without a live socket.
   */
  simulateReconnect(code: string): void
}

/** Deep-clone through JSON, exactly like a real wire would — catches accidental
 *  reliance on shared object identity between host and mirrors. */
function overTheWire<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createMemoryHub(): MemoryHub {
  const rooms = new Map<string, Room>()

  function room(code: string): Room {
    let r = rooms.get(code)
    if (!r) {
      r = {
        snapshot: null,
        snapshotSubs: new Set(),
        intentSubs: new Set(),
        reconnectSubs: new Set(),
      }
      rooms.set(code, r)
    }
    return r
  }

  function transport(): PartyTransport {
    const cleanups = new Set<Unsubscribe>()

    return {
      createRoom(snapshot) {
        room(snapshot.code).snapshot = overTheWire(snapshot)
        return Promise.resolve()
      },
      fetchSnapshot(code) {
        const snap = rooms.get(code)?.snapshot ?? null
        return Promise.resolve(snap ? overTheWire(snap) : null)
      },
      publishSnapshot(snapshot) {
        const r = room(snapshot.code)
        r.snapshot = overTheWire(snapshot)
        for (const cb of [...r.snapshotSubs]) cb(overTheWire(snapshot))
        return Promise.resolve()
      },
      onSnapshot(code, cb) {
        const r = room(code)
        r.snapshotSubs.add(cb)
        const off = () => r.snapshotSubs.delete(cb)
        cleanups.add(off)
        return off
      },
      sendIntent(code, intent) {
        const r = rooms.get(code)
        if (r) for (const cb of [...r.intentSubs]) cb(overTheWire(intent))
        return Promise.resolve()
      },
      onIntent(code, cb) {
        const r = room(code)
        r.intentSubs.add(cb)
        const off = () => r.intentSubs.delete(cb)
        cleanups.add(off)
        return off
      },
      onReconnect(code, cb) {
        const r = room(code)
        r.reconnectSubs.add(cb)
        const off = () => r.reconnectSubs.delete(cb)
        cleanups.add(off)
        return off
      },
      close() {
        for (const off of [...cleanups]) off()
        cleanups.clear()
      },
    }
  }

  function simulateReconnect(code: string): void {
    const r = rooms.get(code)
    if (r) for (const cb of [...r.reconnectSubs]) cb()
  }

  return { transport, simulateReconnect }
}
