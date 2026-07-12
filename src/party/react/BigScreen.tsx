// Party Mode's shared display: renders the PUBLIC face of the room from the
// host's authoritative snapshot, plus the host's control buttons (start,
// reveal votes, reveal cards, continue). Never shows anything private — roles,
// individual ballots and cards stay face-down until the host flips them.
//
// This is presentation only. All authority lives in PartyHost; Host & Join
// will later render the same session with a different (phone) skin.

import { useMemo, useState } from 'react'
import { Button } from '../../components/Button'
import { ScoreTrack } from '../../components/ScoreTrack'
import {
  MIN_PLAYERS,
  currentLeaderId,
  currentTeamSize,
  failsToFail,
  isValidPlayerCount,
} from '../../engine'
import type { Phase } from '../../engine'
import { fmt, useLexicon, useTheme } from '../../theme'
import type { PartyHost } from '../host'
import { cardsIn, pendingCardPlayers, pendingVoters, voteTally } from '../protocol'
import type { RoomSnapshot } from '../protocol'
import { useHostSnapshot } from './hooks'
import { Eyebrow, PendingActors, StagedCards, names } from './shared'

const IN_GAME: ReadonlySet<Phase> = new Set<Phase>([
  'teamProposal',
  'proposalVote',
  'mission',
  'missionReveal',
])

