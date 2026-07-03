// Host & Join tests: the host is ALSO a seated player. Verifies host-as-player
// (its own vote/card go through the same handleIntent validation/locking via
// dispatchIntent), the reveal gate now requires the host's own action, the
// `mode` discriminator, and a full host + N-clients game to game-over — all
// against the in-memory transport. Party Mode behavior is covered separately
// and stays unchanged.

import { describe, expect, it } from 'vitest'
import { PartyClient } from './client'
import { PartyHost } from './host'
import { createMemoryHub } from './memoryTransport'
import { roomMode, voteTally } from './protocol'
import { currentLeaderId, currentTeamSize } from '../engine'

const CODE = 'ROOM'
const HOST = 'host-device'
const PLAYER_NAMES = ['Bob', 'Charlie', 'Diana', 'Eve'] // + the host = 5

/** Open a Host & Join room, seat the host, and seat N remote players. */
async function openHostJoin(hostName = 'Alice', playerNames = PLAYER_NAMES) {
  const hub = createMemoryHub()
  const host = await PartyHost.open(hub.transport(), CODE, 'hostAndJoin')
  // The host seats itself through the same join path as everyone else.
  host.dispatchIntent({ kind: 'join', clientId: HOST, name: hostName })
  const clients = new Map<string, PartyClient>()
  for (const name of playerNames) {
    const c = new PartyClient(hub.transport(), CODE, `client-${name}`)
    await c.ready
    c.join(name)
    clients.set(name, c)
  }
  return { hub, host, clients }
}

/** Host's own player id (its seat). */
function hostId(host: PartyHost): number {
  return host.snapshot.seats.find((s) => s.clientId === HOST)!.playerId
}

async function started(hostName = 'Alice') {
  const room = await openHostJoin(hostName)
  room.host.startGame(1)
  room.host.beginRounds()
  return room
}

describe('mode discriminator', () => {
  it('defaults to party and marks Host & Join rooms', async () => {
    const hub = createMemoryHub()
    const party = await PartyHost.open(hub.transport(), 'PRTY')
    expect(roomMode(party.snapshot)).toBe('party')
    expect(party.snapshot.mode).toBe('party')

    const hj = await PartyHost.open(hub.transport(), 'HJHJ', 'hostAndJoin')
    expect(roomMode(hj.snapshot)).toBe('hostAndJoin')

    // A snapshot written before modes existed reads as party.
    const legacy = { ...party.snapshot, mode: undefined }
    expect(roomMode(legacy)).toBe('party')
  })

  it('a joining client can read a room’s mode after connecting (the mismatch guard)', async () => {
    const hub = createMemoryHub()
    // A Host & Join room…
    const host = await PartyHost.open(hub.transport(), CODE, 'hostAndJoin')
    host.dispatchIntent({ kind: 'join', clientId: HOST, name: 'Alice' })

    // …joined by a client that only entered the code. The guard inspects the
    // fetched snapshot's mode BEFORE seating the player.
    const client = new PartyClient(hub.transport(), CODE, 'joiner')
    expect(await client.ready).toBe('connected')
    const snap = client.state.snapshot
    expect(snap).not.toBeNull()
    expect(roomMode(snap!)).toBe('hostAndJoin')
    // A Party join screen would see mode !== 'party' here and reject with
    // `wrongMode`; a Host & Join join screen sees a match and proceeds.
    client.close()
  })
})

describe('host is a seated player', () => {
  it('seats the host in the lobby and deals it a role at start', async () => {
    const { host } = await openHostJoin()
    expect(host.snapshot.seats.map((s) => s.name)).toEqual(['Alice', ...PLAYER_NAMES])
    expect(host.snapshot.seats[0]!.clientId).toBe(HOST)

    host.startGame(1)
    const me = host.snapshot.game.players.find((p) => p.id === hostId(host))
    expect(me).toBeDefined()
    expect(host.snapshot.game.players).toHaveLength(5)
  })

  it("routes the host's own ack/vote/card through the shared handleIntent path", async () => {
    const { host, clients } = await started()
    const me = hostId(host)

    // Ack (roleReveal already left; test vote+card locking instead). Propose a
    // team via the current leader so we reach the ballot.
    const leader = currentLeaderId(host.snapshot.game)!
    const size = currentTeamSize(host.snapshot.game)
    const team = host.snapshot.game.players.slice(0, size).map((p) => p.id)
    if (leader === me) host.dispatchIntent({ kind: 'proposeTeam', playerId: me, team })
    else clients.get(host.snapshot.seats.find((s) => s.playerId === leader)!.name)!.proposeTeam(team)
    expect(host.snapshot.game.phase).toBe('proposalVote')

    // Host votes through dispatchIntent — and its ballot LOCKS like anyone's.
    host.dispatchIntent({ kind: 'vote', playerId: me, ballot: 'approve' })
    host.dispatchIntent({ kind: 'vote', playerId: me, ballot: 'reject' }) // ignored — locked
    expect(host.snapshot.net.ballots[me]).toBe('approve')
  })
})

