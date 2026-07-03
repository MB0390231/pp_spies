// Host sync + reveal-gate tests, run entirely against the in-memory transport:
// vote accumulation → lock → host reveal → resolve, mission card accumulation
// → host reveal → confirm, plus lobby seating, intent validation, full games,
// and reconnection/rehydration. No React, no network, no live backend.

import { describe, expect, it } from 'vitest'
import { PartyClient } from './client'
import { PartyHost } from './host'
import { createMemoryHub } from './memoryTransport'
import { fellowSpies, pendingCardPlayers, pendingVoters, revealOrder, voteTally } from './protocol'
import type { MemoryHub } from './memoryTransport'
import { currentLeaderId, currentTeamSize } from '../engine'

const CODE = 'TEST'
const NAMES5 = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']
const NAMES7 = [...NAMES5, 'Frank', 'Grace']

async function openRoom(names: string[] = NAMES5): Promise<{
  hub: MemoryHub
  host: PartyHost
  clients: Map<string, PartyClient>
}> {
  const hub = createMemoryHub()
  const host = await PartyHost.open(hub.transport(), CODE)
  const clients = new Map<string, PartyClient>()
  for (const name of names) {
    const client = new PartyClient(hub.transport(), CODE, `client-${name}`)
    await client.ready
    client.join(name)
    clients.set(name, client)
  }
  return { hub, host, clients }
}

/** The client controlling the given engine player id. */
function clientFor(host: PartyHost, clients: Map<string, PartyClient>, playerId: number): PartyClient {
  const seat = host.snapshot.seats.find((s) => s.playerId === playerId)!
  return [...clients.values()].find((c) => c.clientId === seat.clientId)!
}

/** Advance a fresh room to the first teamProposal. */
async function startedRoom(names: string[] = NAMES5, seed = 42) {
  const room = await openRoom(names)
  room.host.startGame(seed)
  room.host.beginRounds()
  return room
}

/** Everyone votes the given way; then host reveals + resolves. */
function voteAll(host: PartyHost, clients: Map<string, PartyClient>, approve: boolean) {
  for (const p of host.snapshot.game.players) {
    clientFor(host, clients, p.id).vote(approve ? 'approve' : 'reject')
  }
  host.revealVotes()
  host.resolveProposal()
}

/** Leader proposes the first N players (by id), including `include` if given. */
function proposeFirstTeam(host: PartyHost, clients: Map<string, PartyClient>, include: number[] = []) {
  const game = host.snapshot.game
  const size = currentTeamSize(game)
  const rest = game.players.map((p) => p.id).filter((id) => !include.includes(id))
  const team = [...include, ...rest].slice(0, size)
  clientFor(host, clients, currentLeaderId(game)!).proposeTeam(team)
  return team
}

describe('lobby seating', () => {
  it('seats joining players in order and mirrors them to clients', async () => {
    const { host, clients } = await openRoom()
    expect(host.snapshot.seats.map((s) => s.name)).toEqual(NAMES5)
    expect(host.snapshot.seats.map((s) => s.playerId)).toEqual([0, 1, 2, 3, 4])
    const alice = clients.get('Alice')!
    expect(alice.seat?.playerId).toBe(0)
    expect(alice.state.snapshot?.seats).toHaveLength(5)
  })

  it('dedupes clashing names instead of rejecting the join', async () => {
    const hub = createMemoryHub()
    const host = await PartyHost.open(hub.transport(), CODE)
    for (const clientId of ['a', 'b', 'c']) {
      const c = new PartyClient(hub.transport(), CODE, clientId)
      await c.ready
      c.join('Sam')
    }
    expect(host.snapshot.seats.map((s) => s.name)).toEqual(['Sam', 'Sam 2', 'Sam 3'])
  })

  it('keeps the same seat for a rejoining clientId and ignores empty names', async () => {
    const { host, clients } = await openRoom()
    clients.get('Alice')!.join('Alice') // re-announce (e.g. after refresh)
    expect(host.snapshot.seats).toHaveLength(5)
    const hub = createMemoryHub()
    const h2 = await PartyHost.open(hub.transport(), CODE)
    const c = new PartyClient(hub.transport(), CODE, 'x')
    await c.ready
    c.join('   ')
    expect(h2.snapshot.seats).toHaveLength(0)
  })

  it('refuses new seats once the game has started', async () => {
    const { hub, host } = await startedRoom()
    const late = new PartyClient(hub.transport(), CODE, 'latecomer')
    await late.ready
    late.join('Zed')
    expect(host.snapshot.seats).toHaveLength(5)
    expect(late.seat).toBeUndefined()
  })
})

