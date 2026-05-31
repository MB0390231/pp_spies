import { describe, expect, it } from 'vitest'
import { currentLeaderId, currentTeamSize, initialState, reducer } from './reducer'
import type { Action, GameState, MissionCard, Vote } from './types'

const NAMES7 = ['Al', 'Bo', 'Cy', 'Di', 'Ed', 'Fi', 'Gu']
const NAMES6 = ['Al', 'Bo', 'Cy', 'Di', 'Ed', 'Fi']

function apply(state: GameState, actions: Action[]): GameState {
  return actions.reduce(reducer, state)
}

/** A game advanced through setup + role reveal, sitting at teamProposal. */
function startedGame(names = NAMES7, seed = 123): GameState {
  return apply(initialState(), [
    { type: 'SETUP', names, seed },
    { type: 'START_ROUNDS' },
  ])
}

/** Ids for a team of the current required size containing at least one spy. */
function teamWithSpy(state: GameState): number[] {
  const size = currentTeamSize(state)
  const spy = state.players.find((p) => p.role === 'spy')!
  const rest = state.players.filter((p) => p.id !== spy.id).slice(0, size - 1)
  return [spy.id, ...rest.map((p) => p.id)]
}

/** Ids for a team of the current required size with no spies (7-player games). */
function teamNoSpy(state: GameState): number[] {
  const size = currentTeamSize(state)
  const team = state.players.filter((p) => p.role === 'resistance').slice(0, size)
  return team.map((p) => p.id)
}

function castAll(state: GameState, vote: Vote): GameState {
  return state.players.reduce(
    (s, p) => reducer(s, { type: 'CAST_VOTE', playerId: p.id, vote }),
    state,
  )
}

/** Propose `team`, approve unanimously, confirm — leaving state at 'mission'. */
function approveTeam(state: GameState, team: number[]): GameState {
  const proposed = reducer(state, { type: 'PROPOSE_TEAM', team })
  return reducer(castAll(proposed, 'approve'), { type: 'CONFIRM_VOTE' })
}

/** Play `failers` as fail (spies only — resistance is coerced anyway) and reveal. */
function playMission(state: GameState, failers: number[] = []): GameState {
  return state.proposedTeam.reduce<GameState>((s, id) => {
    const card: MissionCard = failers.includes(id) ? 'fail' : 'success'
    return reducer(s, { type: 'PLAY_CARD', playerId: id, card })
  }, state)
}

describe('SETUP', () => {
  it('assigns the correct number of spies and moves to role reveal', () => {
    const state = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 1 })
    expect(state.phase).toBe('roleReveal')
    expect(state.players).toHaveLength(7)
    expect(state.spyCount).toBe(3)
    expect(state.players.filter((p) => p.role === 'spy')).toHaveLength(3)
  })

  it('picks a leader within range and is deterministic for a seed', () => {
    const a = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 99 })
    const b = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 99 })
    expect(a.leaderIndex).toBe(b.leaderIndex)
    expect(a.leaderIndex).toBeGreaterThanOrEqual(0)
    expect(a.leaderIndex).toBeLessThan(7)
    expect(currentLeaderId(a)).toBe(a.players[a.leaderIndex]!.id)
  })

  it('rejects invalid player counts', () => {
    expect(() =>
      reducer(initialState(), { type: 'SETUP', names: ['a', 'b', 'c', 'd'], seed: 1 }),
    ).toThrow()
  })
})

describe('team proposal', () => {
  it('requires exactly the round team size', () => {
    const state = startedGame()
    expect(currentTeamSize(state)).toBe(2) // 7 players, round 1
    expect(() => reducer(state, { type: 'PROPOSE_TEAM', team: [0, 1, 2] })).toThrow()
  })

  it('rejects duplicate or unknown players', () => {
    const state = startedGame()
    expect(() => reducer(state, { type: 'PROPOSE_TEAM', team: [0, 0] })).toThrow()
    expect(() => reducer(state, { type: 'PROPOSE_TEAM', team: [0, 99] })).toThrow()
  })

  it('advances to vote on a valid proposal', () => {
    const state = reducer(startedGame(), { type: 'PROPOSE_TEAM', team: [0, 1] })
    expect(state.phase).toBe('vote')
    expect(state.proposedTeam).toEqual([0, 1])
  })
})

