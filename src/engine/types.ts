// Pure engine types. No React, no DOM — keep this file framework-agnostic.

export type Role = 'resistance' | 'spy'

export type Vote = 'approve' | 'reject'

export type MissionCard = 'success' | 'fail'

export type Phase =
  | 'setup' // entering players
  | 'roleReveal' // each player privately views their role
  | 'teamProposal' // leader selects the mission team (public)
  | 'vote' // each player privately approves/rejects
  | 'voteReveal' // dramatic public reveal of the vote
  | 'mission' // team members privately play success/fail
  | 'missionReveal' // shuffled public reveal of the outcome
  | 'gameOver'

export type Winner = 'resistance' | 'spies'

export interface Player {
  id: number
  name: string
  role: Role
}

/** Outcome of a single completed mission. */
export interface MissionResult {
  /** 1-based mission number. */
  round: number
  /** Player ids that went on the mission. */
  team: number[]
  failCount: number
  success: boolean
}

/** Snapshot of a revealed vote, kept for the reveal screen. */
export interface VoteRecord {
  round: number
  team: number[]
  votes: Record<number, Vote>
  approveCount: number
  rejectCount: number
  approved: boolean
}

export interface GameState {
  phase: Phase
  players: Player[]
  /** Number of spies for this player count (cached for convenience). */
  spyCount: number

  /** 1-based current mission number (1..5). */
  round: number
  /** Index into `players` of the current leader. */
  leaderIndex: number
  /** Consecutive rejected proposals; 5 => spies win. */
  consecutiveRejects: number

  /** Player ids on the currently proposed team. */
  proposedTeam: number[]
  /** Votes cast for the current proposal, keyed by player id. */
  votes: Record<number, Vote>
  /** Cards played for the current mission, keyed by player id. */
  missionCards: Record<number, MissionCard>

  /** Completed missions, in order. */
  results: MissionResult[]
  successes: number
  fails: number

  /** Most recent revealed vote (for the voteReveal screen). */
  lastVote: VoteRecord | null
  /** Most recent revealed mission (for the missionReveal screen). */
  lastMission: MissionResult | null

  winner: Winner | null
}

export type Action =
  /**
   * Begin a game. `seed` drives role assignment and first-leader choice so the
   * reducer stays pure — generate it at the call site (e.g. Date.now()).
   */
  | { type: 'SETUP'; names: string[]; seed: number }
  /** Leave role reveal and start the first round. */
  | { type: 'START_ROUNDS' }
  /** Leader proposes a team (must match the required size). */
  | { type: 'PROPOSE_TEAM'; team: number[] }
  /** A player casts their private vote. */
  | { type: 'CAST_VOTE'; playerId: number; vote: Vote }
  /** Apply the consequences of the revealed vote (approve → mission, else rotate). */
  | { type: 'CONFIRM_VOTE' }
  /** A team member plays their mission card (resistance is coerced to success). */
  | { type: 'PLAY_CARD'; playerId: number; card: MissionCard }
  /** Apply the mission outcome and advance (or end the game). */
  | { type: 'CONFIRM_MISSION' }
  /** Start over from setup. */
  | { type: 'RESET' }
