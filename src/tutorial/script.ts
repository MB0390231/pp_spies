// Static scenario for the interactive tutorial. This is plain data + copy only —
// it never touches the engine reducer or localStorage. The tutorial drives a
// single hand-scripted round whose outcome is fixed to a mission SUCCESS so the
// learner gets a positive first experience.

import type { Role, Vote } from '../engine'

export interface TutorialPlayer {
  id: number
  name: string
  role: Role
}

/** You are the leader and on the resistance. Ben is a spy for narrative flavour
 *  only — in this scripted round nobody sabotages, so the mission succeeds. */
export const YOU_ID = 0

export const CAST: TutorialPlayer[] = [
  { id: YOU_ID, name: 'You', role: 'resistance' },
  { id: 1, name: 'Ava', role: 'resistance' },
  { id: 2, name: 'Ben', role: 'spy' },
  { id: 3, name: 'Cay', role: 'resistance' },
  { id: 4, name: 'Dee', role: 'spy' },
]

export const SPY_COUNT = CAST.filter((p) => p.role === 'spy').length

/** Round 1 at 5 players needs a 2-person team. */
export const TEAM_SIZE = 2

/** Hard-coded bot votes — a clear majority approves (You + 3 bots vs 1 reject). */
export const BOT_VOTES: Record<number, Vote> = {
  1: 'approve',
  2: 'approve',
  3: 'approve',
  4: 'reject',
}

export function playerName(id: number): string {
  return CAST.find((p) => p.id === id)?.name ?? ''
}

// Coach copy, keyed by scene. Kept here so Tutorial.tsx stays focused on flow.
export const COACH = {
  intro: {
    title: 'How to play',
    body: 'Spies is a hidden-role game for 5–10 players sharing one phone. You will play one guided round as a member of the Resistance — and win a mission.',
    cta: 'Start',
  },
  role: {
    title: 'Roles are secret',
    body: 'Each player privately checks their role behind a "pass the phone" screen, so nobody sees anyone else’s. You are Resistance — but 2 of the 5 are secretly Spies.',
    cta: 'Got it',
  },
  proposal: {
    title: 'You are the leader',
    body: 'As leader you choose the team. This round needs 2 players — every round calls for a set number that grows in later rounds (and depends on how many are playing). Tap any 2 to send; the leader is allowed to go too. Afterwards the leader passes to the next player each round — and also every time a team is voted down — so everyone gets a turn proposing.',
    cta: 'Propose team',
  },
  vote: {
    title: 'Everyone votes',
    body: 'Every player votes to approve or reject this team. Votes aren’t secret — once everyone has voted they’re all revealed, so you’ll see exactly who approved and who rejected. Tap Approve to send this team.',
    cta: '',
  },
  voteReveal: {
    title: 'Majority rules',
    body: 'More approvals than rejections, so the team is sent. Careful: if proposals are rejected 5 times in a row, the Spies win — so don’t stall forever.',
    cta: 'Begin mission',
  },
  mission: {
    title: 'Play your card',
    body: 'Team members secretly play a card. Resistance can only Succeed — only Spies can choose to Fail a mission. Tap Succeed.',
    cta: '',
  },
  missionReveal: {
    title: 'Cards are anonymous',
    body: 'Cards are shuffled before they’re shown, so nobody knows who played what — that’s how Spies stay hidden. No fail cards here, so the mission succeeds!',
    cta: 'Continue',
  },
  outro: {
    title: 'That’s the loop',
    body: 'Resistance wins by completing 3 missions. Spies win with 3 failed missions — or 5 rejected proposals in a row. (One twist: the 4th mission needs 2 fail cards to fail when 7+ are playing.) You’re ready!',
    cta: 'Start a real game',
  },
} as const
