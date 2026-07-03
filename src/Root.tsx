// Mode router above the game: Main Menu → Pass & Play (the original
// single-device app, untouched) or Party Mode (networked big screen + phones).
// The chosen mode persists so a refresh mid-game returns straight to it —
// Pass & Play then resumes from `spies:game`, Party Mode from its saved room.

import { useEffect, useState } from 'react'
import App from './App'
import { HostJoinMode } from './party/react/HostJoinMode'
import { PartyMode } from './party/react/PartyMode'
import { MainMenu } from './screens/MainMenu'
import { GameProvider } from './state/GameContext'

type Mode = 'menu' | 'pass' | 'party' | 'hostjoin'

const MODE_KEY = 'spies:mode'

function loadMode(): Mode {
  if (typeof localStorage === 'undefined') return 'menu'
  try {
    const raw = localStorage.getItem(MODE_KEY)
    return raw === 'pass' || raw === 'party' || raw === 'hostjoin' ? raw : 'menu'
  } catch {
    return 'menu'
  }
}

export function Root() {
  const [mode, setMode] = useState<Mode>(loadMode)

  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      // Storage unavailable — mode just won't survive a refresh.
    }
  }, [mode])

  if (mode === 'pass') {
    return (
      <GameProvider>
        <App onExitToMenu={() => setMode('menu')} />
      </GameProvider>
    )
  }
  if (mode === 'party') {
    return <PartyMode onExit={() => setMode('menu')} />
  }
  if (mode === 'hostjoin') {
    return <HostJoinMode onExit={() => setMode('menu')} />
  }
  return (
    <MainMenu
      onPassPlay={() => setMode('pass')}
      onParty={() => setMode('party')}
      onHostJoin={() => setMode('hostjoin')}
    />
  )
}
