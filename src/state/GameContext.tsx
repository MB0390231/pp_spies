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
import type { Action, GameState } from '../engine'

const STORAGE_KEY = 'spies:game'

function load(): GameState {
  if (typeof localStorage === 'undefined') return initialState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GameState) : initialState()
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
