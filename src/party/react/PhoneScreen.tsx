// Party Mode's player controller: a minimal phone view rendered purely from
// the mirrored snapshot, from this seat's perspective. Private info (your
// role, your ballot, your card) renders here and only here; everything
// public happens on the big screen, so most phases are a single prompt +
// one or two thumb-sized actions.

import { Button } from '../../components/Button'
import { ScoreTrack } from '../../components/ScoreTrack'
import { MAX_PLAYERS, currentLeaderId } from '../../engine'
import type { Phase } from '../../engine'
import { fmt, useLexicon } from '../../theme'
import type { PartyClient } from '../client'
import { pendingCardPlayers, pendingVoters, voteTally } from '../protocol'
import type { RoomSnapshot, Seat } from '../protocol'
import { useClientState } from './hooks'
import {
  BallotButtons,
  LeaderPicker,
  MissionButtons,
  PendingActors,
  RoleCard,
} from './shared'

const IN_GAME: ReadonlySet<Phase> = new Set<Phase>([
  'teamProposal',
  'proposalVote',
  'mission',
  'missionReveal',
])

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 animate-rise flex-col items-center justify-center gap-6 p-6 text-center">
      {children}
    </div>
  )
}

function WatchNote({ text }: { text?: string }) {
  const lex = useLexicon()
  return (
    <p className="font-mono text-xs uppercase tracking-label text-faint">
      {text ?? lex.party.player.watch}
    </p>
  )
}

