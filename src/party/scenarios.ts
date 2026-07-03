// The scripted scenarios that ship with AI Mode, plus a headless RoomController
// that drives one live in-memory room via the scripted bots. Pure of React so
// tests reuse it directly; the Storybook harness wraps the same controller.
//
// Reuse only: bots send real intents over the in-memory transport, the host
// runs the unchanged PartyHost. No game logic here.

import { PartyClient } from './client'
import { PartyHost } from './host'
import { createMemoryHub } from './memoryTransport'
import type { MemoryHub } from './memoryTransport'
import { nextHostStep, nextSeatIntent } from './bots'
import type { HostStep, Scenario } from './bots'
import type { RoomSnapshot } from './protocol'

const NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy']

function names(n: number): string[] {
  return NAMES.slice(0, n)
}

/** Everyone approves and plays success → a clean resistance sweep. */
function allApprove(n: number): Scenario['seats'] {
  return Array.from({ length: n }, () => ({ vote: 'approve' as const, card: 'success' as const }))
}

// ── Shipped scenarios (both modes; the interesting outcomes) ───────────────────

export const SCENARIOS: Scenario[] = [
  {
    id: 'party-resistance-sweep',
    label: 'Party · Resistance sweep',
    note: 'Every proposal approved, no sabotage — the Resistance wins 3 straight. Seed picks the spies but they never fail a card.',
    mode: 'party',
    players: 5,
    seed: 7,
    names: names(5),
    seats: allApprove(5),
  },
  {
    id: 'party-spies-missions',
    label: 'Party · Spies win on missions',
    note: 'Teams get approved, but seat 1 (a scripted saboteur) plays Fail whenever on the team — three failed missions hand it to the spies.',
    mode: 'party',
    players: 5,
    seed: 7,
    names: names(5),
    // Seat 1 always fails; the fixed team [0,1] each round guarantees it's on.
    seats: [
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'fail' },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success' },
    ],
    teams: { 1: [0, 1], 2: [0, 1, 2], 3: [0, 1], 4: [0, 1, 2], 5: [0, 1, 2] },
  },
  {
    id: 'party-five-rejects',
    label: 'Party · Spies win by 5 rejects',
    note: 'Every proposal is voted down (majority Reject). After 5 consecutive rejections the spies win outright — no mission is ever run.',
    mode: 'party',
    players: 5,
    seed: 7,
    names: names(5),
    // 3 of 5 reject → every proposal fails.
    seats: [
      { vote: 'reject' },
      { vote: 'reject' },
      { vote: 'reject' },
      { vote: 'approve' },
      { vote: 'approve' },
    ],
  },
  {
    id: 'hostjoin-resistance-sweep',
    label: 'Host & Join · Resistance sweep',
    note: 'Same clean sweep, phones-only: the host (seat 0) is a player too and its own vote/card go through the shared path before it can reveal.',
    mode: 'hostAndJoin',
    players: 5,
    seed: 7,
    names: names(5),
    seats: allApprove(5),
  },
  {
    id: 'hostjoin-r4-drama',
    label: 'Host & Join · R4 two-fail drama',
    note: '7 players: mission 4 needs TWO fails to fail. The score is kept alive to R4 (a fail on R2), then on R4 two scripted saboteurs both play Fail — so it fails, and the game runs on to R5.',
    mode: 'hostAndJoin',
    players: 7,
    seed: 8,
    names: names(7),
    // Saboteurs on seats 1 & 6. R2: seat 1 fails (score 1 succ→then 1 fail).
    // R4: seats 1 & 6 both fail (needs two with 7 players). R1/R3/R5 clean.
    seats: [
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success', cardByRound: { 2: 'fail', 4: 'fail' } },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success', cardByRound: { 4: 'fail' } },
    ],
    teams: {
      1: [0, 2],
      2: [0, 1, 3], // seat 1 (saboteur) on → R2 fails
      3: [0, 2, 4],
      4: [0, 1, 6, 2], // both saboteurs on → two fails → R4 fails
      5: [0, 2, 3, 4],
    },
  },
  {
    id: 'party-r4-drama',
    label: 'Party · R4 two-fail drama',
    note: '7 players on the big screen: one fail on R4 is NOT enough (needs two), so a lone saboteur can’t sink mission 4 — it survives. (A fail on R2 keeps the score alive to R4.)',
    mode: 'party',
    players: 7,
    seed: 8,
    names: names(7),
    // Same shape, but only ONE saboteur is on the R4 team → one fail → R4 SURVIVES.
    seats: [
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success', cardByRound: { 2: 'fail', 4: 'fail' } },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success' },
      { vote: 'approve', card: 'success', cardByRound: { 4: 'fail' } },
    ],
    teams: {
      1: [0, 2],
      2: [0, 1, 3], // R2 fails (seat 1)
      3: [0, 2, 4],
      4: [0, 1, 2, 3], // only seat 1 saboteur on → ONE fail → R4 SURVIVES
      5: [0, 2, 3, 4],
    },
  },
]

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}

