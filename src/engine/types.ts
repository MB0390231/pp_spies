// Pure engine types. No React, no DOM — keep this file framework-agnostic.

export type Role = 'resistance' | 'spy'

export type MissionCard = 'success' | 'fail'

export type Phase =
  | 'setup' // entering players
  | 'roleReveal' // each player privately views their role
  | 'teamProposal' // leader selects the mission team (public)
  | 'proposalVote' // public one-tap record of the table's show-of-hands vote
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

export interface GameState {
  phase: Phase
  players: Player[]
  /** Number of spies for this player count (cached for convenience). */
  spyCount: number
  /** Challenge mode: missions 1 & 2 send one extra player. */
  challengeMode: boolean
  /**
   * Practice mode: the whole loop runs on THROWAWAY roles so everyone can
   * rehearse the mechanics on their own device. Nothing counts — missions never
   * increment `successes`/`fails`, 5 rejects never ends it, and the game never
   * reaches `gameOver`. Each mission-reveal loops to a fresh practice round
   * (rotated leader, cycled round for varied team sizes). `BEGIN_REAL_GAME`
   * re-deals real roles and clears this flag so nothing is spoiled.
   */
  practice: boolean

  /** 1-based current mission number (1..5). */
  round: number
  /** Index into `players` of the current leader. */
  leaderIndex: number
  /** Consecutive rejected proposals; 5 => spies win. */
  consecutiveRejects: number

  /** Player ids on the currently proposed team. */
  proposedTeam: number[]
  /** Cards played for the current mission, keyed by player id. */
  missionCards: Record<number, MissionCard>

  /** Completed missions, in order. */
  results: MissionResult[]
  successes: number
  fails: number

  /** Most recent revealed mission (for the missionReveal screen). */
  lastMission: MissionResult | null

  winner: Winner | null
}

export type Action =
  /**
   * Begin a game. `seed` drives role assignment and first-leader choice so the
   * reducer stays pure — generate it at the call site (e.g. Date.now()).
   * `practice: true` deals throwaway roles and runs the non-scoring rehearsal
   * loop (see GameState.practice).
   */
  | { type: 'SETUP'; names: string[]; seed: number; challengeMode?: boolean; practice?: boolean }
  /**
   * Leave a practice game and start the REAL game: re-deal real roles with a
   * fresh `seed` (so nothing about practice roles is spoiled), reset round /
   * score / rejects, → roleReveal. Generate the seed at the call site.
   */
  | { type: 'BEGIN_REAL_GAME'; seed: number }
  /** Leave role reveal and start the first round. */
  | { type: 'START_ROUNDS' }
  /** Leader proposes a team (must match the required size). */
  | { type: 'PROPOSE_TEAM'; team: number[] }
  /**
   * Record the table's proposal decision in one tap. The vote itself happens
   * out loud — everyone gives a thumbs up/down in real life — so the phone is
   * never passed around for voting; one person just records whether the
   * proposal passed. Approved → mission; rejected → rotate leader (5
   * consecutive rejects still hand the win to the spies).
   */
  | { type: 'RESOLVE_PROPOSAL'; approved: boolean }
  /** A team member plays their mission card (resistance is coerced to success). */
  | { type: 'PLAY_CARD'; playerId: number; card: MissionCard }
  /** Apply the mission outcome and advance (or end the game). */
  | { type: 'CONFIRM_MISSION' }
  /** Start over from setup. */
  | { type: 'RESET' }