describe('game start and role acks', () => {
  it('runs SETUP through the real engine with seat order as player order', async () => {
    const { host } = await openRoom()
    host.startGame(7)
    const game = host.snapshot.game
    expect(game.phase).toBe('roleReveal')
    expect(game.players.map((p) => p.name)).toEqual(NAMES5)
    expect(game.players.filter((p) => p.role === 'spy')).toHaveLength(2)
  })

  it('ignores startGame with too few players', async () => {
    const hub = createMemoryHub()
    const host = await PartyHost.open(hub.transport(), CODE)
    const c = new PartyClient(hub.transport(), CODE, 'only')
    await c.ready
    c.join('Solo')
    host.startGame(1)
    expect(host.snapshot.game.phase).toBe('setup')
  })

  it('accumulates role acks once per player, then begins rounds', async () => {
    const { host, clients } = await openRoom()
    host.startGame(7)
    const bob = clients.get('Bob')!
    bob.ackRole()
    bob.ackRole()
    expect(host.snapshot.net.roleAcks).toEqual([1])
    host.beginRounds()
    expect(host.snapshot.game.phase).toBe('teamProposal')
  })
})

describe('team proposal intents', () => {
  it('accepts a valid proposal only from the current leader', async () => {
    const { host, clients } = await startedRoom()
    const game = host.snapshot.game
    const leaderId = currentLeaderId(game)!
    const notLeader = game.players.find((p) => p.id !== leaderId)!.id
    const size = currentTeamSize(game)
    const team = game.players.slice(0, size).map((p) => p.id)

    clientFor(host, clients, notLeader).proposeTeam(team)
    expect(host.snapshot.game.phase).toBe('teamProposal')

    clientFor(host, clients, leaderId).proposeTeam(team)
    expect(host.snapshot.game.phase).toBe('proposalVote')
    expect(host.snapshot.game.proposedTeam).toEqual(team)
  })

  it('survives an invalid team (engine throw is swallowed)', async () => {
    const { host, clients } = await startedRoom()
    const leaderId = currentLeaderId(host.snapshot.game)!
    clientFor(host, clients, leaderId).proposeTeam([0, 0, 0, 0, 0, 0])
    expect(host.snapshot.game.phase).toBe('teamProposal')
  })
})