describe('voting', () => {
  it('reveals the tally once everyone has voted', () => {
    const state = castAll(reducer(startedGame(), { type: 'PROPOSE_TEAM', team: [0, 1] }), 'approve')
    expect(state.phase).toBe('voteReveal')
    expect(state.lastVote).toMatchObject({ approveCount: 7, rejectCount: 0, approved: true })
  })

  it('approves on a strict majority and proceeds to the mission', () => {
    let state = reducer(startedGame(), { type: 'PROPOSE_TEAM', team: [0, 1] })
    state = state.players.reduce(
      (s, p) => reducer(s, { type: 'CAST_VOTE', playerId: p.id, vote: p.id < 4 ? 'approve' : 'reject' }),
      state,
    )
    expect(state.lastVote!.approved).toBe(true)
    state = reducer(state, { type: 'CONFIRM_VOTE' })
    expect(state.phase).toBe('mission')
    expect(state.consecutiveRejects).toBe(0)
  })

  it('rejects on a tie, rotates the leader, and counts the rejection', () => {
    const start = reducer(startedGame(NAMES6), { type: 'PROPOSE_TEAM', team: [0, 1] })
    const leaderBefore = start.leaderIndex
    let state = start.players.reduce(
      (s, p) => reducer(s, { type: 'CAST_VOTE', playerId: p.id, vote: p.id < 3 ? 'approve' : 'reject' }),
      start,
    )
    expect(state.lastVote!.approved).toBe(false) // 3-3 tie
    state = reducer(state, { type: 'CONFIRM_VOTE' })
    expect(state.phase).toBe('teamProposal')
    expect(state.consecutiveRejects).toBe(1)
    expect(state.leaderIndex).toBe((leaderBefore + 1) % 6)
  })

  it('gives spies the win after 5 consecutive rejections', () => {
    let state = startedGame()
    for (let i = 0; i < 5; i++) {
      const proposed = reducer(state, { type: 'PROPOSE_TEAM', team: [0, 1] })
      state = reducer(castAll(proposed, 'reject'), { type: 'CONFIRM_VOTE' })
    }
    expect(state.phase).toBe('gameOver')
    expect(state.winner).toBe('spies')
    expect(state.consecutiveRejects).toBe(5)
  })

  it('resets the rejection streak after an approval', () => {
    let state = startedGame()
    state = reducer(
      castAll(reducer(state, { type: 'PROPOSE_TEAM', team: [0, 1] }), 'reject'),
      { type: 'CONFIRM_VOTE' },
    )
    expect(state.consecutiveRejects).toBe(1)
    state = approveTeam(state, [0, 1])
    expect(state.consecutiveRejects).toBe(0)
  })
})

describe('missions', () => {
  it('succeeds when all cards are success', () => {
    const state = playMission(approveTeam(startedGame(), teamNoSpy(startedGame())))
    expect(state.phase).toBe('missionReveal')
    expect(state.lastMission).toMatchObject({ success: true, failCount: 0 })
  })

  it('coerces resistance players to success even if they try to fail', () => {
    const game = startedGame()
    const team = teamNoSpy(game) // all resistance
    const state = playMission(approveTeam(game, team), team) // everyone "fails"
    expect(state.lastMission).toMatchObject({ failCount: 0, success: true })
  })

  it('fails on round 1 when a spy plays a fail card', () => {
    const game = startedGame()
    const team = teamWithSpy(game)
    const spy = game.players.find((p) => team.includes(p.id) && p.role === 'spy')!
    const state = playMission(approveTeam(game, team), [spy.id])
    expect(state.lastMission).toMatchObject({ failCount: 1, success: false })
  })

  it('rejects cards from players not on the mission', () => {
    const state = approveTeam(startedGame(), [0, 1])
    const outsider = state.players.find((p) => !state.proposedTeam.includes(p.id))!
    expect(() =>
      reducer(state, { type: 'PLAY_CARD', playerId: outsider.id, card: 'fail' }),
    ).toThrow()
  })
})