describe('reveal gate requires the host’s own action', () => {
  it('cannot reveal votes until the host (a player) has also voted', async () => {
    const { host, clients } = await started()
    const me = hostId(host)
    const leader = currentLeaderId(host.snapshot.game)!
    const size = currentTeamSize(host.snapshot.game)
    const team = host.snapshot.game.players.slice(0, size).map((p) => p.id)
    if (leader === me) host.dispatchIntent({ kind: 'proposeTeam', playerId: me, team })
    else clients.get(host.snapshot.seats.find((s) => s.playerId === leader)!.name)!.proposeTeam(team)

    // Everyone EXCEPT the host votes.
    for (const p of host.snapshot.game.players) {
      if (p.id === me) continue
      clients.get(host.snapshot.seats.find((s) => s.playerId === p.id)!.name)!.vote('approve')
    }
    expect(voteTally(host.snapshot).allIn).toBe(false)
    host.revealVotes()
    expect(host.snapshot.net.votesRevealed).toBe(false) // gate holds — host still owes a ballot

    // Host casts its own ballot → gate satisfied → reveal works.
    host.dispatchIntent({ kind: 'vote', playerId: me, ballot: 'approve' })
    expect(voteTally(host.snapshot).allIn).toBe(true)
    host.revealVotes()
    expect(host.snapshot.net.votesRevealed).toBe(true)
    // Still no engine advance — reveal is only a display beat.
    expect(host.snapshot.game.phase).toBe('proposalVote')
  })

  it('cannot reveal a mission until the host (if on the team) has played', async () => {
    const { host, clients } = await started()
    const me = hostId(host)
    // Put the host on a team that also contains a spy so a fail is possible.
    const spy = host.snapshot.game.players.find((p) => p.role === 'spy')!
    const size = currentTeamSize(host.snapshot.game)
    const rest = host.snapshot.game.players
      .map((p) => p.id)
      .filter((id) => id !== me && id !== spy.id)
    const team = [me, spy.id, ...rest].slice(0, size)
    const leader = currentLeaderId(host.snapshot.game)!
    if (leader === me) host.dispatchIntent({ kind: 'proposeTeam', playerId: me, team })
    else clients.get(host.snapshot.seats.find((s) => s.playerId === leader)!.name)!.proposeTeam(team)

    // Approve the proposal (everyone votes).
    for (const p of host.snapshot.game.players) {
      if (p.id === me) host.dispatchIntent({ kind: 'vote', playerId: me, ballot: 'approve' })
      else clients.get(host.snapshot.seats.find((s) => s.playerId === p.id)!.name)!.vote('approve')
    }
    host.revealVotes()
    host.resolveProposal()
    expect(host.snapshot.game.phase).toBe('mission')

    // Everyone on the team plays EXCEPT the host.
    for (const id of team) {
      if (id === me) continue
      const isSpy = host.snapshot.game.players.find((p) => p.id === id)!.role === 'spy'
      clients
        .get(host.snapshot.seats.find((s) => s.playerId === id)!.name)!
        .playCard(isSpy ? 'fail' : 'success')
    }
    // Still in mission — the host's card is outstanding, so no reveal is possible.
    expect(host.snapshot.game.phase).toBe('mission')
    host.revealMission()
    expect(host.snapshot.net.missionRevealed).toBe(false)

    // Host plays its own card → all in → missionReveal, then the host can flip.
    host.dispatchIntent({ kind: 'playCard', playerId: me, card: 'success' })
    expect(host.snapshot.game.phase).toBe('missionReveal')
    host.revealMission()
    expect(host.snapshot.net.missionRevealed).toBe(true)
  })
})

describe('a full Host & Join game (host + 4 clients) to game over', () => {
  it('plays through to a winner with the host acting as a player throughout', async () => {
    const { host, clients } = await started()
    const me = hostId(host)

    function voteEveryone(approve: boolean) {
      for (const p of host.snapshot.game.players) {
        const ballot = approve ? 'approve' : 'reject'
        if (p.id === me) host.dispatchIntent({ kind: 'vote', playerId: me, ballot })
        else clients.get(host.snapshot.seats.find((s) => s.playerId === p.id)!.name)!.vote(ballot)
      }
      host.revealVotes()
      host.resolveProposal()
    }

    function playMission(sabotage: boolean) {
      const spies = host.snapshot.game.players.filter((p) => p.role === 'spy').map((p) => p.id)
      const size = currentTeamSize(host.snapshot.game)
      // Build a team; include a spy when we want a fail.
      const ids = host.snapshot.game.players.map((p) => p.id)
      const team = sabotage
        ? [spies[0]!, ...ids.filter((id) => id !== spies[0]!)].slice(0, size)
        : host.snapshot.game.players
            .filter((p) => p.role === 'resistance')
            .map((p) => p.id)
            .slice(0, size)

      const leader = currentLeaderId(host.snapshot.game)!
      if (leader === me) host.dispatchIntent({ kind: 'proposeTeam', playerId: me, team })
      else clients.get(host.snapshot.seats.find((s) => s.playerId === leader)!.name)!.proposeTeam(team)
      voteEveryone(true)

      for (const id of host.snapshot.game.proposedTeam) {
        const isSpy = host.snapshot.game.players.find((p) => p.id === id)!.role === 'spy'
        const card = sabotage && isSpy ? 'fail' : 'success'
        if (id === me) host.dispatchIntent({ kind: 'playCard', playerId: me, card })
        else clients.get(host.snapshot.seats.find((s) => s.playerId === id)!.name)!.playCard(card)
      }
      host.revealMission()
      host.confirmMission()
    }

    // Spies sabotage every mission → spies win in 3.
    for (let i = 0; i < 3; i++) playMission(true)
    expect(host.snapshot.game.phase).toBe('gameOver')
    expect(host.snapshot.game.winner).toBe('spies')
    // Mirrors (remote players) see the same ending.
    expect(clients.get('Charlie')!.state.snapshot?.game.winner).toBe('spies')

    // Back to the lobby keeps all 5 seats (host included).
    host.backToLobby()
    expect(host.snapshot.game.phase).toBe('setup')
    expect(host.snapshot.seats).toHaveLength(5)
    expect(host.snapshot.seats[0]!.clientId).toBe(HOST)
  })
})