describe('secret ballot reveal gate', () => {
  it('accumulates ballots, locks each on first tap, and stays face-down', async () => {
    const { host, clients } = await startedRoom()
    proposeFirstTeam(host, clients)

    const alice = clientFor(host, clients, 0)
    alice.vote('approve')
    alice.vote('reject') // locked — must not change
    expect(host.snapshot.net.ballots[0]).toBe('approve')
    expect(host.snapshot.net.votesRevealed).toBe(false)
    expect(voteTally(host.snapshot).done).toBe(1)
  })

  it('refuses to reveal until every seated player has voted', async () => {
    const { host, clients } = await startedRoom()
    proposeFirstTeam(host, clients)
    for (const id of [0, 1, 2, 3]) clientFor(host, clients, id).vote('approve')
    host.revealVotes()
    expect(host.snapshot.net.votesRevealed).toBe(false)

    clientFor(host, clients, 4).vote('reject')
    expect(voteTally(host.snapshot).allIn).toBe(true)
    host.revealVotes()
    expect(host.snapshot.net.votesRevealed).toBe(true)
    // Reveal is a display beat — the engine hasn't moved yet.
    expect(host.snapshot.game.phase).toBe('proposalVote')
  })

  it('resolves the majority through the unchanged engine only after the reveal', async () => {
    const { host, clients } = await startedRoom()
    proposeFirstTeam(host, clients)
    for (const id of [0, 1, 2]) clientFor(host, clients, id).vote('approve')
    for (const id of [3, 4]) clientFor(host, clients, id).vote('reject')

    host.resolveProposal() // before reveal — must be a no-op
    expect(host.snapshot.game.phase).toBe('proposalVote')

    host.revealVotes()
    host.resolveProposal()
    expect(host.snapshot.game.phase).toBe('mission')
    expect(host.snapshot.net.ballots).toEqual({})
    expect(host.snapshot.net.votesRevealed).toBe(false)
  })

  it('rejects on a tie (even split never happens with odd counts, minority approve does)', async () => {
    const { host, clients } = await startedRoom()
    proposeFirstTeam(host, clients)
    for (const id of [0, 1]) clientFor(host, clients, id).vote('approve')
    for (const id of [2, 3, 4]) clientFor(host, clients, id).vote('reject')
    const before = host.snapshot.game.leaderIndex
    host.revealVotes()
    host.resolveProposal()
    const game = host.snapshot.game
    expect(game.phase).toBe('teamProposal')
    expect(game.consecutiveRejects).toBe(1)
    expect(game.leaderIndex).toBe((before + 1) % 5)
  })

  it('ignores votes after the reveal and from unknown players', async () => {
    const { host, clients } = await startedRoom()
    proposeFirstTeam(host, clients)
    for (const p of host.snapshot.game.players) clientFor(host, clients, p.id).vote('approve')
    host.revealVotes()
    // A vote after the flip must not mutate the revealed ballots.
    const ballotsBefore = { ...host.snapshot.net.ballots }
    clientFor(host, clients, 0).vote('reject')
    expect(host.snapshot.net.ballots).toEqual(ballotsBefore)
  })
})

describe('mission card reveal gate', () => {
  async function atMission(seed = 42) {
    const room = await startedRoom(NAMES5, seed)
    const spy = room.host.snapshot.game.players.find((p) => p.role === 'spy')!
    const team = proposeFirstTeam(room.host, room.clients, [spy.id])
    voteAll(room.host, room.clients, true)
    expect(room.host.snapshot.game.phase).toBe('mission')
    return { ...room, team, spy }
  }

  it('accumulates cards, locks each seat to one card, and stays sealed', async () => {
    const { host, clients, team, spy } = await atMission()
    const nonSpy = team.find((id) => id !== spy.id)!

    clientFor(host, clients, spy.id).playCard('fail')
    clientFor(host, clients, spy.id).playCard('success') // locked
    expect(host.snapshot.game.missionCards[spy.id]).toBe('fail')

    clientFor(host, clients, nonSpy).playCard('fail') // resistance is coerced by the engine
    expect(host.snapshot.game.missionCards[nonSpy]).toBe('success')

    // All cards in: the engine moves to missionReveal, but the outcome stays
    // face-down until the host flips it.
    expect(host.snapshot.game.phase).toBe('missionReveal')
    expect(host.snapshot.net.missionRevealed).toBe(false)
  })

  it('only advances via CONFIRM_MISSION after the host reveal', async () => {
    const { host, clients, team, spy } = await atMission()
    for (const id of team) clientFor(host, clients, id).playCard(id === spy.id ? 'fail' : 'success')

    host.confirmMission() // before reveal — no-op
    expect(host.snapshot.game.phase).toBe('missionReveal')

    host.revealMission()
    expect(host.snapshot.net.missionRevealed).toBe(true)
    host.confirmMission()
    const game = host.snapshot.game
    expect(game.phase).toBe('teamProposal')
    expect(game.round).toBe(2)
    expect(game.fails).toBe(1)
    expect(host.snapshot.net.missionRevealed).toBe(false)
  })

  it('ignores cards from players not on the mission', async () => {
    const { host, clients, team } = await atMission()
    const offTeam = host.snapshot.game.players.find((p) => !team.includes(p.id))!
    clientFor(host, clients, offTeam.id).playCard('fail')
    expect(offTeam.id in host.snapshot.game.missionCards).toBe(false)
    expect(host.snapshot.game.phase).toBe('mission')
  })
})

