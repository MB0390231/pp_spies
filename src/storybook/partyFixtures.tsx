// Party Mode storybook scenarios: mock RoomSnapshots (one per networked
// phase), each mounted into a LIVE in-memory room — a real PartyHost renders
// the real BigScreen while real PartyClients render the real PhoneScreens.
// The frames are interactive: tap a ballot on a phone and the big screen
// updates, exactly as over the wire, with no backend.

import { useEffect, useState } from 'react'
import { initialState } from '../engine'
import type { GameState, Player } from '../engine'
import { PartyClient } from '../party/client'
import { PartyHost } from '../party/host'
import { createMemoryHub } from '../party/memoryTransport'
import { emptyNet } from '../party/protocol'
import type { NetMeta, RoomSnapshot, Seat } from '../party/protocol'
import { BigScreen } from '../party/react/BigScreen'
import { JoinForm } from '../party/react/PartyMode'
import { PhoneScreen } from '../party/react/PhoneScreen'

export interface PartyScenario {
  id: string
  label: string
  /** Caption under the title. */
  note?: string
  /** The mock room state the live in-memory room is seeded with. */
  snapshot: RoomSnapshot
  /** clientIds rendered as phone frames next to the big screen. */
  phones: string[]
  /** Hide the big screen (phone-only scenarios like the join form). */
  hideBig?: boolean
  /** Render the standalone join form instead of a live room. */
  joinForm?: boolean
  /** Override the mission-reveal per-card flip delay (0 = instant, static frame). */
  revealStepMs?: number
}

const CODE = 'DEMO'

// Same default cast as the Pass & Play fixtures: Bob and Eve are the spies.
const P5: Player[] = [
  { id: 0, name: 'Alice', role: 'resistance' },
  { id: 1, name: 'Bob', role: 'spy' },
  { id: 2, name: 'Charlie', role: 'resistance' },
  { id: 3, name: 'Diana', role: 'resistance' },
  { id: 4, name: 'Eve', role: 'spy' },
]

const SEATS: Seat[] = P5.map((p) => ({ playerId: p.id, clientId: `c${p.id}`, name: p.name }))

function makeGame(overrides: Partial<GameState>): GameState {
  return { ...initialState(), ...overrides }
}

function snap(game: Partial<GameState>, net: Partial<NetMeta> = {}, seats: Seat[] = SEATS): RoomSnapshot {
  return { v: 1, code: CODE, game: makeGame(game), seats, net: { ...emptyNet(), ...net } }
}

const inRound = { players: P5, spyCount: 2, round: 1, leaderIndex: 0 }

