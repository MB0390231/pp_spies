// Presentation shared by BOTH Party Mode and Host & Join. The reveal beat
// (fail-last staged cards), the "who's still to act" nudge, fellow-spy
// visibility, and the per-phase PRIVATE controls (role card, leader picker,
// ballot, mission card) all live here so both modes render them identically —
// Party's big screen and every Host & Join phone use the same components.
//
// Controls act through a SeatController, not a concrete client, so the exact
// same UI drives a remote PartyClient (Party joiner / H&J joiner) and the
// host's own seat (H&J host, whose intents go through PartyHost.dispatchIntent).

import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { currentLeaderId, currentTeamSize } from '../../engine'
import type { GameState, MissionCard, MissionResult } from '../../engine'
import { fmt, useLexicon } from '../../theme'
import { fellowSpies, revealOrder } from '../protocol'
import type { Ballot, RoomSnapshot, Seat } from '../protocol'

/**
 * The private actions a seated player can take. Implemented by `PartyClient`
 * (remote) and by a thin host adapter over `PartyHost.dispatchIntent` (local).
 * Presentation depends only on this, never on which side owns the engine.
 */
export interface SeatController {
  ackRole(): void
  proposeTeam(team: number[]): void
  vote(ballot: Ballot): void
  playCard(card: MissionCard): void
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-sm uppercase tracking-label text-faint">{children}</p>
}