describe('full games over the wire', () => {
  function playMission(host: PartyHost, clients: Map<string, PartyClient>, fail: boolean) {
    const spies = host.snapshot.game.players.filter((p) => p.role === 'spy').map((p) => p.id)
    const team = proposeFirstTeam(host, clients, fail ? [spies[0]!] : [])
    voteAll(host, clients, true)
    for (const id of team) {
      clientFor(host, clients, id).playCard(fail && spies.includes(id) ? 'fail' : 'success')
    }
    host.revealMission()
    host.confirmMission()
  }

  it('resistance wins 3 clean missions end-to-end', async () => {
    const { host, clients } = await startedRoom(NAMES7)
    // Team of resistance only so no fail is possible.
    for (let i = 0; i < 3; i++) {
      const resistance = host.snapshot.game.players
        .filter((p) => p.role === 'resistance')
        .map((p) => p.id)
      const size = currentTeamSize(host.snapshot.game)
      clientFor(host, clients, currentLeaderId(host.snapshot.game)!).proposeTeam(
        resistance.slice(0, size),
      )
      voteAll(host, clients, true)
      for (const id of host.snapshot.game.proposedTeam) {
        clientFor(host, clients, id).playCard('success')
      }
      host.revealMission()
      host.confirmMission()
    }
    expect(host.snapshot.game.phase).toBe('gameOver')
    expect(host.snapshot.game.winner).toBe('resistance')
    // Mirrors see the same ending.
    expect(clients.get('Alice')!.state.snapshot?.game.winner).toBe('resistance')
  })

  it('spies win 3 sabotaged missions, then the room returns to the lobby with seats kept', async () => {
    const { host, clients } = await startedRoom()
    for (let i = 0; i < 3; i++) playMission(host, clients, true)
    expect(host.snapshot.game.phase).toBe('gameOver')
    expect(host.snapshot.game.winner).toBe('spies')

    host.backToLobby()
    expect(host.snapshot.game.phase).toBe('setup')
    expect(host.snapshot.game.players).toHaveLength(0)
    expect(host.snapshot.seats.map((s) => s.name)).toEqual(NAMES5)
    expect(host.snapshot.net).toEqual({
      roleAcks: [],
      ballots: {},
      votesRevealed: false,
      missionRevealed: false,
    })
  })

  it('five straight rejections hand the win to the spies', async () => {
    const { host, clients } = await startedRoom()
    for (let i = 0; i < 5; i++) {
      proposeFirstTeam(host, clients)
      voteAll(host, clients, false)
    }
    expect(host.snapshot.game.phase).toBe('gameOver')
    expect(host.snapshot.game.winner).toBe('spies')
  })
})

describe('reconnection and rehydration', () => {
  it('a new host session resumes from the stored snapshot', async () => {
    const { hub, host, clients } = await startedRoom()
    proposeFirstTeam(host, clients)
    clientFor(host, clients, 0).vote('approve')
    const before = host.snapshot
    host.close() // the host device "refreshes"

    const revived = await PartyHost.resume(hub.transport(), CODE)
    expect(revived).not.toBeNull()
    expect(revived!.snapshot).toEqual(before)

    // The revived host keeps accepting intents mid-vote.
    clientFor(revived!, clients, 1).vote('reject')
    expect(voteTally(revived!.snapshot).done).toBe(2)
  })

  it('a refreshed player rehydrates the snapshot and finds its seat by clientId', async () => {
    const { hub, host, clients } = await startedRoom()
    clients.get('Charlie')!.close()

    const back = new PartyClient(hub.transport(), CODE, 'client-Charlie')
    await back.ready
    expect(back.state.status).toBe('connected')
    expect(back.seat?.playerId).toBe(2)
    expect(back.state.snapshot?.game.phase).toBe(host.snapshot.game.phase)
  })

  it('resume returns null for an unknown room, and clients report not-found', async () => {
    const hub = createMemoryHub()
    expect(await PartyHost.resume(hub.transport(), 'NOPE')).toBeNull()
    const client = new PartyClient(hub.transport(), 'NOPE', 'x')
    expect(await client.ready).toBe('not-found')
  })
})

