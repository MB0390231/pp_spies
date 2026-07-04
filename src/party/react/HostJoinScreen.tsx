// Host & Join: the phones-only mode. EVERY phone renders the full shared board
// (mission tracker, round, leader, proposed team, pending actors, reveals) plus
// this seat's own private controls (role card, ballot, mission card, leader
// picker). The HOST phone additionally shows the gated control buttons (start,
// begin, reveal votes, resolve, reveal mission, continue, back to lobby, end).
//
// The host is ALSO a player: it holds a seat and plays through the same
// SeatController path as everyone else. Its intents go through
// PartyHost.dispatchIntent → the exact same handleIntent validation/locking as
// remote players, so the host controls only *timing*, never sees hidden content
// early. Reveal buttons stay disabled until the gate ("all in", host included)
// is satisfied.
//
// One <Board> renders for host and joiner alike; the difference is purely the
// SeatController it's driven by and whether HostControls are shown.

import { useState } from 'react'
import { Button } from '../../components/Button'
import { ScoreTrack } from '../../components/ScoreTrack'
import { SettingsSheet } from '../../components/SettingsSheet'
import {
  MIN_PLAYERS,
  currentLeaderId,
  currentTeamSize,
  failsToFail,
  isValidPlayerCount,
} from '../../engine'
import type { Phase } from '../../engine'
import { fmt, useLexicon, useTheme } from '../../theme'
import type { PartyClient } from '../client'
import type { PartyHost } from '../host'
import {
  cardsIn,
  pendingCardPlayers,
  pendingVoters,
  voteTally,
} from '../protocol'
import type { RoomSnapshot, Seat } from '../protocol'
import { useClientState, useHostSnapshot } from './hooks'
import {
  BallotButtons,
  Eyebrow,
  LeaderPicker,
  MissionButtons,
  PendingActors,
  RoleCard,
  StagedCards,
  names,
  type SeatController,
} from './shared'

const IN_GAME: ReadonlySet<Phase> = new Set<Phase>([
  'teamProposal',
  'proposalVote',
  'mission',
  'missionReveal',
])

/** The gated host controls, one set per phase. Reveal/advance buttons stay
 *  disabled until the network gate is satisfied — and since the host is a
 *  player, that includes the host's own vote/card. */
export interface HostControls {
  startGame(): void
  /** Lobby → a practice game on throwaway roles. */
  startPractice(): void
  /** Leave practice and deal the real game (fresh seed). */
  startRealGame(): void
  beginRounds(): void
  revealVotes(): void
  resolveProposal(): void
  revealMission(): void
  confirmMission(): void
  backToLobby(): void
  endSession(): void
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-card border border-line bg-surface/80 p-4 text-center shadow-card">
      {children}
    </div>
  )
}

/** The proposed team, shown on the board in vote/mission phases. */
function TeamPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const lex = useLexicon()
  return (
    <SectionCard>
      <Eyebrow>{lex.proposalVote.teamLabel}</Eyebrow>
      <p className="mt-1 text-lg font-semibold text-ink">
        {names(snapshot.game, snapshot.game.proposedTeam)}
      </p>
    </SectionCard>
  )
}

// ── Per-phase board bodies (shared by host and joiner) ─────────────────────────