describe('round 4 two-fail rule (7 players)', () => {
  function succeedMission(state: GameState): GameState {
    const team = teamNoSpy(state)
    return reducer(playMission(approveTeam(state, team)), { type: 'CONFIRM_MISSION' })
  }

  function failMission(state: GameState): GameState {
    const team = teamWithSpy(state)
    const spy = state.players.find((p) => team.includes(p.id) && p.role === 'spy')!
    return reducer(playMission(approveTeam(state, team), [spy.id]), { type: 'CONFIRM_MISSION' })
  }

  it('does not fail round 4 on a single spy fail, but does on two', () => {
    // Walk to round 4: success, success, fail → successes 2, fails 1.
    let s = startedGame()
    s = succeedMission(s)
    s = succeedMission(s)
    s = failMission(s)
    expect(s.round).toBe(4)
    expect(s.successes).toBe(2)
    expect(s.fails).toBe(1)

    // One spy fail is not enough on round 4 with 7 players.
    const oneFail = playMission(approveTeam(s, teamWithSpy(s)), [
      s.players.find((p) => teamWithSpy(s).includes(p.id) && p.role === 'spy')!.id,
    ])
    expect(oneFail.lastMission).toMatchObject({ failCount: 1, success: true })

    // Two spy fails do fail it.
    const team = state2Spies(s)
    const spies = s.players.filter((p) => team.includes(p.id) && p.role === 'spy').map((p) => p.id)
    const twoFail = playMission(approveTeam(s, team), spies)
    expect(twoFail.lastMission).toMatchObject({ failCount: 2, success: false })
  })

  /** A round-4 team (size 4) containing two spies. */
  function state2Spies(state: GameState): number[] {
    const size = currentTeamSize(state)
    const spies = state.players.filter((p) => p.role === 'spy').slice(0, 2)
    const fill = state.players
      .filter((p) => !spies.includes(p))
      .slice(0, size - spies.length)
    return [...spies, ...fill].map((p) => p.id)
  }
})

describe('win conditions', () => {
  it('resistance wins after 3 successful missions', () => {
    let s = startedGame()
    for (let i = 0; i < 3; i++) {
      s = reducer(playMission(approveTeam(s, teamNoSpy(s))), { type: 'CONFIRM_MISSION' })
    }
    expect(s.phase).toBe('gameOver')
    expect(s.winner).toBe('resistance')
    expect(s.successes).toBe(3)
  })

  it('spies win after 3 failed missions', () => {
    let s = startedGame()
    for (let i = 0; i < 3; i++) {
      // Use a team with enough spies for the round (handles round-4 two-fail).
      const size = currentTeamSize(s)
      const need = s.round === 4 ? 2 : 1
      const spies = s.players.filter((p) => p.role === 'spy').slice(0, need)
      const fill = s.players.filter((p) => !spies.includes(p)).slice(0, size - spies.length)
      const team = [...spies, ...fill].map((p) => p.id)
      s = reducer(playMission(approveTeam(s, team), spies.map((p) => p.id)), {
        type: 'CONFIRM_MISSION',
      })
    }
    expect(s.phase).toBe('gameOver')
    expect(s.winner).toBe('spies')
    expect(s.fails).toBe(3)
  })
})

describe('RESET', () => {
  it('returns to the initial setup state', () => {
    const s = reducer(startedGame(), { type: 'RESET' })
    expect(s).toEqual(initialState())
  })
})