describe('live reconnection (socket drop + resubscribe)', () => {
  /** Simulate an offline window: silence a client's live push (as a dropped
   *  socket would) so subsequent host writes are "missed" by that mirror. */
  function goOffline(client: PartyClient): void {
    ;(client as unknown as { offSnapshots: () => void }).offSnapshots()
  }

  it('a returning client re-fetches and lands on the current phase, not a stale one', async () => {
    const { hub, host, clients } = await openRoom()
    const alice = clients.get('Alice')!
    expect(alice.state.snapshot?.game.phase).toBe('setup')

    // Offline: the game advances while Alice's push is dropped, so her mirror
    // is now stale.
    goOffline(alice)
    host.startGame(7)
    host.beginRounds()
    expect(alice.state.snapshot?.game.phase).toBe('setup') // missed the updates

    // The socket reconnects → the client MUST re-fetch and catch up to the
    // real current phase, not the stale one.
    hub.simulateReconnect(CODE)
    await Promise.resolve()
    await Promise.resolve()
    expect(alice.state.snapshot?.game.phase).toBe('teamProposal')
  })

  it('a returning host re-publishes its authoritative snapshot on reconnect', async () => {
    const { hub, host } = await startedRoom()
    host.startGame(7) // no-op (already past setup) — host is mid-game

    // A raw subscriber that misses nothing new until the host reconnect fires.
    let pushes = 0
    let lastPhase: string | undefined
    const off = hub.transport().onSnapshot(CODE, (snap) => {
      pushes += 1
      lastPhase = snap.game.phase
    })

    hub.simulateReconnect(CODE)
    await Promise.resolve()
    // The host answered the reconnect by re-publishing its current snapshot.
    expect(pushes).toBe(1)
    expect(lastPhase).toBe(host.snapshot.game.phase)
    off()
  })
})

