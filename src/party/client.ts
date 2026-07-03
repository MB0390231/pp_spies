// A player phone's read-only mirror of the room. Holds the latest snapshot,
// derives this device's seat from its persisted clientId, and sends intents.
// It never computes rules and never mutates the snapshot — the host is the
// single source of truth. Transport- and presentation-agnostic; no React.

import type { Ballot, Intent, RoomSnapshot, Seat } from './protocol'
import type { MissionCard } from '../engine'
import type { PartyTransport, Unsubscribe } from './transport'

export type ClientStatus = 'connecting' | 'connected' | 'not-found' | 'closed'

export interface ClientState {
  status: ClientStatus
  snapshot: RoomSnapshot | null
}

export class PartyClient {
  /** Immutable per notification so React's useSyncExternalStore can diff it. */
  private current: ClientState = { status: 'connecting', snapshot: null }
  private readonly listeners = new Set<() => void>()
  private readonly offSnapshots: Unsubscribe
  /** Resolves once the initial fetch settles — handy for joins and tests. */
  readonly ready: Promise<ClientStatus>

  private readonly offReconnect: Unsubscribe

  constructor(
    private readonly transport: PartyTransport,
    readonly code: string,
    readonly clientId: string,
  ) {
    // Subscribe BEFORE fetching so no snapshot can slip between the two.
    this.offSnapshots = transport.onSnapshot(code, (snapshot) => {
      if (this.current.status === 'closed' || snapshot.v !== 1) return
      this.set({ status: 'connected', snapshot })
    })
    // Live reconnection: after a realtime drop/resubscribe we may have missed
    // updates, so pull the authoritative snapshot to catch up to the current
    // phase — never a stale one.
    this.offReconnect = transport.onReconnect?.(code, () => this.refetch()) ?? (() => {})
    this.ready = transport
      .fetchSnapshot(code)
      .then((snapshot) => {
        if (this.current.status === 'connecting') {
          if (snapshot && snapshot.v === 1) this.set({ status: 'connected', snapshot })
          else if (!snapshot) this.set({ status: 'not-found', snapshot: null })
        }
        return this.current.status
      })
      .catch(() => this.current.status)
  }

  /** Pull the latest snapshot on demand (used after a live reconnect). */
  private refetch(): void {
    if (this.current.status === 'closed') return
    void this.transport
      .fetchSnapshot(this.code)
      .then((snapshot) => {
        if (this.current.status === 'closed') return
        if (snapshot && snapshot.v === 1) this.set({ status: 'connected', snapshot })
      })
      .catch(() => {})
  }

  get state(): ClientState {
    return this.current
  }

  /** This device's seat, if the host has seated it. */
  get seat(): Seat | undefined {
    return this.current.snapshot?.seats.find((s) => s.clientId === this.clientId)
  }

  /** The host adjourned the room — presentation should return to the menu. */
  get roomClosed(): boolean {
    return this.current.snapshot?.closed === true
  }

  subscribe(cb: () => void): Unsubscribe {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  close(): void {
    this.set({ ...this.current, status: 'closed' })
    this.offSnapshots()
    this.offReconnect()
    this.transport.close()
    this.listeners.clear()
  }

  // ── Intents ────────────────────────────────────────────────────────────────

  join(name: string): void {
    this.send({ kind: 'join', clientId: this.clientId, name })
  }

  /**
   * Drop this device's seat (lobby only). Returns the send promise so the
   * caller can await delivery before tearing down the transport — otherwise the
   * fire-and-forget broadcast can be dropped mid-flight, leaving a ghost seat.
   */
  leave(): Promise<void> {
    return this.sendAwait({ kind: 'leave', clientId: this.clientId })
  }

  ackRole(): void {
    const id = this.seat?.playerId
    if (id !== undefined) this.send({ kind: 'ackRole', playerId: id })
  }

  proposeTeam(team: number[]): void {
    const id = this.seat?.playerId
    if (id !== undefined) this.send({ kind: 'proposeTeam', playerId: id, team })
  }

  vote(ballot: Ballot): void {
    const id = this.seat?.playerId
    if (id !== undefined) this.send({ kind: 'vote', playerId: id, ballot })
  }

  playCard(card: MissionCard): void {
    const id = this.seat?.playerId
    if (id !== undefined) this.send({ kind: 'playCard', playerId: id, card })
  }

  private send(intent: Intent): void {
    void this.transport.sendIntent(this.code, intent).catch(() => {})
  }

  /** Like `send`, but resolves once the transport has dispatched the intent. */
  private sendAwait(intent: Intent): Promise<void> {
    return this.transport.sendIntent(this.code, intent).catch(() => {})
  }

  private set(next: ClientState): void {
    this.current = next
    for (const cb of [...this.listeners]) cb()
  }
}
