// DEV-ONLY "AI Mode" harness (Storybook section): one live in-memory room shown
// from EVERY perspective at once, driven by scripted bots. Reuses the real
// BigScreen / PhoneScreen (Party) and HostBoard / JoinerBoard (Host & Join)
// unchanged — the harness just mounts many of them against one shared hub and
// gives run controls, play-a-seat, and leave/rejoin affordances.
//
// The bots + room driving live in the pure, tested `RoomController` (../party
// /scenarios.ts); this file is only presentation + wiring.

import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { BigScreen } from '../party/react/BigScreen'
import { HostBoard, JoinerBoard } from '../party/react/HostJoinScreen'
import { PhoneScreen } from '../party/react/PhoneScreen'
import { useHostSnapshot } from '../party/react/hooks'
import { RoomController, SCENARIOS, getScenario } from '../party/scenarios'
import type { Scenario } from '../party/bots'
import type { PartyClient } from '../party/client'

export interface AiScenarioMeta {
  id: string
  label: string
  note: string
}

/** Sidebar entries for the AI Mode section (one per shipped scenario). */
export const aiScenarios: AiScenarioMeta[] = SCENARIOS.map((s) => ({
  id: s.id,
  label: s.label,
  note: s.note,
}))

const PHASE_ORDER = [
  'setup',
  'roleReveal',
  'teamProposal',
  'proposalVote',
  'mission',
  'missionReveal',
  'gameOver',
] as const

// ── Control panel (re-renders live off the host snapshot) ──────────────────────

