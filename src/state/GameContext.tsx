// React binding for the pure engine: a reducer-backed context that persists the
// full game to localStorage after every action so a refresh resumes mid-game.

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import { initialState, reducer } from '../engine'
import type { Action, GameState, Phase } from '../engine'

const STORAGE_KEY = 'spies:game'

// Phases the current engine knows how to render. A save from an older build
// (e.g. one parked in the removed per-player 'vote' phase) has no screen to
// resume into, so it falls back to a fresh game instead of crashing the router.
const KNOWN_PHASES: ReadonlySet<Phase> = new Set<Phase>([
  'setup',
  'roleReveal',
  'teamProposal',
  'proposalVote',
  'mission',
  'missionReveal',
  'gameOver',
])

/**
 * Wipe the saved game. Quitting to the menu unmounts the provider in the same
 * render, so a RESET dispatch's persist effect never fires — clear the key
 * directly so "abandon this game" actually sticks across a re-entry.
 */
export function clearPersistedGame(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

function load(): GameState {
  if (typeof localStorage === 'undefined') return initialState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const saved = JSON.parse(raw) as GameState
    return KNOWN_PHASES.has(saved.phase) ? saved : initialState()
  } catch {
    return initialState()
  }
}

const GameContext = createContext<{
  state: GameState
  dispatch: Dispatch<Action>
} | null>(null)

export function GameProvider({
  children,
  initialState: injected,
  persist = true,
}: {
  children: ReactNode
  /** Seed the reducer with a fixed state (e.g. for the storybook) instead of localStorage. */
  initialState?: GameState
  /** When false, never touch localStorage — keeps previews from clobbering a real game. */
  persist?: boolean
}) {
  const [state, dispatch] = useReducer(reducer, injected, (seed) => seed ?? load())

  useEffect(() => {
    if (!persist) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or unavailable — the game still plays, just won't resume.
    }
  }, [state, persist])

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}