describe('leave (lobby only)', () => {
  it('drops the seat and re-indexes so the big screen and phones update', async () => {
    const { host, clients } = await openRoom()
    expect(host.snapshot.seats.map((s) => s.name)).toEqual(NAMES5)

    clients.get('Charlie')!.leave()
    const seats = host.snapshot.seats
    expect(seats.map((s) => s.name)).toEqual(['Alice', 'Bob', 'Diana', 'Eve'])
    // playerId stays contiguous 0..n-1 for the next SETUP.
    expect(seats.map((s) => s.playerId)).toEqual([0, 1, 2, 3])
    // Remaining mirrors see the drop.
    expect(clients.get('Alice')!.state.snapshot?.seats).toHaveLength(4)
  })

  it('lets a player rename by leaving and rejoining as a new seat', async () => {
    const { hub, host, clients } = await openRoom(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'])
    clients.get('Bob')!.leave()
    expect(host.snapshot.seats.map((s) => s.name)).not.toContain('Bob')

    const renamed = new PartyClient(hub.transport(), CODE, 'client-Bob-2')
    await renamed.ready
    renamed.join('Bobby')
    expect(host.snapshot.seats.map((s) => s.name)).toContain('Bobby')
    expect(host.snapshot.seats).toHaveLength(5)
  })

  it('is a no-op mid-game (seats are bound to engine players)', async () => {
    const { host, clients } = await startedRoom()
    clientFor(host, clients, 2).leave()
    expect(host.snapshot.seats).toHaveLength(5)
    expect(host.snapshot.game.players).toHaveLength(5)
  })

  it('reliably removes the seat before local teardown (no ghost)', async () => {
    const { hub, host } = await openRoom()
    // A fresh device joins, then immediately leaves and tears down its
    // transport in the same tick — the leave must still land on the host.
    const bailer = new PartyClient(hub.transport(), CODE, 'bailer')
    await bailer.ready
    bailer.join('Zoe')
    expect(host.snapshot.seats.map((s) => s.name)).toContain('Zoe')

    // Await the leave send, then teardown — the race the fix closes.
    await bailer.leave()
    bailer.close()
    expect(host.snapshot.seats.map((s) => s.name)).not.toContain('Zoe')
  })
})

describe('reclaim an orphaned seat by name (mid-game)', () => {
  it('rebinds the seat to a new clientId, preserving role and current phase', async () => {
    const { hub, host, clients } = await startedRoom() // sits at teamProposal
    const lostSeat = host.snapshot.seats.find((s) => s.name === 'Charlie')!
    const roleBefore = host.snapshot.game.players.find((p) => p.id === lostSeat.playerId)!.role
    // Charlie's original device is gone (cleared storage / new phone).
    clients.get('Charlie')!.close()

    // A brand-new device joins with the SAME name and a fresh clientId.
    const returning = new PartyClient(hub.transport(), CODE, 'charlie-new-device')
    await returning.ready
    returning.join('Charlie')

    // The seat rebinds — same playerId/role, new clientId — no re-deal.
    const seat = host.snapshot.seats.find((s) => s.name === 'Charlie')!
    expect(seat.playerId).toBe(lostSeat.playerId)
    expect(seat.clientId).toBe('charlie-new-device')
    expect(host.snapshot.seats).toHaveLength(5) // no extra seat minted
    expect(host.snapshot.game.players.find((p) => p.id === seat.playerId)!.role).toBe(roleBefore)

    // The returning phone's normal lookup finds it and resumes at the live phase.
    expect(returning.seat?.playerId).toBe(lostSeat.playerId)
    expect(returning.state.snapshot?.game.phase).toBe('teamProposal')
  })

  it('matches names case-insensitively, like the lobby dedupe', async () => {
    const { hub, host } = await startedRoom()
    const returning = new PartyClient(hub.transport(), CODE, 'new-device')
    await returning.ready
    returning.join('  cHaRLie  ')
    const seat = host.snapshot.seats.find((s) => s.name === 'Charlie')!
    expect(seat.clientId).toBe('new-device')
    expect(host.snapshot.seats).toHaveLength(5)
  })

  it('lets a reclaimed leader keep leading and a reclaimed team member play', async () => {
    const { hub, host, clients } = await startedRoom()
    const leaderSeat = host.snapshot.seats.find(
      (s) => s.playerId === currentLeaderId(host.snapshot.game),
    )!
    clients.get(leaderSeat.name)!.close()

    const backLeader = new PartyClient(hub.transport(), CODE, 'leader-back')
    await backLeader.ready
    backLeader.join(leaderSeat.name)
    // The reclaimed leader can propose — the game is unstalled.
    const size = currentTeamSize(host.snapshot.game)
    backLeader.proposeTeam(host.snapshot.game.players.slice(0, size).map((p) => p.id))
    expect(host.snapshot.game.phase).toBe('proposalVote')
  })

  it('still refuses a genuine new player mid-game', async () => {
    const { hub, host } = await startedRoom()
    const newcomer = new PartyClient(hub.transport(), CODE, 'newcomer')
    await newcomer.ready
    newcomer.join('Mallory') // no seat by that name
    expect(host.snapshot.seats).toHaveLength(5)
    expect(host.snapshot.seats.map((s) => s.name)).not.toContain('Mallory')
    expect(newcomer.seat).toBeUndefined()
  })

  it('does NOT reclaim in the lobby — a clashing name still dedupes to a new seat', async () => {
    const { hub, host } = await openRoom() // 5 seats, phase 'setup'
    const beforeCount = host.snapshot.seats.length
    const second = new PartyClient(hub.transport(), CODE, 'second-alice')
    await second.ready
    second.join('Alice') // a *different* person assembling in the lobby
    // Lobby semantics unchanged: a new "Alice 2" seat, not a rebind of Alice.
    expect(host.snapshot.seats).toHaveLength(beforeCount + 1)
    expect(host.snapshot.seats.map((s) => s.name)).toContain('Alice 2')
    const original = host.snapshot.seats.find((s) => s.name === 'Alice')!
    expect(original.clientId).toBe('client-Alice') // untouched
    expect(second.seat?.name).toBe('Alice 2')
  })
})

describe('host closes the room', () => {
  it('sets the closed flag and clients surface it, even after a late fetch', async () => {
    const { hub, host, clients } = await startedRoom()
    host.closeRoom()
    expect(host.snapshot.closed).toBe(true)
    expect(clients.get('Alice')!.roomClosed).toBe(true)

    // A device that only arrives AFTER the close still learns it's over.
    const late = new PartyClient(hub.transport(), CODE, 'latecomer')
    await late.ready
    expect(late.roomClosed).toBe(true)
  })

  it('closeRoom is idempotent', async () => {
    const { host } = await startedRoom()
    host.closeRoom()
    const first = host.snapshot
    host.closeRoom()
    expect(host.snapshot).toBe(first)
  })
})

describe('pending-actor visibility (who, never how)', () => {
  it('names only players who still owe a ballot', async () => {
    const { host, clients } = await startedRoom()
    proposeFirstTeam(host, clients)
    clientFor(host, clients, 1).vote('approve')
    clientFor(host, clients, 3).vote('reject')
    const pending = pendingVoters(host.snapshot)
    // 5 players, 2 voted → 3 outstanding, and their ballots aren't leaked.
    expect(pending).toHaveLength(3)
    expect(pending).not.toContain(host.snapshot.game.players[1]!.name)
    expect(pending).toContain(host.snapshot.game.players[0]!.name)
  })

  it('names only team members who still owe a card', async () => {
    const room = await startedRoom()
    const spy = room.host.snapshot.game.players.find((p) => p.role === 'spy')!
    const team = proposeFirstTeam(room.host, room.clients, [spy.id])
    voteAll(room.host, room.clients, true)
    clientFor(room.host, room.clients, spy.id).playCard('fail')
    const pending = pendingCardPlayers(room.host.snapshot)
    const other = team.find((id) => id !== spy.id)!
    expect(pending).toEqual([room.host.snapshot.game.players.find((p) => p.id === other)!.name])
    // Only team members appear — off-team players are never "pending".
    expect(pending).not.toContain(room.host.snapshot.game.players.find((p) => !team.includes(p.id))!.name)
  })
})

describe('fellow-spy visibility', () => {
  it('shows a spy their fellow spies but nothing to resistance', async () => {
    const { host } = await startedRoom(NAMES7) // 3 spies
    const spies = host.snapshot.game.players.filter((p) => p.role === 'spy')
    const resistance = host.snapshot.game.players.find((p) => p.role === 'resistance')!

    const seen = fellowSpies(host.snapshot, spies[0]!.id)
    expect(seen).toHaveLength(2)
    expect(seen).not.toContain(spies[0]!.name) // never yourself
    expect(new Set(seen)).toEqual(new Set(spies.slice(1).map((s) => s.name)))

    expect(fellowSpies(host.snapshot, resistance.id)).toEqual([])
  })
})

describe('staged mission reveal ordering', () => {
  it('orders successes first and fails last, by outcome not seat', () => {
    expect(revealOrder(2, 5)).toEqual(['success', 'success', 'success', 'fail', 'fail'])
    expect(revealOrder(0, 3)).toEqual(['success', 'success', 'success'])
    expect(revealOrder(3, 3)).toEqual(['fail', 'fail', 'fail'])
    // The last flip is always a fail whenever any fail exists — the climactic beat.
    const order = revealOrder(1, 4)
    expect(order[order.length - 1]).toBe('fail')
  })
})
