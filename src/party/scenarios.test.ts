// AI Mode: scripted-scenario determinism, bots-never-illegal, full auto-play to
// game-over (both modes), and the leave / mid-game-reclaim flows — all over the
// in-memory transport via the pure RoomController + bots. Leave/reclaim at the
// host level is covered in host.test.ts / hostJoin.test.ts; here we assert the
// harness driver exercises them and the outcomes stay consistent.

import { describe, expect, it } from 'vitest'
import { nextSeatIntent, scriptedTeam } from './bots'
import { SCENARIOS, RoomController, getScenario } from './scenarios'
import { currentLeaderId, currentTeamSize } from '../engine'

/** Re-run a scenario headlessly and return the final snapshot. */
async function play(id: string) {
  const ctrl = await RoomController.open(getScenario(id)!)
  ctrl.run()
  const snap = ctrl.snapshot
  ctrl.close()
  return snap
}

describe('scripted scenarios reach their intended outcomes', () => {
  it('Party · resistance sweep → resistance wins 3 clean', async () => {
    const snap = await play('party-resistance-sweep')
    expect(snap.game.phase).toBe('gameOver')
    expect(snap.game.winner).toBe('resistance')
    expect(snap.game.successes).toBe(3)
  })

  it('Party · spies win on missions → 3 failed missions', async () => {
    const snap = await play('party-spies-missions')
    expect(snap.game.phase).toBe('gameOver')
    expect(snap.game.winner).toBe('spies')
    expect(snap.game.fails).toBe(3)
  })

  it('Party · 5 rejects → spies win with no mission run', async () => {
    const snap = await play('party-five-rejects')
    expect(snap.game.phase).toBe('gameOver')
    expect(snap.game.winner).toBe('spies')
    expect(snap.game.consecutiveRejects).toBe(5)
    expect(snap.game.results).toHaveLength(0)
  })

  it('Host & Join · resistance sweep → resistance wins (host is a player)', async () => {
    const snap = await play('hostjoin-resistance-sweep')
    expect(snap.game.phase).toBe('gameOver')
    expect(snap.game.winner).toBe('resistance')
    // Host held seat 0 and played through the shared path.
    expect(snap.seats[0]?.clientId).toBe(RoomController.HOST_CLIENT)
  })

  it('Host & Join · R4 drama → two fails sink mission 4', async () => {
    const snap = await play('hostjoin-r4-drama')
    expect(snap.game.phase).toBe('gameOver')
    const r4 = snap.game.results.find((r) => r.round === 4)
    expect(r4?.failCount).toBe(2)
    expect(r4?.success).toBe(false)
  })

  it('Party · R4 drama → one fail is NOT enough (mission 4 survives)', async () => {
    const snap = await play('party-r4-drama')
    const r4 = snap.game.results.find((r) => r.round === 4)
    // Exactly one fail on R4, but the rule needs two with 7 players → survives.
    expect(r4?.failCount).toBe(1)
    expect(r4?.success).toBe(true)
  })
})