function ControlPanel({
  ctrl,
  controlled,
  setControlled,
  onReset,
  onMutate,
}: {
  ctrl: RoomController
  controlled: number | null
  setControlled: (id: number | null) => void
  onReset: () => void
  /** Bumped after any action so BOTH the panel and the perspectives grid
   *  re-render — some actions (disconnect/reclaim) don't change the host
   *  snapshot, so a subscription alone wouldn't catch them. */
  onMutate: () => void
}) {
  const snapshot = useHostSnapshot(ctrl.host)
  const { game } = snapshot
  const phase = game.phase
  const inLobby = phase === 'setup'
  const over = phase === 'gameOver'
  const rerender = onMutate

  return (
    <div className="w-full max-w-3xl rounded-card border border-line bg-surface/80 p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-label text-faint">
          {ctrl.scenario.mode === 'party' ? 'Party' : 'Host & Join'} · {game.players.length ||
            snapshot.seats.length}{' '}
          seats · {phase}
        </span>
        {game.winner && (
          <span
            className={`font-mono text-xs uppercase tracking-label ${
              game.winner === 'resistance' ? 'text-accent' : 'text-danger'
            }`}
          >
            {game.winner} win
          </span>
        )}
      </div>

      {/* Phase progress dots. */}
      <div className="mt-3 flex gap-1">
        {PHASE_ORDER.map((p) => (
          <span
            key={p}
            className={`h-1.5 flex-1 rounded-full ${
              p === phase ? 'bg-accent' : PHASE_ORDER.indexOf(p) < PHASE_ORDER.indexOf(phase) ? 'bg-line-strong' : 'bg-raised'
            }`}
          />
        ))}
      </div>

      {/* Run controls. */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          className="!py-2 !text-sm"
          disabled={over}
          onClick={() => {
            ctrl.step(controlled ?? undefined)
            rerender()
          }}
        >
          Step bots
        </Button>
        <Button
          variant="neutral"
          className="!py-2 !text-sm"
          disabled={over}
          onClick={() => {
            ctrl.run(controlled ?? undefined)
            rerender()
          }}
        >
          Run to end
        </Button>
        <Button variant="neutral" className="!py-2 !text-sm" onClick={onReset}>
          Reset
        </Button>
        {over && (
          <Button
            variant="neutral"
            className="!py-2 !text-sm"
            onClick={() => {
              ctrl.host.backToLobby()
              rerender()
            }}
          >
            Back to lobby
          </Button>
        )}
      </div>

      {/* Play-a-seat picker. */}
      <div className="mt-4">
        <p className="mb-1 font-mono text-xs uppercase tracking-label text-faint">
          Control a seat (bots fill the rest)
        </p>
        <div className="flex flex-wrap gap-2">
          <SeatChip active={controlled === null} onClick={() => setControlled(null)}>
            Bots only
          </SeatChip>
          {snapshot.seats.map((s) => (
            <SeatChip
              key={s.clientId}
              active={controlled === s.playerId}
              onClick={() => setControlled(s.playerId)}
            >
              {s.name}
              {ctrl.scenario.mode === 'hostAndJoin' && s.playerId === 0 ? ' (host)' : ''}
            </SeatChip>
          ))}
        </div>
      </div>

      {/* Leave / disconnect / reclaim affordances, per seat. */}
      <div className="mt-4">
        <p className="mb-1 font-mono text-xs uppercase tracking-label text-faint">
          {inLobby ? 'Lobby leave' : 'Disconnect / reclaim (mid-game)'}
        </p>
        <div className="flex flex-wrap gap-2">
          {snapshot.seats.map((s) => {
            const isHostSeat = ctrl.scenario.mode === 'hostAndJoin' && s.playerId === 0
            const connected = ctrl.clients.has(s.playerId) || isHostSeat
            return (
              <div key={s.clientId} className="flex items-center gap-1">
                {inLobby ? (
                  <SeatChip
                    disabled={isHostSeat}
                    onClick={() => {
                      ctrl.leaveLobby(s.playerId)
                      if (controlled === s.playerId) setControlled(null)
                      rerender()
                    }}
                  >
                    {s.name} leaves
                  </SeatChip>
                ) : connected ? (
                  <SeatChip
                    disabled={isHostSeat}
                    onClick={() => {
                      ctrl.disconnect(s.playerId)
                      rerender()
                    }}
                  >
                    {s.name} disconnects
                  </SeatChip>
                ) : (
                  <SeatChip
                    onClick={() => {
                      void ctrl.reclaim(s.playerId).then(rerender)
                    }}
                  >
                    {s.name} rejoins
                  </SeatChip>
                )}
              </div>
            )
          })}
        </div>
        {!inLobby && (
          <p className="mt-2 text-xs italic text-muted">
            Disconnect closes a seat’s device (its perspective goes blank) but keeps the seat.
            Rejoin reclaims it by name at the current phase with the same role — watch it resume
            while the others are unaffected.
          </p>
        )}
      </div>
    </div>
  )
}

function SeatChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-chip border px-3 py-1.5 font-mono text-xs uppercase tracking-label transition duration-fast ease-theme active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-line bg-raised text-muted hover:border-line-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

// ── Perspective frames ─────────────────────────────────────────────────────────

function BigFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-label text-faint">{label}</span>
      <div className="h-[520px] w-[720px] shrink-0 overflow-y-auto rounded-card border-4 border-line shadow-pop">
        <div className="bg-backdrop flex min-h-full flex-col items-center text-ink">{children}</div>
      </div>
    </div>
  )
}

function PhoneFrame({ label, dim, children }: { label: string; dim?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-mono text-xs uppercase tracking-label text-faint">{label}</span>
      <div
        className={`h-[520px] w-[280px] shrink-0 overflow-y-auto rounded-[2rem] border-4 shadow-pop ${
          dim ? 'border-danger/40 opacity-50' : 'border-line'
        }`}
      >
        <div className="bg-backdrop flex min-h-full flex-col items-center text-ink">{children}</div>
      </div>
    </div>
  )
}

/** A disconnected seat's frame: blank device (its client is closed). */
function BlankPhone({ label }: { label: string }) {
  return (
    <PhoneFrame label={label} dim>
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-mono text-xs uppercase tracking-label text-faint">Disconnected</p>
        <p className="text-sm text-muted">This device left the room. Rejoin from the controls.</p>
      </div>
    </PhoneFrame>
  )
}