/**
 * A live in-memory room driven by a scenario's bots. Host is seat 0 in Host &
 * Join (a player); in Party the host is an unseated big screen. Exactly ONE seat
 * may be `controlled` (human) — the driver never acts for it, and never acts as
 * the host if the controlled seat is the host in Host & Join... except the host
 * PROGRESSION (reveals/advances) always runs so the game moves; the human only
 * makes that seat's PLAYER decisions.
 */
export class RoomController {
  readonly hub: MemoryHub
  readonly host: PartyHost
  /** One PartyClient per player seat, keyed by seat id. Party: all seats.
   *  Host & Join: seats 1..n-1 (seat 0 is the host device). */
  readonly clients = new Map<number, PartyClient>()
  private readonly clientIdBySeat = new Map<number, string>()
  private closedSeats = new Set<number>()

  private constructor(
    readonly scenario: Scenario,
    hub: MemoryHub,
    host: PartyHost,
  ) {
    this.hub = hub
    this.host = host
  }

  /** The host's own clientId (Host & Join seat 0). */
  static readonly HOST_CLIENT = 'ai-host'

  private clientId(seatId: number): string {
    return `ai-client-${seatId}`
  }

  /** Build the room, seat everyone, and settle. */
  static async open(scenario: Scenario): Promise<RoomController> {
    const hub = createMemoryHub()
    const code = 'AIML'
    const host = await PartyHost.open(hub.transport(), code, scenario.mode)
    const ctrl = new RoomController(scenario, hub, host)

    const hostJoin = scenario.mode === 'hostAndJoin'
    for (let seatId = 0; seatId < scenario.players; seatId++) {
      const name = scenario.names[seatId]!
      if (hostJoin && seatId === 0) {
        // The host takes seat 0 through the same join path as any player.
        host.dispatchIntent({ kind: 'join', clientId: RoomController.HOST_CLIENT, name })
        ctrl.clientIdBySeat.set(0, RoomController.HOST_CLIENT)
        continue
      }
      const cid = ctrl.clientId(seatId)
      const client = new PartyClient(hub.transport(), code, cid)
      await client.ready
      client.join(name)
      ctrl.clients.set(seatId, client)
      ctrl.clientIdBySeat.set(seatId, cid)
    }
    return ctrl
  }

  get snapshot(): RoomSnapshot {
    return this.host.snapshot
  }

  /** Send one seat's own scripted intent (used for bots and for stepping). */
  private sendSeat(seatId: number): boolean {
    const intent = nextSeatIntent(this.scenario, this.snapshot, seatId)
    if (!intent) return false
    if (seatId === 0 && this.scenario.mode === 'hostAndJoin') {
      this.host.dispatchIntent(intent)
    } else {
      const client = this.clients.get(seatId)
      if (!client) return false
      switch (intent.kind) {
        case 'ackRole':
          client.ackRole()
          break
        case 'proposeTeam':
          client.proposeTeam(intent.team)
          break
        case 'vote':
          client.vote(intent.ballot)
          break
        case 'playCard':
          client.playCard(intent.card)
          break
        default:
          return false
      }
    }
    return true
  }

