// Thin React bindings over the framework-agnostic host/client sessions.

import { useSyncExternalStore } from 'react'
import type { PartyClient, ClientState } from '../client'
import type { PartyHost } from '../host'
import type { RoomSnapshot } from '../protocol'

/** Live authoritative snapshot on the host device. */
export function useHostSnapshot(host: PartyHost): RoomSnapshot {
  return useSyncExternalStore(
    (cb) => host.subscribe(cb),
    () => host.snapshot,
  )
}

/** Live mirrored state on a player device. */
export function useClientState(client: PartyClient): ClientState {
  return useSyncExternalStore(
    (cb) => client.subscribe(cb),
    () => client.state,
  )
}