function LobbyBoard({ snapshot }: { snapshot: RoomSnapshot }) {
  const lex = useLexicon()
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Eyebrow>{lex.party.host.roomCode}</Eyebrow>
      <p className="font-display text-6xl font-extrabold tracking-[0.3em] text-ink">
        {snapshot.code}
      </p>
      <p className="max-w-xs text-sm text-muted">{lex.party.hostJoin.lobbyShare}</p>
      <SectionCard>
        <Eyebrow>{fmt(lex.party.host.players, { count: snapshot.seats.length })}</Eyebrow>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {snapshot.seats.map((s) => (
            <span
              key={s.clientId}
              className="animate-pop rounded-chip border border-line bg-raised px-3 py-1.5 text-sm font-semibold text-ink"
            >
              {s.name}
            </span>
          ))}
          {snapshot.seats.length === 0 && (
            <span className="text-sm italic text-faint">
              {fmt(lex.party.host.needPlayers, { min: MIN_PLAYERS })}
            </span>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

function RoleBoard({ controller, snapshot, seat }: { controller: SeatController; snapshot: RoomSnapshot; seat: Seat }) {
  const lex = useLexicon()
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <RoleCard controller={controller} snapshot={snapshot} seat={seat} />
      <Eyebrow>
        {fmt(lex.party.host.roleReady, {
          ready: snapshot.net.roleAcks.length,
          total: snapshot.game.players.length,
        })}
      </Eyebrow>
    </div>
  )
}

function ProposalBoard({ controller, snapshot, seat }: { controller: SeatController; snapshot: RoomSnapshot; seat: Seat }) {
  const lex = useLexicon()
  const game = snapshot.game
  const leaderId = currentLeaderId(game)
  const leader = game.players.find((p) => p.id === leaderId)

  // The leader (host or joiner) gets the picker; everyone else watches.
  if (leaderId === seat.playerId) {
    return <LeaderPicker controller={controller} game={game} />
  }
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Eyebrow>{lex.proposal.eyebrow}</Eyebrow>
      <p className="max-w-xs text-lg text-muted">
        {fmt(lex.party.player.waitingForLeader, { name: leader?.name ?? '' })}
      </p>
      <p className="font-mono text-xs uppercase tracking-label text-faint">
        {fmt(lex.proposal.counter, { selected: 0, count: currentTeamSize(game) })}
      </p>
    </div>
  )
}

function VoteBoard({ controller, snapshot, seat }: { controller: SeatController; snapshot: RoomSnapshot; seat: Seat }) {
  const lex = useLexicon()
  const game = snapshot.game
  const myBallot = snapshot.net.ballots[seat.playerId]
  const tally = voteTally(snapshot)
  const revealed = snapshot.net.votesRevealed

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <h2 className="font-display text-3xl font-bold text-ink">{lex.party.host.voteTitle}</h2>
      <TeamPanel snapshot={snapshot} />

      {/* Public tally of WHO has cast a ballot (and, after reveal, each verdict) —
          never how anyone voted until the host flips. */}
      <div className="flex max-w-sm flex-wrap justify-center gap-1.5">
        {game.players.map((p) => {
          const ballot = snapshot.net.ballots[p.id]
          return (
            <span
              key={p.id}
              className={`flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-sm font-semibold ${
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
            </span>
          )
        })}
      </div>

      {revealed ? (
        <p
          className={`animate-pop font-display text-4xl font-extrabold uppercase ${
            tally.approved ? 'text-accent' : 'text-danger'
          }`}
        >
          {tally.approved ? lex.party.host.votePassed : lex.party.host.voteFailed}
        </p>
      ) : myBallot === undefined ? (
        // This seat still owes a ballot — including the host.
        <BallotButtons controller={controller} />
      ) : (
        <>
          <p className="text-muted">{lex.party.player.voteLocked}</p>
          <PendingActors names={pendingVoters(snapshot)} size="sm" />
        </>
      )}
    </div>
  )
}

function MissionBoard({ controller, snapshot, seat }: { controller: SeatController; snapshot: RoomSnapshot; seat: Seat }) {
  const lex = useLexicon()
  const game = snapshot.game
  const onTeam = game.proposedTeam.includes(seat.playerId)
  const played = seat.playerId in game.missionCards
  const player = game.players.find((p) => p.id === seat.playerId)
  const isSpy = player?.role === 'spy'
  const done = cardsIn(snapshot).length

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <h2 className="font-display text-3xl font-bold text-ink">
        {fmt(lex.missionReveal.title, { round: game.round })}
      </h2>
      <TeamPanel snapshot={snapshot} />
      <Eyebrow>
        {fmt(lex.party.host.missionProgress, { done, total: game.proposedTeam.length })}
      </Eyebrow>

      {!onTeam ? (
        <p className="text-muted">{lex.party.player.notOnMission}</p>
      ) : played ? (
        <p className="text-muted">{lex.party.player.cardPlayed}</p>
      ) : (
        <>
          <p className="text-lg text-muted">{lex.mission.prompt}</p>
          <MissionButtons controller={controller} isSpy={Boolean(isSpy)} />
        </>
      )}
      <PendingActors names={pendingCardPlayers(snapshot)} size="sm" />
    </div>
  )
}

function MissionRevealBoard({ snapshot, stepMs, onSettled }: { snapshot: RoomSnapshot; stepMs?: number; onSettled: (done: boolean) => void }) {
  const lex = useLexicon()
  const game = snapshot.game
  const mission = game.lastMission
  const revealed = snapshot.net.missionRevealed
  const [settled, setSettled] = useState(false)
  if (!mission) return null

  const needed = failsToFail(game.players.length, mission.round)
  const failsLine =
    mission.failCount === 1
      ? lex.missionReveal.failsOne
      : fmt(lex.missionReveal.failsMany, { count: mission.failCount })

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <h2 className="font-display text-3xl font-bold text-ink">
        {fmt(lex.missionReveal.title, { round: mission.round })}
      </h2>
      <StagedCards
        mission={mission}
        revealed={revealed}
        stepMs={stepMs}
        onComplete={(done) => {
          setSettled(done)
          onSettled(done)
        }}
      />
      {!revealed ? (
        <Eyebrow>{lex.missionReveal.allIn}</Eyebrow>
      ) : settled ? (
        <>
          <p
            className={`animate-pop font-display text-4xl font-extrabold uppercase ${
              mission.success ? 'text-accent' : 'text-danger'
            }`}
          >
            {mission.success ? lex.missionReveal.success : lex.missionReveal.failure}
          </p>
          <p className="animate-fade font-mono text-xs uppercase tracking-label text-faint">
            {failsLine}
            {needed > 1 && ` · ${fmt(lex.missionReveal.neededNote, { needed })}`}
          </p>
        </>
      ) : (
        <Eyebrow>{lex.missionReveal.allIn}</Eyebrow>
      )}
    </div>
  )
}

function GameOverBoard({ snapshot, seat }: { snapshot: RoomSnapshot; seat: Seat }) {
  const lex = useLexicon()
  const game = snapshot.game
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<number>>(new Set())
  const resistanceWon = game.winner === 'resistance'
  const you = game.players.find((p) => p.id === seat.playerId)
  const allRevealed = game.players.every((p) => revealedIds.has(p.id))

  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <Eyebrow>{lex.gameOver.eyebrow}</Eyebrow>
      <h2
        className={`animate-pop font-display text-4xl font-extrabold uppercase ${
          resistanceWon ? 'text-accent' : 'text-danger'
        }`}
      >
        {resistanceWon ? lex.gameOver.goodWins : lex.gameOver.badWins}
      </h2>
      <Eyebrow>{fmt(lex.gameOver.tally, { successes: game.successes, fails: game.fails })}</Eyebrow>
      {you && (
        <p className="text-muted">
          <span className={`font-semibold ${you.role === 'spy' ? 'text-danger' : 'text-accent'}`}>
            {you.role === 'spy' ? lex.factions.bad.member : lex.factions.good.member}
          </span>
        </p>
      )}

      <div className="w-full max-w-sm">
        <p className="mb-2 font-mono text-xs uppercase tracking-label text-faint">
          {lex.gameOver.rolesLabel}
        </p>
        <ul className="flex flex-col gap-2">
          {game.players.map((p) => {
            const isRevealed = revealedIds.has(p.id)
            return (
              <li
                key={p.id}
                className="flex min-h-[3rem] items-center justify-between rounded-field border border-line bg-surface px-4 py-2"
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
    </div>
  )
}

// ── The board + host controls ──────────────────────────────────────────────────

/**
 * The full Host & Join board for one seat. `controller` drives this seat's
 * private actions; `hostControls` is present only on the host phone and adds
 * the gated flow buttons. `stepMs` overrides the reveal cadence (storybook).
 */
export function Board({
  snapshot,
  seat,
  controller,
  hostControls,
  onLeave,
  onLeaveLobby,
  stepMs,
}: {
  snapshot: RoomSnapshot
  /** This device's seat, or undefined while a join/reclaim is in flight. */
  seat: Seat | undefined
  controller: SeatController
  hostControls?: HostControls
  onLeave: () => void
  onLeaveLobby: () => void
  stepMs?: number
}) {
  const lex = useLexicon()
  const game = snapshot.game
  const phase = game.phase
  // Whether the mission-reveal staged flip has finished (gates the host's Continue).
  const [revealSettled, setRevealSettled] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const isHost = Boolean(hostControls)
  // The host reaches the EXISTING settings (theme + hard mode) from the lobby,
  // via the same SettingsSheet as Setup / MainMenu — hard mode there is honored
  // at start because HostBoard reads it from useTheme() (see below).
  const showSettingsGear = isHost && phase === 'setup'
  // Practice banner shows on every phone during an in-game practice phase; the
  // host additionally gets a "start the real game" control (below).
  const inPractice = game.practice && phase !== 'setup' && phase !== 'gameOver'
  const tally = voteTally(snapshot)
  const canStart = isValidPlayerCount(snapshot.seats.length)
  const seatedOrSpectator = seat !== undefined

  let board: React.ReactNode = null
  if (!seatedOrSpectator) {
    // Reclaim/join in flight, or a genuine latecomer mid-game.
    board = (
      <p className="max-w-xs text-center text-lg text-muted">
        {phase === 'setup' ? lex.party.player.joining : lex.party.player.inProgress}
      </p>
    )
  } else {
    switch (phase) {
      case 'setup':
        board = <LobbyBoard snapshot={snapshot} />
        break
      case 'roleReveal':
        board = <RoleBoard controller={controller} snapshot={snapshot} seat={seat!} />
        break
      case 'teamProposal':
        board = <ProposalBoard controller={controller} snapshot={snapshot} seat={seat!} />
        break
      case 'proposalVote':
        board = <VoteBoard controller={controller} snapshot={snapshot} seat={seat!} />
        break
      case 'mission':
        board = <MissionBoard controller={controller} snapshot={snapshot} seat={seat!} />
        break
      case 'missionReveal':
        board = (
          <MissionRevealBoard snapshot={snapshot} stepMs={stepMs} onSettled={setRevealSettled} />
        )
        break
      case 'gameOver':
        board = <GameOverBoard snapshot={snapshot} seat={seat!} />
        break
    }
  }

  // Host flow buttons for the current phase. Reveal/advance stay disabled until
  // the network gate ("all in", host's own action included) is satisfied.
  let hostBar: React.ReactNode = null
  if (hostControls) {
    switch (phase) {
      case 'setup':
        hostBar = (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <Button disabled={!canStart} onClick={() => hostControls.startGame()}>
              {canStart ? lex.party.host.start : fmt(lex.party.host.needPlayers, { min: MIN_PLAYERS })}
            </Button>
            <Button variant="neutral" disabled={!canStart} onClick={() => hostControls.startPractice()}>
              {lex.practice.start}
            </Button>
            <p className="text-xs italic text-muted">{lex.practice.lobbyHint}</p>
          </div>
        )
        break
      case 'roleReveal':
        hostBar = (
          <Button className="w-full max-w-sm" onClick={() => hostControls.beginRounds()}>
            {lex.party.host.begin}
          </Button>
        )
        break
      case 'proposalVote':
        hostBar = snapshot.net.votesRevealed ? (
          <Button className="w-full max-w-sm" onClick={() => hostControls.resolveProposal()}>
            {lex.party.host.continue}
          </Button>
        ) : (
          <Button
            className="w-full max-w-sm"
            disabled={!tally.allIn}
            onClick={() => hostControls.revealVotes()}
          >
            {lex.party.host.revealVotes}
          </Button>
        )
        break
      case 'missionReveal':
        hostBar = snapshot.net.missionRevealed ? (
          <Button
            className="w-full max-w-sm"
            disabled={!revealSettled}
            onClick={() => hostControls.confirmMission()}
          >
            {lex.missionReveal.continue}
          </Button>
        ) : (
          <Button className="w-full max-w-sm" onClick={() => hostControls.revealMission()}>
            {lex.missionReveal.showResults}
          </Button>
        )
        break
      case 'gameOver':
        hostBar = (
          <Button className="w-full max-w-sm" onClick={() => hostControls.backToLobby()}>
            {lex.party.host.playAgain}
          </Button>
        )
        break
      // mission / teamProposal: nothing to gate — the host just plays like anyone.
    }
  }

  // Bottom affordance: host can end the session; a joiner can leave the lobby.
  let footer: React.ReactNode = null
  if (hostControls) {
    footer = (
      <Button variant="ghost" onClick={() => hostControls.endSession()}>
        {lex.party.host.closeRoom}
      </Button>
    )
  } else if (phase === 'setup') {
    footer = (
      <Button variant="ghost" onClick={onLeaveLobby}>
        {lex.party.player.leave}
      </Button>
    )
  } else if (phase === 'gameOver') {
    footer = (
      <Button variant="ghost" onClick={onLeave}>
        {lex.party.player.leave}
      </Button>
    )
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center text-ink">
      <div className="flex w-full max-w-md items-center justify-between px-4 pt-3">
        <span className="font-mono text-xs uppercase tracking-label text-faint">
          {isHost ? `${lex.party.hostJoin.hostTag} · ${snapshot.code}` : snapshot.code}
        </span>
        <div className="flex items-center gap-3">
          {seat && (
            <span className="font-mono text-xs uppercase tracking-label text-muted">
              {seat.name}
            </span>
          )}
          {showSettingsGear && (
            <button
              type="button"
              aria-label={lex.setup.settings}
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface/80 text-muted transition duration-fast ease-theme hover:border-line-strong hover:text-ink active:scale-95"
            >
              {/* Gear icon — inline SVG so it inherits the theme's text color. */}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {inPractice && (
        <div className="mx-4 mt-3 w-full max-w-md rounded-card border border-accent/50 bg-accent/10 px-4 py-2 text-center">
          <span className="font-mono text-[11px] uppercase tracking-label text-accent">
            {lex.practice.banner}
          </span>
        </div>
      )}

      {IN_GAME.has(phase) && <ScoreTrack state={game} />}

      <main className="flex w-full max-w-md flex-1 flex-col items-center gap-5 p-6">
        {board}
        <div className="mt-auto flex w-full max-w-sm flex-col gap-3">
          {hostBar}
          {/* Host's persistent "start the real game" control during practice. */}
          {hostControls && inPractice && (
            <Button variant="neutral" onClick={() => hostControls.startRealGame()}>
              {lex.practice.startReal}
            </Button>
          )}
          {footer}
        </div>
      </main>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

/** Bind a SeatController to the host's OWN seat (found by clientId), routing its
 *  private actions through the same handleIntent path as remote players. */
function hostController(host: PartyHost, hostClientId: string): SeatController {
  const seatId = () => host.snapshot.seats.find((s) => s.clientId === hostClientId)?.playerId
  return {
    ackRole() {
      const id = seatId()
      if (id !== undefined) host.dispatchIntent({ kind: 'ackRole', playerId: id })
    },
    proposeTeam(team) {
      const id = seatId()
      if (id !== undefined) host.dispatchIntent({ kind: 'proposeTeam', playerId: id, team })
    },
    vote(ballot) {
      const id = seatId()
      if (id !== undefined) host.dispatchIntent({ kind: 'vote', playerId: id, ballot })
    },
    playCard(card) {
      const id = seatId()
      if (id !== undefined) host.dispatchIntent({ kind: 'playCard', playerId: id, card })
    },
  }
}

/** The HOST phone: authoritative controller + its own player seat. */
export function HostBoard({
  host,
  hostClientId,
  onEnd,
  stepMs,
}: {
  host: PartyHost
  hostClientId: string
  onEnd: () => void
  stepMs?: number
}) {
  const snapshot = useHostSnapshot(host)
  // Reuse the EXISTING hard-mode setting (from SettingsSheet / spies:settings),
  // exactly like Party's big screen and Pass & Play's Setup — never a new toggle.
  const { hardMode } = useTheme()
  const seat = snapshot.seats.find((s) => s.clientId === hostClientId)
  const controller = hostController(host, hostClientId)
  const hostControls: HostControls = {
    startGame: () => host.startGame(Date.now(), hardMode),
    startPractice: () => host.startPractice(Date.now(), hardMode),
    startRealGame: () => host.startRealGame(Date.now()),
    beginRounds: () => host.beginRounds(),
    revealVotes: () => host.revealVotes(),
    resolveProposal: () => host.resolveProposal(),
    revealMission: () => host.revealMission(),
    confirmMission: () => host.confirmMission(),
    backToLobby: () => host.backToLobby(),
    endSession: onEnd,
  }
  return (
    <Board
      snapshot={snapshot}
      seat={seat}
      controller={controller}
      hostControls={hostControls}
      onLeave={onEnd}
      onLeaveLobby={onEnd}
      stepMs={stepMs}
    />
  )
}

/** A JOINER phone: full board + its own controls, no flow buttons. */
export function JoinerBoard({
  client,
  onLeave,
  stepMs,
}: {
  client: PartyClient
  onLeave: () => void
  stepMs?: number
}) {
  const lex = useLexicon()
  const { status, snapshot } = useClientState(client)
  const seat = client.seat

  function leaveLobby() {
    void client.leave().finally(onLeave)
  }

  if (snapshot?.closed) {
    return (
      <Centered>
        <p className="max-w-xs text-lg text-muted">{lex.party.player.sessionEnded}</p>
        <Button variant="neutral" onClick={onLeave}>
          {lex.party.player.backToMenu}
        </Button>
      </Centered>
    )
  }
  if (status === 'not-found') {
    return (
      <Centered>
        <p className="max-w-xs text-lg text-muted">{lex.party.player.notFound}</p>
        <Button variant="neutral" onClick={onLeave}>
          {lex.party.player.leave}
        </Button>
      </Centered>
    )
  }
  if (!snapshot || status === 'connecting') {
    return (
      <Centered>
        <p className="font-mono text-sm uppercase tracking-label text-faint">
          {lex.party.player.joining}
        </p>
      </Centered>
    )
  }

  return (
    <Board
      snapshot={snapshot}
      seat={seat}
      controller={client}
      onLeave={onLeave}
      onLeaveLobby={leaveLobby}
      stepMs={stepMs}
    />
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 animate-rise flex-col items-center justify-center gap-6 p-6 text-center">
      {children}
    </div>
  )
}
