// The transport abstraction. Everything above this line (PartyHost,
// PartyClient, all React UI) is transport-agnostic: it publishes/receives
// snapshots and intents through this interface and never knows whether the
// wire is Supabase realtime or an in-memory hub (storybook + tests).
//
// A transport is dumb pipe + parking spot: it stores the latest snapshot per
// room and relays intents. It NEVER interprets game rules.

import type { Intent, RoomSnapshot } from './protocol'

export type Unsubscribe = () => void

export interface PartyTransport {
  /** Host: claim a room code and store its initial snapshot. */
  createRoom(snapshot: RoomSnapshot): Promise<void>
  /** Latest stored snapshot, or null if the room doesn't exist. Used to (re)hydrate. */
  fetchSnapshot(code: string): Promise<RoomSnapshot | null>
  /** Host: store + broadcast the new authoritative snapshot. */
  publishSnapshot(snapshot: RoomSnapshot): Promise<void>
  /** Player: receive every snapshot published after subscribing. */
  onSnapshot(code: string, cb: (snapshot: RoomSnapshot) => void): Unsubscribe
  /** Player: fire an intent at the room's host. Fire-and-forget semantics. */
  sendIntent(code: string, intent: Intent): Promise<void>
  /** Host: receive player intents for a room. */
  onIntent(code: string, cb: (intent: Intent) => void): Unsubscribe
  /**
   * Fires when a dropped realtime connection for this room re-establishes
   * (network blip, phone sleep, laptop lid). The subscriber MUST re-fetch the
   * latest snapshot, because updates published while offline were missed.
   * Optional: transports that never drop (in-memory) may omit it.
   */
  onReconnect?(code: string, cb: () => void): Unsubscribe
  /** Tear down every subscription/channel this transport instance opened. */
  close(): void
}
