// A tiny UI-only flag for the manual pause/resume feature. It is deliberately
// kept OUT of the engine reducer (pause is not a game-rule transition) and
// persisted under its own localStorage key so the pure engine and its
// `spies:game` blob stay untouched. Persisting means a paused game stays hidden
// behind the pause screen across a refresh or app reopen, not just in-session.

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'spies:paused'

function load(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** `[paused, setPaused]`, persisted to localStorage so a pause survives refresh. */
export function usePaused(): [boolean, (value: boolean) => void] {
  const [paused, setPaused] = useState<boolean>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, paused ? 'true' : 'false')
    } catch {
      // Storage full or unavailable — pause still works in-session.
    }
  }, [paused])

  return [paused, setPaused]
}
