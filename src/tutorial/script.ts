// Static scenario for the interactive tutorial. This is plain data only — it
// never touches the engine reducer or localStorage. The tutorial drives a
// single hand-scripted round whose outcome is fixed to a mission SUCCESS so the
// learner gets a positive first experience. All player-facing copy (coach
// callouts, cast names) lives in the theme lexicon (lexicon.tutorial) so the
// walkthrough re-narrates itself per theme.

import type { Role, Vote } from '../engine'

/** You are the leader and on the good side. Seats 2 and 4 are the bad faction
 *  for narrative flavour only — in this scripted round nobody sabotages, so
 *  the mission succeeds. */
export const YOU_ID = 0

/** Roles by seat. Seat 0 is the learner; names come from lexicon.tutorial. */
export const CAST_ROLES: readonly Role[] = ['resistance', 'resistance', 'spy', 'resistance', 'spy']

export const SPY_COUNT = CAST_ROLES.filter((r) => r === 'spy').length

/** Round 1 at 5 players needs a 2-person team. */
export const TEAM_SIZE = 2

/** Hard-coded bot votes — a clear majority approves (You + 3 bots vs 1 reject). */
export const BOT_VOTES: Record<number, Vote> = {
  1: 'approve',
  2: 'approve',
  3: 'approve',
  4: 'reject',
}
