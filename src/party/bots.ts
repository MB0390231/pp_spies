// Scripted bots for the DEV-ONLY "AI Mode" harness. Pure and framework-free so
// it's fully unit-testable: given a live room snapshot and a deterministic
// script, decide the ONE legal intent a given seat should send next, and decide
// the next host progression step (reveal/resolve/advance) when a gate is met.
//
// Bots emit exactly the same intents a real phone would, over the same
// in-memory transport — NO new game logic, the engine is untouched. Every
// decision here re-checks phase / leadership / team membership / one-vote /
// one-card locks against the snapshot, so a bot can never produce an illegal
// intent even if a script is malformed.

import { currentLeaderId, currentTeamSize, spyCount } from '../engine'
import type { MissionCard } from '../engine'
import { voteTally } from './protocol'
import type { Ballot, Intent, RoomMode, RoomSnapshot } from './protocol'

/** A player's scripted decisions, keyed by seat index (= engine player id). */
export interface SeatScript {
  /** How this seat votes on EVERY proposal. Default 'approve'. */
  vote?: Ballot
  /**
   * Per-round vote overrides (1-based round → ballot). Lets a scenario force
   * rejections on specific rounds (e.g. the "5 rejects" scenario).
   */
  voteByRound?: Record<number, Ballot>
  /** The card this seat plays when on a mission. Resistance is coerced to
   *  success by the engine regardless; only spies can meaningfully choose. */
  card?: MissionCard
  /** Per-round card overrides (1-based round → card) — drives the R4 drama. */
  cardByRound?: Record<number, MissionCard>
}

/** A full scripted scenario: a deterministic game for a mode + player count. */
export interface Scenario {
  id: string
  label: string
  note: string
  mode: RoomMode
  /** 5–10; also the number of seats. */
  players: number
  /** Role assignment seed (SETUP). Same seed + script → identical game. */
  seed: number
  /** Player display names, one per seat, in seat order. */
  names: string[]
  /** Per-seat scripted decisions, indexed by seat id. */
  seats: SeatScript[]
  /**
   * The leader's team pick each round. Keyed by 1-based round → seat ids. If a
   * round is missing (or the wrong size), the bot falls back to the first N
   * seats — always a legal team.
   */
  teams?: Record<number, number[]>
}

/** Every seat id in a room, in order. */
export function seatIds(snapshot: RoomSnapshot): number[] {
  return snapshot.seats.map((s) => s.playerId).sort((a, b) => a - b)
}

/** The ballot a seat should cast this round, honoring per-round overrides. */
export function scriptedVote(scenario: Scenario, seatId: number, round: number): Ballot {
  const s = scenario.seats[seatId]
  return s?.voteByRound?.[round] ?? s?.vote ?? 'approve'
}

/** The card a seat should play this round, honoring per-round overrides. */
export function scriptedCard(scenario: Scenario, seatId: number, round: number): MissionCard {
  const s = scenario.seats[seatId]
  return s?.cardByRound?.[round] ?? s?.card ?? 'success'
}

/**
 * The leader's team for the current round. Uses the script when it names a
 * correctly-sized, in-range team; otherwise falls back to the first N seats so
 * the emitted PROPOSE_TEAM is always legal.
 */
export function scriptedTeam(scenario: Scenario, snapshot: RoomSnapshot): number[] {
  const { game } = snapshot
  const size = currentTeamSize(game)
  const ids = seatIds(snapshot)
  const scripted = scenario.teams?.[game.round]
  const legal =
    scripted &&
    scripted.length === size &&
    new Set(scripted).size === size &&
    scripted.every((id) => ids.includes(id))
  return legal ? scripted : ids.slice(0, size)
}

/**
 * The next intent seat `seatId` should send given the live snapshot, or null if
 * it has nothing legal/scripted to do right now. Re-validates every precondition
 * against the snapshot so it can NEVER emit an illegal intent.
 */
export function nextSeatIntent(
  scenario: Scenario,
  snapshot: RoomSnapshot,
  seatId: number,
): Intent | null {
  const { game, net } = snapshot
  // The seat must actually exist (it may have left / not yet rejoined).
  if (!game.players.some((p) => p.id === seatId) && game.phase !== 'setup') return null

  switch (game.phase) {
    case 'roleReveal':
      if (net.roleAcks.includes(seatId)) return null
      return { kind: 'ackRole', playerId: seatId }

    case 'teamProposal':
      // Only the current leader proposes.
      if (seatId !== currentLeaderId(game)) return null
      return { kind: 'proposeTeam', playerId: seatId, team: scriptedTeam(scenario, snapshot) }

    case 'proposalVote':
      // Every seated player votes once; skip if already voted or reveal is up.
      if (net.votesRevealed || seatId in net.ballots) return null
      return { kind: 'vote', playerId: seatId, ballot: scriptedVote(scenario, seatId, game.round) }

    case 'mission':
      // Only team members play, once each.
      if (!game.proposedTeam.includes(seatId)) return null
      if (seatId in game.missionCards) return null
      return { kind: 'playCard', playerId: seatId, card: scriptedCard(scenario, seatId, game.round) }

    default:
      return null
  }
}

/** The host progression steps the harness/driver can take. */
export type HostStep =
  | 'startGame'
  | 'beginRounds'
  | 'revealVotes'
  | 'resolveProposal'
  | 'revealMission'
  | 'confirmMission'
  | 'backToLobby'

/**
 * The next host progression step, or null while waiting on player intents. The
 * host only advances a GATED beat once everyone has acted (all ballots in / all
 * cards in), mirroring the real host controls — so a scripted auto-play needs
 * players to move first, exactly like a real game.
 */
export function nextHostStep(snapshot: RoomSnapshot): HostStep | null {
  const { game, net } = snapshot
  switch (game.phase) {
    case 'setup':
      // Auto-start once the lobby is full enough (seats are added by the driver).
      return game.players.length === 0 ? 'startGame' : null
    case 'roleReveal':
      return 'beginRounds'
    case 'proposalVote':
      if (net.votesRevealed) return 'resolveProposal'
      return voteTally(snapshot).allIn ? 'revealVotes' : null
    case 'mission':
      return null // wait for cards
    case 'missionReveal':
      return net.missionRevealed ? 'confirmMission' : 'revealMission'
    default:
      return null
  }
}

/** Expected spy count for a scenario's player count (engine rule, for tests). */
export function scenarioSpyCount(scenario: Scenario): number {
  return spyCount(scenario.players)
}
