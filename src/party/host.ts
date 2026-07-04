// The authoritative host session. Runs the EXISTING pure engine reducer —
// no game rule lives here. This module owns exactly two things:
//
//  1. Translating validated player intents into engine actions
//     (join → seats → SETUP; proposeTeam → PROPOSE_TEAM; playCard → PLAY_CARD).
//  2. The network-only reveal gate: secret ballots and mission cards
//     accumulate (in NetMeta / the engine) and stay face-down on every screen
//     until an explicit host action flips them; only then does the final,
//     public result feed into the unchanged engine (RESOLVE_PROPOSAL /
//     CONFIRM_MISSION).
//
// Transport- and presentation-agnostic: Party Mode renders this on a big
// screen; Host & Join will render the same session on a phone. No React here.

import { currentLeaderId, initialState, isValidPlayerCount, reducer } from '../engine'
import type { Action } from '../engine'
import { MAX_PLAYERS } from '../engine'
import { emptyNet, generateRoomCode, lobbySnapshot, voteTally } from './protocol'
import type { Intent, RoomMode, RoomSnapshot } from './protocol'
import type { PartyTransport, Unsubscribe } from './transport'

export class PartyHost {
  private snap: RoomSnapshot
  private readonly listeners = new Set<() => void>()
  private readonly offIntents: Unsubscribe
  private readonly offReconnect: Unsubscribe

  /**
   * Synchronous by design so Storybook/tests can build a live session without
   * awaiting; use the static helpers when you need room creation/rehydration.
   */
  constructor(
    private readonly transport: PartyTransport,
    snapshot: RoomSnapshot,
  ) {
    this.snap = snapshot
    this.offIntents = transport.onIntent(snapshot.code, (i) => this.handleIntent(i))
    // The host is the source of truth, so it never re-fetches (that could
    // clobber its live state with an older stored copy). Instead, on a live
    // reconnect it re-publishes its authoritative snapshot so any mirror that
    // also just reconnected is guaranteed to land on the current phase.
    this.offReconnect =
      transport.onReconnect?.(snapshot.code, () => {
        void this.transport.publishSnapshot(this.snap).catch(() => {})
      }) ?? (() => {})
  }

  /**
   * Open a brand-new room (fresh lobby) on the given transport. `mode` picks
   * the shell every phone renders (see RoomMode); defaults to Party Mode.
   */
  static async open(
    transport: PartyTransport,
    code = generateRoomCode(),
    mode: RoomMode = 'party',
  ): Promise<PartyHost> {
    const snapshot = lobbySnapshot(code, mode)
    await transport.createRoom(snapshot)
    return new PartyHost(transport, snapshot)
  }

  /** Rehydrate a host session (e.g. after a refresh) from the stored snapshot. */
  static async resume(transport: PartyTransport, code: string): Promise<PartyHost | null> {
    const snapshot = await transport.fetchSnapshot(code)
    if (!snapshot || snapshot.v !== 1) return null
    return new PartyHost(transport, snapshot)
  }

  get snapshot(): RoomSnapshot {
    return this.snap
  }

  get code(): string {
    return this.snap.code
  }