export const partyScenarios: PartyScenario[] = [
  {
    id: 'party-lobby',
    label: 'Lobby (+ leave)',
    note: 'Join code on the big screen; phones sit in the lobby. Live: tap "Leave" on a phone — the seat drops from the big screen everywhere. The start button really deals roles.',
    snapshot: snap({ phase: 'setup' }, {}, SEATS.slice(0, 3)),
    phones: ['c0', 'c1'],
  },
  {
    id: 'party-join',
    label: 'Join Form (phone)',
    note: 'The code + name form a phone fills in before joining.',
    snapshot: snap({ phase: 'setup' }),
    phones: [],
    hideBig: true,
    joinForm: true,
  },
  {
    id: 'party-role',
    label: 'Role Reveal (spies see spies)',
    note: 'Tap "Reveal my role" on each phone. Alice (c0, Resistance) sees only her role; Bob (c1, Spy) and Eve (c4, Spy) each see the OTHER spy named. The big screen counts acks, never roles.',
    snapshot: snap({ phase: 'roleReveal', ...inRound }, { roleAcks: [2, 3] }),
    phones: ['c1', 'c4', 'c0'],
  },
  {
    id: 'party-proposal',
    label: 'Team Proposal',
    note: 'Alice leads: her phone gets the picker, everyone else waits. Live: submitting advances to the ballot.',
    snapshot: snap({ phase: 'teamProposal', ...inRound }),
    phones: ['c0', 'c1'],
  },
  {
    id: 'party-vote',
    label: 'Secret Ballot — collecting',
    note: 'Ballots lock on first tap and stay face-down. The "Still to act" list names WHO hasn’t voted (Alice, Bob, Diana here) — never how anyone voted. Live: vote on the phones to shrink the list.',
    snapshot: snap({ phase: 'proposalVote', ...inRound, proposedTeam: [1, 3] }, { ballots: { 2: 'approve', 4: 'reject' } }),
    phones: ['c0', 'c1'],
  },
  {
    id: 'party-vote-locked',
    label: 'Secret Ballot — locked',
    note: 'All ballots in; the reveal waits for the host. Live: tap Reveal on the big screen.',
    snapshot: snap(
      { phase: 'proposalVote', ...inRound, proposedTeam: [1, 3] },
      { ballots: { 0: 'approve', 1: 'approve', 2: 'approve', 3: 'reject', 4: 'reject' } },
    ),
    phones: ['c0'],
  },
  {
    id: 'party-vote-revealed',
    label: 'Secret Ballot — revealed',
    note: 'The host flipped the ballots: per-player verdicts and the outcome, before the round resolves.',
    snapshot: snap(
      { phase: 'proposalVote', ...inRound, proposedTeam: [1, 3] },
      {
        ballots: { 0: 'approve', 1: 'approve', 2: 'approve', 3: 'reject', 4: 'reject' },
        votesRevealed: true,
      },
    ),
    phones: ['c0'],
  },
  {
    id: 'party-mission',
    label: 'Mission (+ pending)',
    note: 'Bob (spy, may sabotage) and Diana (resistance, locked to succeed) play in secret. The "Still to act" list names who hasn’t played — never which card. Alice isn’t on the team.',
    // One card already in (Bob) so the pending list shows just Diana.
    snapshot: snap({
      phase: 'mission',
      ...inRound,
      proposedTeam: [1, 3],
      missionCards: { 1: 'fail' },
    }),
    phones: ['c1', 'c3', 'c0'],
  },
  {
    id: 'party-mission-sealed',
    label: 'Mission Reveal — sealed',
    note: 'All cards in, still face-down. Live: the big screen button flips them one at a time.',
    snapshot: snap({
      phase: 'missionReveal',
      players: P5,
      spyCount: 2,
      round: 3,
      proposedTeam: [0, 1, 2, 4],
      missionCards: { 0: 'success', 1: 'fail', 2: 'success', 4: 'fail' },
      lastMission: { round: 3, team: [0, 1, 2, 4], failCount: 2, success: false },
    }),
    phones: ['c0'],
  },
  {
    id: 'party-mission-staged',
    label: 'Mission Reveal — staged flip',
    note: 'Cards flip ONE AT A TIME, successes first and both fails LAST for the climactic finish — ordered strictly by outcome, never by seat, so the count of fails shows but never who played them. Re-select this item to replay the animation.',
    snapshot: snap(
      {
        phase: 'missionReveal',
        players: P5,
        spyCount: 2,
        round: 3,
        proposedTeam: [0, 1, 2, 4],
        missionCards: { 0: 'success', 1: 'fail', 2: 'success', 4: 'fail' },
        lastMission: { round: 3, team: [0, 1, 2, 4], failCount: 2, success: false },
      },
      { missionRevealed: true },
    ),
    phones: ['c0'],
  },
  {
    id: 'party-mission-revealed',
    label: 'Mission Reveal — settled',
    note: 'The end state after the staged flip: all cards up (successes then fails), the verdict, and the fail count.',
    snapshot: snap(
      {
        phase: 'missionReveal',
        ...inRound,
        proposedTeam: [1, 3],
        missionCards: { 1: 'fail', 3: 'success' },
        lastMission: { round: 1, team: [1, 3], failCount: 1, success: false },
      },
      { missionRevealed: true },
    ),
    phones: ['c0'],
    revealStepMs: 0,
  },
  {
    id: 'party-gameover',
    label: 'Game Over',
    note: 'Big screen unseals roles one by one; phones learn their own fate. Live: Back to the lobby re-seats everyone.',
    snapshot: snap({
      phase: 'gameOver',
      players: P5,
      spyCount: 2,
      winner: 'spies',
      successes: 1,
      fails: 3,
    }),
    phones: ['c0', 'c1'],
  },
  {
    id: 'party-closed',
    label: 'Session Ended (phone)',
    note: 'When the host adjourns, every phone — even one that was offline during the close — lands here on its next snapshot, not a frozen board.',
    snapshot: { ...snap({ phase: 'proposalVote', ...inRound, proposedTeam: [1, 3] }), closed: true },
    phones: ['c0'],
    hideBig: true,
  },
  {
    id: 'party-practice-role',
    label: 'Practice — role reveal',
    note: 'Practice deals throwaway roles. Tap "Reveal my role": phones show a PRACTICE label; the big screen carries the practice banner + a live "start the real game" control.',
    snapshot: { ...snap({ phase: 'roleReveal', ...inRound }, { roleAcks: [3] }), game: { ...makeGame({ phase: 'roleReveal', ...inRound }), practice: true } },
    phones: ['c1', 'c0'],
  },
  {
    id: 'party-practice-round',
    label: 'Practice — round in progress',
    note: 'A practice round mid-flight (nothing counts). The big screen shows the practice banner and "start the real game"; live: tap it to re-deal real roles.',
    snapshot: { ...snap({ phase: 'proposalVote', ...inRound, proposedTeam: [1, 3] }, { ballots: { 2: 'approve' } }), game: { ...makeGame({ phase: 'proposalVote', ...inRound, proposedTeam: [1, 3] }), practice: true } },
    phones: ['c0'],
  },
]