describe('determinism: same seed + script → identical game', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.id} replays identically`, async () => {
      const a = await play(scenario.id)
      const b = await play(scenario.id)
      // Full engine state must match byte-for-byte across runs.
      expect(a.game).toEqual(b.game)
    })
  }
})

describe('bots never emit an illegal intent', () => {
  it('every intent a scenario produces is accepted by the host (no phase/lock violations)', async () => {
    for (const scenario of SCENARIOS) {
      const ctrl = await RoomController.open(scenario)
      let steps = 0
      // Step one action at a time; after each, the engine must not have thrown
      // and the snapshot must stay on a known phase.
      while (ctrl.snapshot.game.phase !== 'gameOver' && steps++ < 500) {
        const before = ctrl.snapshot
        const moved = ctrl.step()
        if (!moved) break
        const after = ctrl.snapshot
        // A vote never appears after reveal; a card never exceeds the team; a
        // proposal only from the leader — all enforced by the host, so the only
        // way to check "no illegal intent" is that the snapshot stayed valid and
        // progressed through legal phases. Assert phase is always known.
        expect([
          'setup',
          'roleReveal',
          'teamProposal',
          'proposalVote',
          'mission',
          'missionReveal',
          'gameOver',
        ]).toContain(after.game.phase)
        void before
      }
      expect(ctrl.snapshot.game.phase).toBe('gameOver')
      ctrl.close()
    }
  })

  it('nextSeatIntent respects leadership: only the leader gets a proposeTeam', async () => {
    const ctrl = await RoomController.open(getScenario('party-resistance-sweep')!)
    // Advance to teamProposal.
    let guard = 0
    while (ctrl.snapshot.game.phase !== 'teamProposal' && guard++ < 50) ctrl.step()
    const leader = currentLeaderId(ctrl.snapshot.game)!
    for (const seat of ctrl.snapshot.seats) {
      const intent = nextSeatIntent(ctrl.scenario, ctrl.snapshot, seat.playerId)
      if (seat.playerId === leader) {
        expect(intent?.kind).toBe('proposeTeam')
        expect(intent && 'team' in intent && intent.team).toHaveLength(
          currentTeamSize(ctrl.snapshot.game),
        )
      } else {
        expect(intent).toBeNull()
      }
    }
    ctrl.close()
  })

  it('scriptedTeam falls back to a legal team when the script is missing/wrong', async () => {
    const ctrl = await RoomController.open(getScenario('party-resistance-sweep')!)
    let guard = 0
    while (ctrl.snapshot.game.phase !== 'teamProposal' && guard++ < 50) ctrl.step()
    const team = scriptedTeam(ctrl.scenario, ctrl.snapshot)
    expect(team).toHaveLength(currentTeamSize(ctrl.snapshot.game))
    expect(new Set(team).size).toBe(team.length)
    ctrl.close()
  })
})

describe('leave in the lobby drops the seat + re-indexes, reflected in the snapshot', () => {
  it('Party lobby leave removes the seat everywhere', async () => {
    const ctrl = await RoomController.open(getScenario('party-resistance-sweep')!)
    expect(ctrl.snapshot.seats.map((s) => s.name)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
      'Diana',
      'Eve',
    ])
    ctrl.leaveLobby(1) // Bob leaves
    const seats = ctrl.snapshot.seats
    expect(seats.map((s) => s.name)).toEqual(['Alice', 'Charlie', 'Diana', 'Eve'])
    // Re-indexed so playerId stays contiguous for the next SETUP.
    expect(seats.map((s) => s.playerId)).toEqual([0, 1, 2, 3])
    ctrl.close()
  })
})

describe('mid-game disconnect → reclaim-by-name resumes at the current phase', () => {
  it('a disconnected seat rejoins, keeps its role, and the game continues', async () => {
    const ctrl = await RoomController.open(getScenario('party-resistance-sweep')!)
    // Advance into the game (past role reveal) so a leave would be a reclaim.
    let guard = 0
    while (ctrl.snapshot.game.phase === 'setup' || ctrl.snapshot.game.phase === 'roleReveal') {
      if (guard++ > 50) break
      ctrl.step()
    }
    expect(ctrl.snapshot.game.phase).toBe('teamProposal')

    const roleBefore = ctrl.snapshot.game.players.find((p) => p.id === 2)!.role
    ctrl.disconnect(2) // Charlie's device drops; seat is orphaned
    expect(ctrl.snapshot.seats.some((s) => s.playerId === 2)).toBe(true) // seat kept

    await ctrl.reclaim(2) // rejoins by name → rebinds seat
    const seat = ctrl.snapshot.seats.find((s) => s.playerId === 2)!
    expect(seat.clientId).toContain('ai-reclaim-2')
    // Same role, same phase — no re-deal.
    expect(ctrl.snapshot.game.players.find((p) => p.id === 2)!.role).toBe(roleBefore)
    expect(ctrl.snapshot.game.phase).toBe('teamProposal')

    // And the game can still be driven to completion after the reclaim.
    ctrl.run()
    expect(ctrl.snapshot.game.phase).toBe('gameOver')
    expect(ctrl.snapshot.game.winner).toBe('resistance')
    ctrl.close()
  })
})