  subscribe(cb: () => void): Unsubscribe {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  close(): void {
    this.offIntents()
    this.offReconnect()
    this.transport.close()
    this.listeners.clear()
  }

  // ── Host actions (the buttons on the host's own screen) ────────────────────

  /** Lobby → assign roles. Seat order becomes engine player order. */
  startGame(seed: number, challengeMode = false): void {
    const { game, seats } = this.snap
    if (game.phase !== 'setup' || !isValidPlayerCount(seats.length)) return
    this.dispatch({ type: 'SETUP', names: seats.map((s) => s.name), seed, challengeMode })
  }

  /** Lobby → a PRACTICE game on throwaway roles (see GameState.practice). */
  startPractice(seed: number, challengeMode = false): void {
    const { game, seats } = this.snap
    if (game.phase !== 'setup' || !isValidPlayerCount(seats.length)) return
    this.dispatch({
      type: 'SETUP',
      names: seats.map((s) => s.name),
      seed,
      challengeMode,
      practice: true,
    })
  }

  /** Leave practice and deal the REAL game with a fresh seed (no spoiler). Also
   *  clears any practice-round NetMeta so the real reveal starts clean. */
  startRealGame(seed: number): void {
    if (!this.snap.game.practice) return
    this.dispatch({ type: 'BEGIN_REAL_GAME', seed }, () => emptyNet())
  }

  /** Role reveal → first round. Allowed even if not everyone has acked. */
  beginRounds(): void {
    if (this.snap.game.phase !== 'roleReveal') return
    this.dispatch({ type: 'START_ROUNDS' })
  }

  /** Flip the secret ballots face-up. Only once every seated player has voted. */
  revealVotes(): void {
    const s = this.snap
    if (s.game.phase !== 'proposalVote' || s.net.votesRevealed) return
    if (!voteTally(s).allIn) return
    this.commit({ ...s, net: { ...s.net, votesRevealed: true } })
  }

  /**
   * After the reveal beat: feed the tallied outcome into the unchanged engine.
   * This is the single point where per-phone ballots become the engine's one
   * public RESOLVE_PROPOSAL step.
   */
  resolveProposal(): void {
    const s = this.snap
    if (s.game.phase !== 'proposalVote' || !s.net.votesRevealed) return
    const { approved } = voteTally(s)
    this.dispatch({ type: 'RESOLVE_PROPOSAL', approved }, (net) => ({
      ...net,
      ballots: {},
      votesRevealed: false,
    }))
  }

  /** Flip the (already shuffled-for-display) mission cards face-up. */
  revealMission(): void {
    const s = this.snap
    if (s.game.phase !== 'missionReveal' || s.net.missionRevealed) return
    this.commit({ ...s, net: { ...s.net, missionRevealed: true } })
  }

  /** Apply the mission outcome and advance (or end the game). */
  confirmMission(): void {
    const s = this.snap
    if (s.game.phase !== 'missionReveal' || !s.net.missionRevealed) return
    this.dispatch({ type: 'CONFIRM_MISSION' }, (net) => ({ ...net, missionRevealed: false }))
  }

  /** Game over → back to the lobby with the same seats, ready to re-deal. */
  backToLobby(): void {
    if (this.snap.game.phase !== 'gameOver') return
    this.commit({ ...this.snap, game: initialState(), net: emptyNet() })
  }

  /**
   * Adjourn the room. Publishes a `closed` snapshot so every phone — even one
   * that was offline during the close and re-fetches later — learns the
   * session ended and returns to the menu, rather than freezing on a stale
   * board. The row is left in place (not deleted) precisely so that late
   * fetch still sees `closed`.
   */
  closeRoom(): void {
    if (this.snap.closed) return
    this.commit({ ...this.snap, closed: true })
  }

  // ── Host-as-player (Host & Join) ──────────────────────────────────────────────

  /**
   * Apply an intent that originated on the host's OWN device. Routes through
   * the exact same `handleIntent` validation + locking path as remote players,
   * so the host gets no hidden-info or unlocked advantage — it only saves the
   * transport round-trip. Used by the host's player controls in Host & Join.
   */
  dispatchIntent(intent: Intent): void {
    this.handleIntent(intent)
  }

  // ── Player intents ──────────────────────────────────────────────────────────

  private handleIntent(intent: Intent): void {
    switch (intent.kind) {
      case 'join':
        return this.handleJoin(intent.clientId, intent.name)

      case 'leave':
        return this.handleLeave(intent.clientId)

      case 'ackRole': {
        const s = this.snap
        if (s.game.phase !== 'roleReveal') return
        if (!s.game.players.some((p) => p.id === intent.playerId)) return
        if (s.net.roleAcks.includes(intent.playerId)) return
        this.commit({ ...s, net: { ...s.net, roleAcks: [...s.net.roleAcks, intent.playerId] } })
        return
      }

      case 'proposeTeam': {
        const s = this.snap
        if (s.game.phase !== 'teamProposal') return
        if (intent.playerId !== currentLeaderId(s.game)) return
        this.dispatch({ type: 'PROPOSE_TEAM', team: intent.team })
        return
      }

      case 'vote': {
        const s = this.snap
        if (s.game.phase !== 'proposalVote' || s.net.votesRevealed) return
        if (!s.game.players.some((p) => p.id === intent.playerId)) return
        // Secret ballot: first tap locks it. No changing your vote.
        if (intent.playerId in s.net.ballots) return
        this.commit({
          ...s,
          net: { ...s.net, ballots: { ...s.net.ballots, [intent.playerId]: intent.ballot } },
        })
        return
      }

      case 'playCard': {
        const s = this.snap
        if (s.game.phase !== 'mission') return
        // One card per seat — the engine would happily overwrite, so lock here.
        if (intent.playerId in s.game.missionCards) return
        // The engine validates team membership and coerces resistance to success.
        this.dispatch({ type: 'PLAY_CARD', playerId: intent.playerId, card: intent.card })
        return
      }
    }
  }

  private handleJoin(clientId: string, rawName: string): void {
    const s = this.snap
    const name = rawName.trim().slice(0, 24)
    const existing = s.seats.find((seat) => seat.clientId === clientId)

    // Rejoin/refresh: the seat already exists; mirrors rehydrate from the
    // snapshot, so just re-publish for the newly subscribed device.
    if (existing) {
      this.commit({ ...s })
      return
    }

    // Mid-game: a device without its old clientId (cleared storage, new phone,
    // different browser) can RECLAIM its orphaned seat by name. Rebind the
    // matching seat to the new clientId so the returning phone's normal seat
    // lookup finds it and resumes at the current phase with the same role — no
    // re-deal. Acceptable under the trust-the-group model. Lobby assembly is
    // deliberately untouched (see below): there, a clashing name is a *new*
    // person and dedupes to "Name 2".
    if (s.game.phase !== 'setup') {
      if (name.length === 0) return
      const idx = s.seats.findIndex((seat) => seat.name.toLowerCase() === name.toLowerCase())
      if (idx === -1) return // genuine new player mid-game is still refused
      const seats = s.seats.map((seat, i) =>
        i === idx ? { ...seat, clientId } : seat,
      )
      this.commit({ ...s, seats })
      return
    }

    // Lobby only past here.
    if (s.seats.length >= MAX_PLAYERS || name.length === 0) return

    // Names must stay unique (they become engine player names) — dedupe with a
    // counter rather than silently rejecting the join.
    const taken = new Set(s.seats.map((seat) => seat.name.toLowerCase()))
    let unique = name
    for (let n = 2; taken.has(unique.toLowerCase()); n++) unique = `${name} ${n}`

    this.commit({
      ...s,
      seats: [...s.seats, { playerId: s.seats.length, clientId, name: unique }],
    })
  }

  /**
   * Drop a seat by clientId. Only meaningful in the lobby — once roles are
   * dealt, seats are bound to engine players and removing one would corrupt the
   * game, so a mid-game leave is a no-op (the device just returns to the menu
   * locally; its seat stays and it can rejoin by refreshing). Remaining seats
   * are re-indexed so `playerId` stays a contiguous 0..n-1 for the next SETUP.
   */
  private handleLeave(clientId: string): void {
    const s = this.snap
    if (s.game.phase !== 'setup') return
    if (!s.seats.some((seat) => seat.clientId === clientId)) return
    const seats = s.seats
      .filter((seat) => seat.clientId !== clientId)
      .map((seat, i) => ({ ...seat, playerId: i }))
    this.commit({ ...s, seats })
  }

  // ── Plumbing ────────────────────────────────────────────────────────────────

  /** Run an engine action; optionally adjust NetMeta in the same commit. */
  private dispatch(action: Action, mapNet?: (net: RoomSnapshot['net']) => RoomSnapshot['net']): void {
    let game
    try {
      game = reducer(this.snap.game, action)
    } catch {
      // Invalid intents (bad team, off-mission card) must never crash the host.
      return
    }
    this.commit({ ...this.snap, game, net: mapNet ? mapNet(this.snap.net) : this.snap.net })
  }

  private commit(next: RoomSnapshot): void {
    this.snap = next
    for (const cb of [...this.listeners]) cb()
    // Fire-and-forget: local UI already updated; the wire catches up.
    void this.transport.publishSnapshot(next).catch(() => {})
  }
}
