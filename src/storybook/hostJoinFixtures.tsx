// Host & Join storybook scenarios: one live in-memory room per phase, rendered
// as the HOST phone (board + its own role + gated control buttons) beside a
// PLAYER phone. Real PartyHost + PartyClient over the memory transport, so the
// frames are interactive with no backend — vote on the player phone and the
// host's reveal button ungates, tap it and both flip. Alice (c0) is the host.

import { useEffect, useState } from 'react'
import { initialState } from '../engine'
import type { GameState, Player } from '../engine'
import { PartyClient } from '../party/client'
import { PartyHost } from '../party/host'
import { createMemoryHub } from '../party/memoryTransport'
import { emptyNet } from '../party/protocol'
import type { NetMeta, RoomSnapshot, Seat } from '../party/protocol'
import { HostBoard, JoinerBoard } from '../party/react/HostJoinScreen'

export interface HostJoinScenario {
  id: string
  label: string
  note?: string
  snapshot: RoomSnapshot
  /** clientId of the joiner phone shown beside the host (omit for lobby-only). */
  joiner?: string
  /** Static reveal (0 = instant) for the settled mission-reveal frame. */
  revealStepMs?: number
}

const CODE = 'ROOM'

// Alice (c0) is the HOST and a player; Bob & Eve are spies.
const P5: Player[] = [
  { id: 0, name: 'Alice', role: 'resistance' },
  { id: 1, name: 'Bob', role: 'spy' },
  { id: 2, name: 'Charlie', role: 'resistance' },
  { id: 3, name: 'Diana', role: 'resistance' },
  { id: 4, name: 'Eve', role: 'spy' },
]
const SEATS: Seat[] = P5.map((p) => ({ playerId: p.id, clientId: `c${p.id}`, name: p.name }))
const HOST_CLIENT = 'c0'

function makeGame(o: Partial<GameState>): GameState {
  return { ...initialState(), ...o }
}
function snap(game: Partial<GameState>, net: Partial<NetMeta> = {}, seats: Seat[] = SEATS): RoomSnapshot {
  return { v: 1, code: CODE, game: makeGame(game), seats, net: { ...emptyNet(), ...net }, mode: 'hostAndJoin' }
}

const inRound = { players: P5, spyCount: 2, round: 1, leaderIndex: 0 }