export function names(game: GameState, ids: number[]): string {
  return ids
    .map((id) => game.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(', ')
}

/** Names of players still to act. Reveals only WHO is outstanding — never their
 *  sealed ballot or card. `size` tunes the chip scale for board vs phone. */
export function PendingActors({ names: pending, size = 'md' }: { names: string[]; size?: 'sm' | 'md' }) {
  const lex = useLexicon()
  if (pending.length === 0) return null
  const chip =
    size === 'sm'
      ? 'px-2.5 py-1 text-xs'
      : 'px-3 py-1.5 text-sm'
  return (
    <div className="text-center">
      <Eyebrow>{lex.party.host.waitingOn}</Eyebrow>
      <div className="mt-2 flex max-w-2xl flex-wrap justify-center gap-1.5">
        {pending.map((name) => (
          <span
            key={name}
            className={`animate-pulse rounded-chip border border-line-strong bg-raised font-semibold text-muted ${chip}`}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Names of the other spies, shown only on a spy's own role card (classic rule). */
export function FellowSpies({ snapshot, seat }: { snapshot: RoomSnapshot; seat: Seat }) {
  const lex = useLexicon()
  const others = fellowSpies(snapshot, seat.playerId)
  if (others.length === 0) {
    return <p className="text-sm italic text-faint">{lex.party.player.soloSpy}</p>
  }
  return (
    <div className="text-center">
      <Eyebrow>{lex.party.player.fellowSpies}</Eyebrow>
      <div className="mt-2 flex max-w-xs flex-wrap justify-center gap-2">
        {others.map((name) => (
          <span
            key={name}
            className="rounded-chip border border-danger/50 bg-danger/10 px-3 py-1.5 text-sm font-semibold text-danger"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

const CARD_STEP_MS = 620

/**
 * Dramatic mission reveal: cards start face-down, then flip one at a time with
 * suspense, ordered successes-first / fails-last for a climactic finish. Order
 * comes from `revealOrder` — strictly by outcome, NEVER by seat — so a viewer
 * learns the count of fails but never who played them. `stepMs=0` reveals all
 * at once (storybook static frames).
 */
export function StagedCards({
  mission,
  revealed,
  stepMs = CARD_STEP_MS,
  onComplete,
}: {
  mission: MissionResult
  revealed: boolean
  stepMs?: number
  /** Called once the last card has flipped (drives the outcome verdict). */
  onComplete?: (done: boolean) => void
}) {
  const total = mission.team.length
  const order = useMemo(() => revealOrder(mission.failCount, total), [mission.failCount, total])
  const [flipped, setFlipped] = useState(revealed && stepMs === 0 ? total : 0)

  useEffect(() => {
    if (!revealed) {
      setFlipped(0)
      onComplete?.(false)
      return
    }
    if (stepMs === 0) {
      setFlipped(total)
      onComplete?.(true)
      return
    }
    setFlipped(0)
    onComplete?.(false)
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setFlipped(i)
      if (i >= total) {
        clearInterval(timer)
        onComplete?.(true)
      }
    }, stepMs)
    return () => clearInterval(timer)
    // onComplete is a stable setter from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, total, stepMs])

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {order.map((card, i) => {
        const isFlipped = i < flipped
        return (
          <div
            key={i}
            className={`flex h-24 w-16 items-center justify-center rounded-field text-3xl font-bold transition-all duration-base ease-spring ${
              isFlipped
                ? card === 'fail'
                  ? 'animate-pop bg-danger text-danger-ink shadow-glow-danger'
                  : 'animate-pop bg-accent text-accent-ink shadow-glow-accent'
                : 'border border-line-strong bg-raised text-faint'
            }`}
          >
            {isFlipped ? (card === 'fail' ? '✘' : '✔') : '?'}
          </div>
        )
      })}
    </div>
  )
}

// ── Private per-phase controls (driven by a SeatController) ────────────────────

/** Tap-to-peek role card + fellow-spy panel + "I've read it" ack. */
export function RoleCard({
  controller,
  snapshot,
  seat,
}: {
  controller: SeatController
  snapshot: RoomSnapshot
  seat: Seat
}) {
  const lex = useLexicon()
  const [peeking, setPeeking] = useState(false)
  const player = snapshot.game.players.find((p) => p.id === seat.playerId)
  if (!player) return null
  const isSpy = player.role === 'spy'
  const acked = snapshot.net.roleAcks.includes(seat.playerId)
  const practice = snapshot.game.practice

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      {practice && (
        <span className="rounded-chip border border-line-strong bg-raised px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-label text-muted">
          {lex.scoreTrack.practiceTag}
        </span>
      )}
      <Eyebrow>{practice ? lex.practice.roleEyebrow : lex.roleReveal.eyebrow}</Eyebrow>
      {peeking ? (
        <>
          <h2
            className={`animate-pop font-display text-5xl font-extrabold uppercase ${
              isSpy ? 'text-danger' : 'text-accent'
            }`}
          >
            {isSpy ? lex.roleReveal.badTitle : lex.roleReveal.goodTitle}
          </h2>
          <p className="max-w-xs leading-relaxed text-muted">
            {isSpy ? lex.roleReveal.badBody : lex.roleReveal.goodBody}
          </p>
          {isSpy && <FellowSpies snapshot={snapshot} seat={seat} />}
        </>
      ) : (
        <div className="flex h-40 w-28 items-center justify-center rounded-field border border-line-strong bg-raised text-4xl font-bold text-faint">
          ?
        </div>
      )}
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button variant="neutral" onClick={() => setPeeking((v) => !v)}>
          {peeking ? lex.party.player.hideRole : lex.party.player.viewRole}
        </Button>
        {acked ? (
          <p className="font-mono text-xs uppercase tracking-label text-faint">
            {lex.party.player.waitingRoles}
          </p>
        ) : (
          <Button onClick={() => controller.ackRole()}>{lex.party.player.ready}</Button>
        )}
      </div>
    </div>
  )
}

/** The leader's team picker — emits a proposeTeam intent through the controller. */
export function LeaderPicker({ controller, game }: { controller: SeatController; game: GameState }) {
  const lex = useLexicon()
  const [selected, setSelected] = useState<number[]>([])
  const required = currentTeamSize(game)

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < required
          ? [...prev, id]
          : prev,
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="text-center">
        <Eyebrow>{lex.proposal.eyebrow}</Eyebrow>
        <p className="mt-2 text-muted">{fmt(lex.proposal.instruction, { count: required })}</p>
        <p className="mt-1 font-mono text-xs uppercase tracking-label text-faint">
          {fmt(lex.proposal.counter, { selected: selected.length, count: required })}
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {game.players.map((p) => {
          const on = selected.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`relative rounded-field border-2 px-4 py-4 text-lg font-semibold transition duration-fast ease-theme active:scale-[0.97] ${
                on
                  ? 'border-accent bg-accent/15 text-accent shadow-glow-accent'
                  : 'border-line bg-surface text-ink hover:border-line-strong'
              }`}
            >
              {p.name}
              {p.id === currentLeaderId(game) && (
                <span className="absolute -top-2 right-2 rounded-chip border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-muted">
                  {lex.proposal.leaderBadge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Button
        onClick={() => {
          controller.proposeTeam(selected)
          setSelected([])
        }}
        disabled={selected.length !== required}
        className="w-full max-w-sm"
      >
        {lex.proposal.cta}
      </Button>
    </div>
  )
}

/** The secret-ballot buttons (pre-vote) — emits a vote intent. */
export function BallotButtons({ controller }: { controller: SeatController }) {
  const lex = useLexicon()
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Button onClick={() => controller.vote('approve')}>{lex.party.player.approve}</Button>
      <Button variant="danger" onClick={() => controller.vote('reject')}>
        {lex.party.player.reject}
      </Button>
    </div>
  )
}

/** The mission-card buttons (pre-play) — emits a playCard intent. Resistance
 *  sees only Succeed; spies additionally get Fail. */
export function MissionButtons({
  controller,
  isSpy,
}: {
  controller: SeatController
  isSpy: boolean
}) {
  const lex = useLexicon()
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Button onClick={() => controller.playCard('success')}>{lex.mission.succeed}</Button>
      {isSpy ? (
        <Button variant="danger" onClick={() => controller.playCard('fail')}>
          {lex.mission.fail}
        </Button>
      ) : (
        <p className="text-xs leading-relaxed text-faint">{lex.mission.lockedHint}</p>
      )}
    </div>
  )
}