interface Stage {
  host: PartyHost
  clients: PartyClient[]
}

/** Mounts a live in-memory room seeded with the scenario snapshot and renders
 *  the real BigScreen + PhoneScreen components against it. */
export function PartyStage({ scenario }: { scenario: PartyScenario }) {
  const [stage, setStage] = useState<Stage | null>(null)

  useEffect(() => {
    if (scenario.joinForm) return
    const hub = createMemoryHub()
    let cancelled = false
    let built: Stage | null = null
    void hub
      .transport()
      .createRoom(scenario.snapshot)
      .then(() => {
        if (cancelled) return
        built = {
          host: new PartyHost(hub.transport(), scenario.snapshot),
          clients: scenario.phones.map(
            (clientId) => new PartyClient(hub.transport(), scenario.snapshot.code, clientId),
          ),
        }
        setStage(built)
      })
    return () => {
      cancelled = true
      built?.host.close()
      built?.clients.forEach((c) => c.close())
      setStage(null)
    }
  }, [scenario])

  if (scenario.joinForm) {
    return (
      <div className="flex flex-wrap items-start justify-center gap-6">
        <PhoneFrame>
          <JoinForm error={null} busy={false} onSubmit={() => {}} onBack={() => {}} />
        </PhoneFrame>
      </div>
    )
  }

  if (!stage) return null

  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      {!scenario.hideBig && (
        <div className="h-[560px] w-[840px] shrink-0 overflow-y-auto rounded-card border-4 border-line shadow-pop">
          <div className="bg-backdrop flex min-h-full flex-col items-center text-ink">
            <BigScreen host={stage.host} onClose={() => {}} revealStepMs={scenario.revealStepMs} />
          </div>
        </div>
      )}
      {stage.clients.map((client) => (
        <PhoneFrame key={client.clientId}>
          <PhoneScreen client={client} onLeave={() => {}} />
        </PhoneFrame>
      ))}
    </div>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[560px] w-[300px] shrink-0 overflow-y-auto rounded-[2rem] border-4 border-line shadow-pop">
      <div className="bg-backdrop flex min-h-full flex-col items-center text-ink">{children}</div>
    </div>
  )
}