export const hostJoinScenarios: HostJoinScenario[] = [
  {
    id: 'hj-lobby',
    label: 'Lobby (host + player)',
    note: 'The host phone (Alice) shows the code, the seat list and the Start button; joiners see the same board with a Leave button. Live: Start really deals roles.',
    snapshot: snap({ phase: 'setup' }, {}, SEATS.slice(0, 3)),
    joiner: 'c1',
  },
  {
    id: 'hj-role',
    label: 'Role Reveal (host is a spy? no — Alice is Resistance)',
    note: 'Both phones peek their own role. Alice (host, Resistance) sees only her role; Bob (player, Spy) sees fellow spy Eve. The host also holds "Begin the missions", gated on nothing (acks optional).',
    snapshot: snap({ phase: 'roleReveal', ...inRound }, { roleAcks: [2, 3] }),
    joiner: 'c1',
  },
  {
    id: 'hj-proposal',
    label: 'Team Proposal (host leads)',
    note: 'Alice is leader → her phone gets the picker; the player phone waits. Live: submit to advance to the ballot.',
    snapshot: snap({ phase: 'teamProposal', ...inRound }),
    joiner: 'c1',
  },
  {
    id: 'hj-vote',
    label: 'Secret Vote + pending',
    note: 'Every phone (host included) casts its own secret ballot. The host’s "Reveal the votes" stays DISABLED until all are in — the host’s own vote included. Pending list names who’s left.',
    snapshot: snap({ phase: 'proposalVote', ...inRound, proposedTeam: [0, 3] }, { ballots: { 2: 'approve', 4: 'reject' } }),
    joiner: 'c1',
  },
  {
    id: 'hj-vote-locked',
    label: 'Secret Vote — all in',
    note: 'All ballots (host included) are in; the host’s Reveal button is now enabled. Live: tap it to flip the verdicts.',
    snapshot: snap(
      { phase: 'proposalVote', ...inRound, proposedTeam: [0, 3] },
      { ballots: { 0: 'approve', 1: 'approve', 2: 'approve', 3: 'reject', 4: 'reject' } },
    ),
    joiner: 'c1',
  },
  {
    id: 'hj-vote-revealed',
    label: 'Secret Vote — revealed',
    note: 'Host flipped the ballots: per-player verdicts and the outcome. The host’s button becomes Continue → resolve.',
    snapshot: snap(
      { phase: 'proposalVote', ...inRound, proposedTeam: [0, 3] },
      {
        ballots: { 0: 'approve', 1: 'approve', 2: 'approve', 3: 'reject', 4: 'reject' },
        votesRevealed: true,
      },
    ),
    joiner: 'c1',
  },
  {
    id: 'hj-mission',
    label: 'Mission + pending',
    note: 'Alice (host) is on the team → her phone shows Succeed (Resistance, no Fail). Bob (player, spy, on team) has already played, so the pending list shows only Alice.',
    snapshot: snap({ phase: 'mission', ...inRound, proposedTeam: [0, 1], missionCards: { 1: 'fail' } }),
    joiner: 'c1',
  },
  {
    id: 'hj-mission-staged',
    label: 'Mission Reveal — staged flip',
    note: 'Cards flip one at a time, successes first and fails LAST — by outcome, never by seat. The host’s Continue stays disabled until the flip settles. Re-select to replay.',
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
    joiner: 'c1',
  },
  {
    id: 'hj-gameover',
    label: 'Game Over',
    note: 'Both phones show the verdict, their own allegiance, and can unseal every role. The host also gets "Back to the lobby".',
    snapshot: snap({ phase: 'gameOver', players: P5, spyCount: 2, winner: 'spies', successes: 1, fails: 3 }),
    joiner: 'c1',
  },
  {
    id: 'hj-practice-role',
    label: 'Practice — role reveal',
    note: 'Practice deals throwaway roles. Both phones show a PRACTICE label + banner; the host phone carries "Begin the missions" and (once in-game) "Start the real game".',
    snapshot: snap({ phase: 'roleReveal', ...inRound, practice: true }, { roleAcks: [3] }),
    joiner: 'c1',
  },
  {
    id: 'hj-practice-round',
    label: 'Practice — round in progress',
    note: 'A practice round mid-flight (nothing counts). Every phone shows the practice banner; the host phone holds "Start the real game" — live: tap it to re-deal real roles.',
    snapshot: snap({ phase: 'teamProposal', ...inRound, round: 3, leaderIndex: 1, practice: true }),
    joiner: 'c1',
  },
]

interface Stage {
  host: PartyHost
  client: PartyClient | null
}

/** Mounts a live in-memory Host & Join room and renders the real HostBoard +
 *  JoinerBoard against it. */
export function HostJoinStage({ scenario }: { scenario: HostJoinScenario }) {
  const [stage, setStage] = useState<Stage | null>(null)

  useEffect(() => {
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
          client: scenario.joiner
            ? new PartyClient(hub.transport(), scenario.snapshot.code, scenario.joiner)
            : null,
        }
        setStage(built)
      })
    return () => {
      cancelled = true
      built?.host.close()
      built?.client?.close()
      setStage(null)
    }
  }, [scenario])

  if (!stage) return null

  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <PhoneFrame label="Host phone">
        <HostBoard
          host={stage.host}
          hostClientId={HOST_CLIENT}
          onEnd={() => {}}
          stepMs={scenario.revealStepMs}
        />
      </PhoneFrame>
      {stage.client && (
        <PhoneFrame label="Player phone">
          <JoinerBoard client={stage.client} onLeave={() => {}} stepMs={scenario.revealStepMs} />
        </PhoneFrame>
      )}
    </div>
  )
}

function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-label text-faint">{label}</span>
      <div className="h-[680px] w-[320px] shrink-0 overflow-y-auto rounded-[2rem] border-4 border-line shadow-pop">
        <div className="bg-backdrop flex min-h-full flex-col items-center text-ink">{children}</div>
      </div>
    </div>
  )
}
