// The wire protocol for networked play (Party Mode today, Host & Join later).
// Plain data shapes only — no React, no transport specifics. The authoritative
// document is the RoomSnapshot: the host publishes it after every change and
// every phone renders purely from it.
//
// Secrecy model is deliberately "trust the group": the snapshot carries the
// full engine GameState (roles included) in a world-readable row. Phones
// simply render only their own seat's private info. What IS protected by
// structure rather than trust is the *reveal beat*: ballots and mission cards
// accumulate here in NetMeta / the engine, and nothing shows on any screen
// until the host flips `votesRevealed` / `missionRevealed`.

import { initialState } from '../engine'
import type { GameState, MissionCard } from '../engine'

export type Ballot = 'approve' | 'reject'

/**
 * Which networked mode a room is running. A joiner enters only a code, so the
 * room advertises its mode and each phone renders the right shell:
 *  - 'party'       — a dedicated big screen holds the board; phones are minimal
 *                    controllers (the original Party Mode).
 *  - 'hostAndJoin' — no big screen; EVERY phone shows the full board + its own
 *                    private controls, and the host phone additionally holds the
 *                    control buttons. The host occupies a seat and plays too.
 * Absent ⇒ 'party', so pre-existing rooms/snapshots stay valid.
 */
export type RoomMode = 'party' | 'hostAndJoin'

/** A claimed seat in the room. `playerId` doubles as the engine `Player.id`. */
export interface Seat {
  /** Seat index — equals the engine player id once the game starts. */
  playerId: number
  /** Random id persisted on the player's device; how a phone finds its seat after a refresh. */
  clientId: string
  name: string
}

/**
 * Network-layer state that the engine deliberately knows nothing about: the
 * secret-ballot accumulator and the host-controlled reveal gates. This is what
 * lets networked voting be per-phone while the engine keeps its single public
 * RESOLVE_PROPOSAL step.
 */
export interface NetMeta {
  /** Player ids that confirmed they've read their role (roleReveal phase). */
  roleAcks: number[]
  /** Secret ballots by player id. Locked on first tap; hidden until revealed. */
  ballots: Record<number, Ballot>
  /** Host flipped the ballots face-up (still in proposalVote phase). */
  votesRevealed: boolean
  /** Host flipped the mission cards face-up (missionReveal phase). */
  missionRevealed: boolean
}

/** The full authoritative room document the host publishes after every change. */
export interface RoomSnapshot {
  /** Protocol version — bump when the shape changes so stale rooms are ignored. */
  v: 1
  /** The join code, uppercase. */
  code: string
  /** The engine's state, verbatim. The host is the only writer. */
  game: GameState
  /** Seats in join order. Seat order becomes engine player order at SETUP. */
  seats: Seat[]
  net: NetMeta
  /**
   * Which mode this room runs (see RoomMode). Absent ⇒ 'party' so pre-existing
   * rooms/snapshots stay valid. Read via `roomMode(snapshot)`.
   */
  mode?: RoomMode
  /**
   * The host adjourned the room. Set true (never deleted) so a phone that was
   * offline during the close still learns the session ended on its next fetch
   * and returns to the menu, instead of staring at a frozen board.
   */
  closed?: boolean
}

/** The room's mode, defaulting to 'party' for snapshots written before modes existed. */
export function roomMode(snapshot: RoomSnapshot): RoomMode {
  return snapshot.mode ?? 'party'
}

/** Messages a player phone sends to the host. The host validates everything. */
export type Intent =
  | { kind: 'join'; clientId: string; name: string }
  /** Drop this device's seat (lobby only) — lets someone bow out or rename via rejoin. */
  | { kind: 'leave'; clientId: string }
  | { kind: 'ackRole'; playerId: number }
  | { kind: 'proposeTeam'; playerId: number; team: number[] }
  | { kind: 'vote'; playerId: number; ballot: Ballot }
  | { kind: 'playCard'; playerId: number; card: MissionCard }

export function emptyNet(): NetMeta {
  return { roleAcks: [], ballots: {}, votesRevealed: false, missionRevealed: false }
}

/** A fresh room: engine at 'setup' (the lobby), no seats yet. */
export function lobbySnapshot(code: string, mode: RoomMode = 'party'): RoomSnapshot {
  return { v: 1, code, game: initialState(), seats: [], net: emptyNet(), mode }
}

export interface VoteTally {
  approves: number
  rejects: number
  /** Ballots received so far. */
  done: number
  /** Ballots expected (every seated player votes, not just the team). */
  total: number
  allIn: boolean
  /** Strict majority approves; ties reject, per the source game. */
  approved: boolean
}

export function voteTally(snapshot: RoomSnapshot): VoteTally {
  const ballots = Object.values(snapshot.net.ballots)
  const approves = ballots.filter((b) => b === 'approve').length
  const rejects = ballots.length - approves
  const total = snapshot.game.players.length
  return {
    approves,
    rejects,
    done: ballots.length,
    total,
    allIn: total > 0 && ballots.length >= total,
    approved: approves > rejects,
  }
}

/** Player ids on the team who have already played a card this mission. */
export function cardsIn(snapshot: RoomSnapshot): number[] {
  return snapshot.game.proposedTeam.filter((id) => id in snapshot.game.missionCards)
}

/**
 * Names of everyone who still owes a ballot this vote. Reveals only *who* is
 * outstanding — never how anyone voted (which stays sealed until the reveal).
 */
export function pendingVoters(snapshot: RoomSnapshot): string[] {
  return snapshot.game.players
    .filter((p) => !(p.id in snapshot.net.ballots))
    .map((p) => p.name)
}

/**
 * Names of team members who still owe a mission card. Reveals only *who* is
 * outstanding — never which card anyone played.
 */
export function pendingCardPlayers(snapshot: RoomSnapshot): string[] {
  const { game } = snapshot
  return game.proposedTeam
    .filter((id) => !(id in game.missionCards))
    .map((id) => game.players.find((p) => p.id === id)?.name)
    .filter((n): n is string => Boolean(n))
}

/**
 * The other spies visible to `playerId` during role reveal (the classic
 * Resistance rule). Empty for resistance players and for non-spies. Derived
 * client-side from the world-readable snapshot — no extra transport.
 */
export function fellowSpies(snapshot: RoomSnapshot, playerId: number): string[] {
  const me = snapshot.game.players.find((p) => p.id === playerId)
  if (!me || me.role !== 'spy') return []
  return snapshot.game.players
    .filter((p) => p.role === 'spy' && p.id !== playerId)
    .map((p) => p.name)
}

/**
 * The order mission cards flip in during the dramatic reveal: all successes
 * first, every fail last, for a climactic finish. Ordering strictly by outcome
 * (never by seat) is what preserves anonymity — a viewer learns the *count* of
 * fails but never who played them.
 */
export function revealOrder(failCount: number, total: number): MissionCard[] {
  return [
    ...Array<MissionCard>(Math.max(0, total - failCount)).fill('success'),
    ...Array<MissionCard>(failCount).fill('fail'),
  ]
}

// No ambiguous glyphs (0/O, 1/I) — codes get read off a TV across the room.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 4

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)]!
  }
  return code
}

/** Uppercase + strip anything that can't be part of a code (for input fields). */
export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
}