function VotePhase({ client, snapshot, seat }: { client: PartyClient; snapshot: RoomSnapshot; seat: Seat }) {
  const lex = useLexicon()
  const game = snapshot.game
  const myBallot = snapshot.net.ballots[seat.playerId]
  const team = game.proposedTeam
    .map((id) => game.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  if (myBallot === undefined) {
    return (
      <Centered>
        <h2 className="font-display text-3xl font-bold text-ink">
          {lex.party.player.voteQuestion}
        </h2>
        <div className="w-full max-w-sm rounded-card border border-line bg-surface/80 p-5 shadow-card">
          <p className="font-mono text-xs uppercase tracking-label text-faint">
            {lex.proposalVote.teamLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">{team}</p>
        </div>
        <BallotButtons controller={client} />
      </Centered>
    )
  }

  const tally = voteTally(snapshot)
  return (
    <Centered>
      {snapshot.net.votesRevealed ? (
        <h2
          className={`animate-pop font-display text-4xl font-extrabold uppercase ${
            tally.approved ? 'text-accent' : 'text-danger'
          }`}
        >
          {tally.approved ? lex.party.host.votePassed : lex.party.host.voteFailed}
        </h2>
      ) : (
        <>
          <p className="max-w-xs text-lg text-muted">{lex.party.player.voteLocked}</p>
          {/* Who still owes a ballot — never how they voted. */}
          <PendingActors names={pendingVoters(snapshot)} size="sm" />
        </>
      )}
      <WatchNote />
    </Centered>
  )
}

function MissionPhase({ client, snapshot, seat }: { client: PartyClient; snapshot: RoomSnapshot; seat: Seat }) {
  const lex = useLexicon()
  const game = snapshot.game
  const onTeam = game.proposedTeam.includes(seat.playerId)
  const played = seat.playerId in game.missionCards
  const player = game.players.find((p) => p.id === seat.playerId)
  const isSpy = player?.role === 'spy'

  if (!onTeam) {
    return (
      <Centered>
        <p className="max-w-xs text-lg text-muted">{lex.party.player.notOnMission}</p>
        <WatchNote />
      </Centered>
    )
  }
  if (played) {
    return (
      <Centered>
        <p className="max-w-xs text-lg text-muted">{lex.party.player.cardPlayed}</p>
        {/* Who still owes a card — never which card. */}
        <PendingActors names={pendingCardPlayers(snapshot)} size="sm" />
        <WatchNote />
      </Centered>
    )
  }
  return (
    <Centered>
      <p className="text-lg text-muted">{lex.mission.prompt}</p>
      <MissionButtons controller={client} isSpy={Boolean(isSpy)} />
    </Centered>
  )
}

function GamePhases({ client, snapshot, seat, onLeave, onLeaveLobby }: { client: PartyClient; snapshot: RoomSnapshot; seat: Seat; onLeave: () => void; onLeaveLobby: () => void }) {
  const lex = useLexicon()
  const game = snapshot.game
  const phase = game.phase

  switch (phase) {
    case 'setup':
      return (
        <Centered>
          <p className="max-w-xs text-lg text-muted">
            {fmt(lex.party.player.lobby, { name: seat.name })}
          </p>
          <WatchNote />
          {/* Leaving the lobby actually drops the seat everywhere (so someone
              can bow out, or rename by rejoining), then closes locally. */}
          <Button variant="ghost" className="mt-auto" onClick={onLeaveLobby}>
            {lex.party.player.leave}
          </Button>
        </Centered>
      )
    case 'roleReveal':
      return (
        <Centered>
          <RoleCard controller={client} snapshot={snapshot} seat={seat} />
        </Centered>
      )
    case 'teamProposal': {
      const leaderId = currentLeaderId(game)
      if (leaderId === seat.playerId)
        return (
          <div className="flex min-h-full flex-1 animate-rise flex-col items-center p-6">
            <LeaderPicker controller={client} game={game} />
          </div>
        )
      const leader = game.players.find((p) => p.id === leaderId)
      return (
        <Centered>
          <p className="max-w-xs text-lg text-muted">
            {fmt(lex.party.player.waitingForLeader, { name: leader?.name ?? '' })}
          </p>
          <WatchNote />
        </Centered>
      )
    }
    case 'proposalVote':
      return <VotePhase client={client} snapshot={snapshot} seat={seat} />
    case 'mission':
      return <MissionPhase client={client} snapshot={snapshot} seat={seat} />
    case 'missionReveal':
      return (
        <Centered>
          {snapshot.net.missionRevealed && game.lastMission ? (
            <h2
              className={`animate-pop font-display text-4xl font-extrabold uppercase ${
                game.lastMission.success ? 'text-accent' : 'text-danger'
              }`}
            >
              {game.lastMission.success ? lex.missionReveal.success : lex.missionReveal.failure}
            </h2>
          ) : (
            <p className="max-w-xs text-lg text-muted">{lex.missionReveal.allIn}</p>
          )}
          <WatchNote />
        </Centered>
      )
    case 'gameOver': {
      const player = game.players.find((p) => p.id === seat.playerId)
      const resistanceWon = game.winner === 'resistance'
      return (
        <Centered>
          <p className="font-mono text-sm uppercase tracking-label text-faint">
            {lex.gameOver.eyebrow}
          </p>
          <h2
            className={`animate-pop font-display text-4xl font-extrabold uppercase ${
              resistanceWon ? 'text-accent' : 'text-danger'
            }`}
          >
            {resistanceWon ? lex.gameOver.goodWins : lex.gameOver.badWins}
          </h2>
          {player && (
            <p className="text-muted">
              <span
                className={`font-semibold ${player.role === 'spy' ? 'text-danger' : 'text-accent'}`}
              >
                {player.role === 'spy' ? lex.factions.bad.member : lex.factions.good.member}
              </span>
            </p>
          )}
          <WatchNote />
          <Button variant="ghost" className="mt-auto" onClick={onLeave}>
            {lex.party.player.leave}
          </Button>
        </Centered>
      )
    }
  }
}

/** The full phone view for a joined (or joining) player. */
export function PhoneScreen({ client, onLeave }: { client: PartyClient; onLeave: () => void }) {
  const lex = useLexicon()
  const { status, snapshot } = useClientState(client)
  const seat = client.seat

  // Leaving the lobby drops the seat everywhere, THEN closes locally. Awaiting
  // the leave send guarantees the "remove my seat" intent is dispatched before
  // onLeave() tears down the transport — otherwise the broadcast can be dropped
  // mid-flight and the seat lingers as a ghost on the host.
  function leaveLobby() {
    void client.leave().finally(onLeave)
  }

  let body: React.ReactNode
  if (snapshot?.closed) {
    // The host adjourned — even a device that reconnected after the close lands
    // here (via the closed flag in the re-fetched snapshot), not a frozen board.
    body = (
      <Centered>
        <p className="max-w-xs text-lg text-muted">{lex.party.player.sessionEnded}</p>
        <Button variant="neutral" onClick={onLeave}>
          {lex.party.player.backToMenu}
        </Button>
      </Centered>
    )
  } else if (status === 'not-found') {
    body = (
      <Centered>
        <p className="max-w-xs text-lg text-muted">{lex.party.player.notFound}</p>
        <Button variant="neutral" onClick={onLeave}>
          {lex.party.player.leave}
        </Button>
      </Centered>
    )
  } else if (!snapshot || status === 'connecting') {
    body = (
      <Centered>
        <p className="font-mono text-sm uppercase tracking-label text-faint">
          {lex.party.player.joining}
        </p>
      </Centered>
    )
  } else if (!seat) {
    // In the room but not seated: either the join intent is still in flight,
    // the lobby is full, or the game started without this device.
    const full = snapshot.seats.length >= MAX_PLAYERS
    const inLobby = snapshot.game.phase === 'setup'
    body = (
      <Centered>
        <p className="max-w-xs text-lg text-muted">
          {!inLobby
            ? lex.party.player.inProgress
            : full
              ? lex.party.player.full
              : lex.party.player.joining}
        </p>
        <Button variant="ghost" onClick={onLeave}>
          {lex.party.player.leave}
        </Button>
      </Centered>
    )
  } else {
    body = (
      <>
        {IN_GAME.has(snapshot.game.phase) && <ScoreTrack state={snapshot.game} />}
        <GamePhases
          client={client}
          snapshot={snapshot}
          seat={seat}
          onLeave={onLeave}
          onLeaveLobby={leaveLobby}
        />
      </>
    )
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center text-ink">
      <div className="flex w-full max-w-md items-center justify-between px-4 pt-3">
        <span className="font-mono text-xs uppercase tracking-label text-faint">
          {client.code}
        </span>
        {seat && (
          <span className="font-mono text-xs uppercase tracking-label text-muted">
            {seat.name}
          </span>
        )}
      </div>
      <main className="flex w-full max-w-md flex-1 flex-col">{body}</main>
    </div>
  )
}