function Lobby({ host, snapshot, onClose }: { host: PartyHost; snapshot: RoomSnapshot; onClose: () => void }) {
  const lex = useLexicon()
  const { hardMode } = useTheme()
  const joinUrl = useMemo(
    () => (typeof window === 'undefined' ? '' : window.location.host + window.location.pathname),
    [],
  )
  const canStart = isValidPlayerCount(snapshot.seats.length)

  return (
    <div className="flex w-full flex-1 animate-rise flex-col items-center gap-6 p-8 text-center">
      <Eyebrow>{lex.party.host.roomCode}</Eyebrow>
      <p className="font-display text-7xl font-extrabold tracking-[0.3em] text-ink">
        {snapshot.code}
      </p>
      <p className="max-w-md text-muted">{fmt(lex.party.host.joinHint, { url: joinUrl })}</p>

      <div className="w-full max-w-2xl rounded-card border border-line bg-surface/80 p-5 shadow-card">
        <Eyebrow>{fmt(lex.party.host.players, { count: snapshot.seats.length })}</Eyebrow>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {snapshot.seats.map((seat) => (
            <span
              key={seat.clientId}
              className="animate-pop rounded-chip border border-line bg-raised px-4 py-2 text-lg font-semibold text-ink"
            >
              {seat.name}
            </span>
          ))}
          {snapshot.seats.length === 0 && (
            <span className="text-sm italic text-faint">
              {fmt(lex.party.host.needPlayers, { min: MIN_PLAYERS })}
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto flex w-full max-w-sm flex-col gap-3">
        <Button onClick={() => host.startGame(Date.now(), hardMode)} disabled={!canStart}>
          {canStart
            ? lex.party.host.start
            : fmt(lex.party.host.needPlayers, { min: MIN_PLAYERS })}
        </Button>
        <Button
          variant="neutral"
          onClick={() => host.startPractice(Date.now(), hardMode)}
          disabled={!canStart}
        >
          {lex.practice.start}
        </Button>
        <p className="text-xs italic text-muted">{lex.practice.lobbyHint}</p>
        <Button variant="ghost" onClick={onClose}>
          {lex.party.host.closeRoom}
        </Button>
      </div>
    </div>
  )
}

/**
 * Host-only quit in the big-screen header. Present during the in-game phases,
 * where the Lobby / Game Over "Close room" buttons aren't on screen — so the
 * host is never trapped mid-game. Tap-to-confirm guards against an accidental
 * close on a shared screen; closing publishes a `closed` snapshot that sends
 * every player's phone back to the menu.
 */
function HeaderQuit({ onClose }: { onClose: () => void }) {
  const lex = useLexicon()
  const [confirm, setConfirm] = useState(false)

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="rounded-control border border-line bg-surface/80 px-3 py-1.5 font-mono text-xs uppercase tracking-label text-muted transition duration-fast ease-theme hover:border-danger hover:text-danger active:scale-95"
      >
        {lex.party.host.closeRoom}
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span className="hidden font-mono text-xs uppercase tracking-label text-faint sm:inline">
        {lex.party.host.closeConfirm}
      </span>
      <button
        type="button"
        onClick={onClose}
        className="rounded-control border border-danger bg-danger/15 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-label text-danger transition duration-fast ease-theme hover:brightness-110 active:scale-95"
      >
        {lex.party.host.closeRoom}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="rounded-control border border-line bg-surface/80 px-3 py-1.5 font-mono text-xs uppercase tracking-label text-muted transition duration-fast ease-theme hover:border-line-strong hover:text-ink active:scale-95"
      >
        {lex.pause.cancel}
      </button>
    </div>
  )
}

/** Persistent practice banner + "start real game" control on the host screen. */
function PracticeBar({ host }: { host: PartyHost }) {
  const lex = useLexicon()
  return (
    <div className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-card border border-accent/50 bg-accent/10 px-5 py-3">
      <span className="font-mono text-xs uppercase tracking-label text-accent">
        {lex.practice.banner}
      </span>
      <Button
        variant="neutral"
        className="!py-2 !text-sm"
        onClick={() => host.startRealGame(Date.now())}
      >
        {lex.practice.startReal}
      </Button>
    </div>
  )
}

function RolePhase({ host, snapshot }: { host: PartyHost; snapshot: RoomSnapshot }) {
  const lex = useLexicon()
  return (
    <div className="flex w-full flex-1 animate-rise flex-col items-center justify-center gap-6 p-8 text-center">
      <h2 className="font-display text-5xl font-extrabold text-ink">{lex.party.host.roleTitle}</h2>
      <p className="max-w-md text-lg text-muted">{lex.party.host.roleBody}</p>
      <Eyebrow>
        {fmt(lex.party.host.roleReady, {
          ready: snapshot.net.roleAcks.length,
          total: snapshot.game.players.length,
        })}
      </Eyebrow>
      <Button className="w-full max-w-sm" onClick={() => host.beginRounds()}>
        {lex.party.host.begin}
      </Button>
    </div>
  )
}

function ProposalPhase({ snapshot }: { snapshot: RoomSnapshot }) {
  const lex = useLexicon()
  const game = snapshot.game
  const leaderId = currentLeaderId(game)
  const leader = game.players.find((p) => p.id === leaderId)
  const required = currentTeamSize(game)

  return (
    <div className="flex w-full flex-1 animate-rise flex-col items-center justify-center gap-6 p-8 text-center">
      <Eyebrow>{lex.proposal.eyebrow}</Eyebrow>
      <h2 className="font-display text-4xl font-bold text-ink">
        {fmt(lex.party.host.proposalWaiting, { name: leader?.name ?? '' })}
      </h2>
      <p className="text-muted">
        {fmt(lex.party.host.proposalHint, { name: leader?.name ?? '', count: required })}
      </p>
      <div className="flex max-w-2xl flex-wrap justify-center gap-2">
        {game.players.map((p) => (
          <span
            key={p.id}
            className={`relative rounded-chip border px-4 py-2 text-lg font-semibold ${
              p.id === leaderId
                ? 'border-line-strong bg-raised text-ink shadow-card'
                : 'border-line bg-surface text-muted'
            }`}
          >
            {p.name}
            {p.id === leaderId && (
              <span className="absolute -top-2 right-2 rounded-chip border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-muted">
                {lex.proposal.leaderBadge}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function VotePhase({ host, snapshot }: { host: PartyHost; snapshot: RoomSnapshot }) {
  const lex = useLexicon()
  const game = snapshot.game
  const tally = voteTally(snapshot)
  const revealed = snapshot.net.votesRevealed

  return (
    <div className="flex w-full flex-1 animate-rise flex-col items-center justify-center gap-6 p-8 text-center">
      <h2 className="font-display text-4xl font-bold text-ink">{lex.party.host.voteTitle}</h2>
      <div className="w-full max-w-xl rounded-card border border-line bg-surface/80 p-4 shadow-card">
        <Eyebrow>{lex.proposalVote.teamLabel}</Eyebrow>
        <p className="mt-1 text-xl font-semibold text-ink">{names(game, game.proposedTeam)}</p>
      </div>

      {/* One tile per seated player: pre-reveal shows only "ballot in"; the
          host's reveal flips each tile to its approve/reject verdict. */}
      <div className="flex max-w-2xl flex-wrap justify-center gap-2">
        {game.players.map((p) => {
          const ballot = snapshot.net.ballots[p.id]
          return (
            <span
              key={p.id}
              className={`flex items-center gap-2 rounded-chip border px-4 py-2 text-lg font-semibold transition duration-base ease-theme ${
                revealed && ballot === 'approve'
                  ? 'animate-pop border-accent bg-accent/15 text-accent'
                  : revealed && ballot === 'reject'
                    ? 'animate-pop border-danger bg-danger/15 text-danger'
                    : 'border-line bg-surface text-ink'
              }`}
            >
              {p.name}
              {!revealed && (
                <span className={`font-mono text-xs ${ballot ? 'text-accent' : 'text-faint'}`}>
                  {ballot ? '✔' : '…'}
                </span>
              )}
              {revealed && (
                <span className="font-mono text-xs uppercase tracking-label">
                  {ballot === 'approve' ? lex.party.player.approve : lex.party.player.reject}
                </span>
              )}
            </span>
          )
        })}
      </div>

      {revealed ? (
        <>
          <p
            className={`animate-pop font-display text-5xl font-extrabold uppercase ${
              tally.approved ? 'text-accent' : 'text-danger'
            }`}
          >
            {tally.approved ? lex.party.host.votePassed : lex.party.host.voteFailed}
          </p>
          <Button className="w-full max-w-sm" onClick={() => host.resolveProposal()}>
            {lex.party.host.continue}
          </Button>
        </>
      ) : (
        <>
          <Eyebrow>
            {tally.allIn
              ? lex.party.host.voteLocked
              : fmt(lex.party.host.voteProgress, { done: tally.done, total: tally.total })}
          </Eyebrow>
          {/* Who still owes a ballot — never how anyone voted. */}
          <PendingActors names={pendingVoters(snapshot)} />
          <Button
            className="w-full max-w-sm"
            disabled={!tally.allIn}
            onClick={() => host.revealVotes()}
          >
            {lex.party.host.revealVotes}
          </Button>
        </>
      )}
    </div>
  )
}

function MissionPhase({ snapshot }: { snapshot: RoomSnapshot }) {
  const lex = useLexicon()
  const game = snapshot.game
  const done = cardsIn(snapshot).length

  return (
    <div className="flex w-full flex-1 animate-rise flex-col items-center justify-center gap-6 p-8 text-center">
      <h2 className="font-display text-4xl font-bold text-ink">
        {fmt(lex.missionReveal.title, { round: game.round })}
      </h2>
      <div className="w-full max-w-xl rounded-card border border-line bg-surface/80 p-4 shadow-card">
        <Eyebrow>{lex.proposalVote.teamLabel}</Eyebrow>
        <p className="mt-1 text-xl font-semibold text-ink">{names(game, game.proposedTeam)}</p>
      </div>
      <Eyebrow>
        {fmt(lex.party.host.missionProgress, { done, total: game.proposedTeam.length })}
      </Eyebrow>
      <p className="text-muted">{lex.party.host.missionHint}</p>
      {/* Who still owes a card — never which card. */}
      <PendingActors names={pendingCardPlayers(snapshot)} />
    </div>
  )
}

function MissionRevealPhase({ host, snapshot, stepMs }: { host: PartyHost; snapshot: RoomSnapshot; stepMs?: number }) {
  const lex = useLexicon()
  const game = snapshot.game
  const mission = game.lastMission
  const revealed = snapshot.net.missionRevealed
  // Hold the verdict until the last card has flipped, for the climactic finish.
  const [settled, setSettled] = useState(false)
  if (!mission) return null

  const needed = failsToFail(game.players.length, mission.round)
  const failsLine =
    mission.failCount === 1
      ? lex.missionReveal.failsOne
      : fmt(lex.missionReveal.failsMany, { count: mission.failCount })

  return (
    <div className="flex w-full flex-1 animate-rise flex-col items-center justify-center gap-6 p-8 text-center">
      <h2 className="font-display text-4xl font-bold text-ink">
        {fmt(lex.missionReveal.title, { round: mission.round })}
      </h2>

      <StagedCards mission={mission} revealed={revealed} stepMs={stepMs} onComplete={setSettled} />

      {!revealed ? (
        <>
          <Eyebrow>{lex.missionReveal.allIn}</Eyebrow>
          <Button className="w-full max-w-sm" onClick={() => host.revealMission()}>
            {lex.missionReveal.showResults}
          </Button>
        </>
      ) : settled ? (
        <>
          <p
            className={`animate-pop font-display text-5xl font-extrabold uppercase ${
              mission.success ? 'text-accent' : 'text-danger'
            }`}
          >
            {mission.success ? lex.missionReveal.success : lex.missionReveal.failure}
          </p>
          <p className="animate-fade font-mono text-xs uppercase tracking-label text-faint">
            {failsLine}
            {needed > 1 && ` · ${fmt(lex.missionReveal.neededNote, { needed })}`}
          </p>
          <Button className="w-full max-w-sm" onClick={() => host.confirmMission()}>
            {lex.missionReveal.continue}
          </Button>
        </>
      ) : (
        // Cards mid-flip: suspense beat, no verdict yet.
        <Eyebrow>{lex.missionReveal.allIn}</Eyebrow>
      )}
    </div>
  )
}

function GameOverPhase({ host, snapshot, onClose }: { host: PartyHost; snapshot: RoomSnapshot; onClose: () => void }) {
  const lex = useLexicon()
  const game = snapshot.game
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<number>>(new Set())
  const resistanceWon = game.winner === 'resistance'
  const allRevealed = game.players.every((p) => revealedIds.has(p.id))

  return (
    <div className="flex w-full flex-1 animate-rise flex-col items-center gap-6 p-8 text-center">
      <Eyebrow>{lex.gameOver.eyebrow}</Eyebrow>
      <h2
        className={`animate-pop font-display text-6xl font-extrabold uppercase ${
          resistanceWon ? 'text-accent' : 'text-danger'
        }`}
      >
        {resistanceWon ? lex.gameOver.goodWins : lex.gameOver.badWins}
      </h2>
      <Eyebrow>{fmt(lex.gameOver.tally, { successes: game.successes, fails: game.fails })}</Eyebrow>

      <div className="w-full max-w-md">
        <p className="mb-1 font-mono text-xs uppercase tracking-label text-faint">
          {lex.gameOver.rolesLabel}
        </p>
        <p className="mb-3 text-xs text-muted">{lex.gameOver.guessHint}</p>
        <ul className="flex flex-col gap-2">
          {game.players.map((p) => {
            const isRevealed = revealedIds.has(p.id)
            return (
              <li
                key={p.id}
                className="flex min-h-[3.25rem] items-center justify-between rounded-field border border-line bg-surface px-4 py-2.5"
              >
                <span className="font-semibold text-ink">{p.name}</span>
                {isRevealed ? (
                  <span
                    className={`animate-pop font-semibold ${
                      p.role === 'spy' ? 'text-danger' : 'text-accent'
                    }`}
                  >
                    {p.role === 'spy' ? lex.factions.bad.member : lex.factions.good.member}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevealedIds((prev) => new Set(prev).add(p.id))}
                    className="select-none rounded-chip border border-line bg-raised px-3 py-1.5 font-mono text-xs uppercase tracking-label text-muted transition duration-fast ease-theme hover:border-line-strong hover:text-ink active:scale-[0.95]"
                  >
                    {lex.gameOver.reveal}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {!allRevealed && (
          <button
            type="button"
            onClick={() => setRevealedIds(new Set(game.players.map((p) => p.id)))}
            className="mt-3 font-mono text-xs uppercase tracking-label text-faint transition duration-fast ease-theme hover:text-ink"
          >
            {lex.gameOver.revealAll}
          </button>
        )}
      </div>

      <div className="mt-auto flex w-full max-w-sm flex-col gap-3">
        <Button onClick={() => host.backToLobby()}>{lex.party.host.playAgain}</Button>
        <Button variant="ghost" onClick={onClose}>
          {lex.party.host.closeRoom}
        </Button>
      </div>
    </div>
  )
}

/** The full big-screen view for a hosted room, phase-routed like App.tsx. */
export function BigScreen({
  host,
  onClose,
  revealStepMs,
}: {
  host: PartyHost
  onClose: () => void
  /** Override the mission-reveal per-card delay (storybook passes 0 for a static frame). */
  revealStepMs?: number
}) {
  const snapshot = useHostSnapshot(host)
  const lex = useLexicon()
  const phase = snapshot.game.phase
  // Practice affordance is available on every in-game practice phase (not the
  // lobby, which has its own start controls, nor gameOver — practice never ends
  // there).
  const inPractice = snapshot.game.practice && phase !== 'setup' && phase !== 'gameOver'

  return (
    <div className="flex min-h-full w-full flex-col items-center text-ink">
      {/* Persistent header: the app mark + the room code, always legible from a couch. */}
      <div className="flex w-full max-w-3xl items-center justify-between px-6 pt-4">
        <p className="font-display text-lg font-bold text-ink">
          <span aria-hidden className="mr-2">
            {lex.app.icon}
          </span>
          {lex.app.name}
        </p>
        <div className="flex items-center gap-3">
          <p className="rounded-chip border border-line bg-surface/80 px-3 py-1.5 font-mono text-sm uppercase tracking-label text-muted">
            {lex.party.host.roomCode} · <span className="font-bold text-ink">{snapshot.code}</span>
          </p>
          {/* Lobby & Game Over have their own prominent "Close room"; fill the
              in-game gap so the host can always end the session. */}
          {phase !== 'setup' && phase !== 'gameOver' && <HeaderQuit onClose={onClose} />}
        </div>
      </div>

      {inPractice && (
        <div className="mt-3 w-full max-w-3xl px-6">
          <PracticeBar host={host} />
        </div>
      )}

      {IN_GAME.has(phase) && <ScoreTrack state={snapshot.game} />}

      <main className="flex w-full max-w-3xl flex-1 flex-col items-center">
        {phase === 'setup' && <Lobby host={host} snapshot={snapshot} onClose={onClose} />}
        {phase === 'roleReveal' && <RolePhase host={host} snapshot={snapshot} />}
        {phase === 'teamProposal' && <ProposalPhase snapshot={snapshot} />}
        {phase === 'proposalVote' && <VotePhase host={host} snapshot={snapshot} />}
        {phase === 'mission' && <MissionPhase snapshot={snapshot} />}
        {phase === 'missionReveal' && (
          <MissionRevealPhase host={host} snapshot={snapshot} stepMs={revealStepMs} />
        )}
        {phase === 'gameOver' && <GameOverPhase host={host} snapshot={snapshot} onClose={onClose} />}
      </main>
    </div>
  )
}