/** The grid of every perspective. `revision` forces a re-render on control
 *  actions that don't alter the host snapshot (disconnect/reclaim). */
function Perspectives({
  ctrl,
  controlled,
  revision,
}: {
  ctrl: RoomController
  controlled: number | null
  revision: number
}) {
  void revision
  // Subscribe so the grid also re-renders when seats appear/leave (blank frames etc.).
  const snapshot = useHostSnapshot(ctrl.host)
  const mode = ctrl.scenario.mode
  const seatName = (seatId: number) =>
    snapshot.seats.find((s) => s.playerId === seatId)?.name ?? `Seat ${seatId}`

  return (
    <div className="flex flex-wrap items-start justify-center gap-5">
      {mode === 'party' ? (
        <BigFrame label="Big screen (host)">
          <BigScreen host={ctrl.host} onClose={() => {}} />
        </BigFrame>
      ) : (
        <PhoneFrame label={`${seatName(0)} — host phone${controlled === 0 ? ' · YOU' : ''}`}>
          <HostBoard host={ctrl.host} hostClientId={RoomController.HOST_CLIENT} onEnd={() => {}} />
        </PhoneFrame>
      )}

      {/* One phone per player seat. In Host & Join seat 0 is the host phone above. */}
      {snapshot.seats
        .filter((s) => !(mode === 'hostAndJoin' && s.playerId === 0))
        .map((s) => {
          const client = ctrl.clients.get(s.playerId)
          const label = `${s.name}${controlled === s.playerId ? ' · YOU' : ''}`
          if (!client) return <BlankPhone key={s.clientId} label={label} />
          return (
            <PhoneFrame key={s.clientId} label={label}>
              <PlayerPerspective client={client} mode={mode} />
            </PhoneFrame>
          )
        })}
    </div>
  )
}

/** Renders the correct player shell for the room's mode. Both are the real,
 *  unchanged components — the same a human would drive. */
function PlayerPerspective({ client, mode }: { client: PartyClient; mode: Scenario['mode'] }) {
  return mode === 'party' ? (
    <PhoneScreen client={client} onLeave={() => {}} />
  ) : (
    <JoinerBoard client={client} onLeave={() => {}} />
  )
}

// ── The harness ────────────────────────────────────────────────────────────────

/** One live, bot-driven room shown from every perspective, with run + play-a-seat
 *  + leave/rejoin controls. Keyed by scenario id + a nonce so re-selecting starts
 *  fresh. */
export function AiHarness({ scenarioId, resetNonce }: { scenarioId: string; resetNonce: number }) {
  const [ctrl, setCtrl] = useState<RoomController | null>(null)
  const [controlled, setControlled] = useState<number | null>(null)
  // A local reset bumps this to rebuild the controller without leaving the item.
  const [localReset, setLocalReset] = useState(0)
  // Bumped by every control action so the perspectives grid re-renders even when
  // the action (disconnect/reclaim) leaves the host snapshot unchanged.
  const [revision, setRevision] = useState(0)
  const ctrlRef = useRef<RoomController | null>(null)

  useEffect(() => {
    const scenario = getScenario(scenarioId)
    if (!scenario) return
    let cancelled = false
    setCtrl(null)
    setControlled(null)
    void RoomController.open(scenario).then((c) => {
      if (cancelled) {
        c.close()
        return
      }
      ctrlRef.current = c
      setCtrl(c)
    })
    return () => {
      cancelled = true
      ctrlRef.current?.close()
      ctrlRef.current = null
    }
  }, [scenarioId, resetNonce, localReset])

  if (!ctrl) return null

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <ControlPanel
        ctrl={ctrl}
        controlled={controlled}
        setControlled={setControlled}
        onReset={() => setLocalReset((n) => n + 1)}
        onMutate={() => setRevision((n) => n + 1)}
      />
      <Perspectives ctrl={ctrl} controlled={controlled} revision={revision} />
    </div>
  )
}