  /** Run a single host progression step if one is due. Returns what it did. */
  private runHostStep(): HostStep | null {
    const step = nextHostStep(this.snapshot)
    if (!step) return null
    switch (step) {
      case 'startGame':
        this.host.startGame(this.scenario.seed)
        break
      case 'beginRounds':
        this.host.beginRounds()
        break
      case 'revealVotes':
        this.host.revealVotes()
        break
      case 'resolveProposal':
        this.host.resolveProposal()
        break
      case 'revealMission':
        this.host.revealMission()
        break
      case 'confirmMission':
        this.host.confirmMission()
        break
      case 'backToLobby':
        this.host.backToLobby()
        break
    }
    return step
  }

  /**
   * Advance the game by ONE meaningful step: first any due host progression,
   * else the next bot seat with something to do (skipping `controlled` and any
   * disconnected seat). Returns true if anything happened. Idempotent at
   * game-over. `controlled` lets the human own one seat's player decisions.
   */
  step(controlled?: number): boolean {
    if (this.snapshot.game.phase === 'gameOver') return false

    // Host progression (reveals/advances) is always bot-driven so the game moves
    // without the human touching every phone.
    if (this.runHostStep()) return true

    // Otherwise, the next bot seat that owes an action.
    for (const seatId of this.snapshot.seats.map((s) => s.playerId).sort((a, b) => a - b)) {
      if (seatId === controlled) continue
      if (this.closedSeats.has(seatId)) continue
      if (this.sendSeat(seatId)) return true
    }
    return false
  }

  /** Run to completion (game over) or until no progress. Bots fill every seat
   *  except `controlled` (if given). Guarded against infinite loops. */
  run(controlled?: number, maxSteps = 500): void {
    let steps = 0
    while (steps++ < maxSteps && this.step(controlled)) {
      // keep stepping
    }
  }

  // ── Leave / disconnect / reclaim (for the harness affordances) ────────────────

  /** A seated player leaves in the LOBBY: drops the seat everywhere + re-indexes. */
  leaveLobby(seatId: number): void {
    if (this.snapshot.game.phase !== 'setup') return
    if (seatId === 0 && this.scenario.mode === 'hostAndJoin') return // host stays
    const client = this.clients.get(seatId)
    client?.leave()
    client?.close()
    this.clients.delete(seatId)
    this.clientIdBySeat.delete(seatId)
    this.closedSeats.add(seatId)
  }

  /** MID-GAME: a seated player "disconnects" — closes its client but keeps its
   *  seat (orphaned), so the game can stall until it rejoins. */
  disconnect(seatId: number): void {
    if (seatId === 0 && this.scenario.mode === 'hostAndJoin') return
    const client = this.clients.get(seatId)
    client?.close()
    this.clients.delete(seatId)
    this.closedSeats.add(seatId)
  }

  /** Reclaim-by-name: a fresh device rejoins with the seat's name and rebinds
   *  the orphaned seat at the current phase (same role). */
  async reclaim(seatId: number): Promise<void> {
    const name = this.snapshot.seats.find((s) => s.playerId === seatId)?.name
    if (!name) return
    const cid = `ai-reclaim-${seatId}-${Date.now()}`
    const client = new PartyClient(this.hub.transport(), this.host.code, cid)
    await client.ready
    client.join(name) // mid-game → reclaim path rebinds the seat to this clientId
    this.clients.set(seatId, client)
    this.clientIdBySeat.set(seatId, cid)
    this.closedSeats.delete(seatId)
  }

  /** Tear down all sessions. */
  close(): void {
    this.host.close()
    for (const c of this.clients.values()) c.close()
    this.clients.clear()
  }
}
