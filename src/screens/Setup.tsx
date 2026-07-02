import { useState } from 'react'
import { Button } from '../components/Button'
import { SettingsSheet } from '../components/SettingsSheet'
import { MAX_PLAYERS, MIN_PLAYERS, spyCount } from '../engine'
import { useGame } from '../state/GameContext'
import { fmt, useLexicon, useTheme } from '../theme'

/** Public screen: choose player count and enter names, then assign roles. */
export function Setup({ onHowToPlay }: { onHowToPlay?: () => void }) {
  const { dispatch } = useGame()
  const lex = useLexicon()
  // Hard mode lives in settings (ThemeContext), not local state, so it sticks
  // between games. It maps onto the engine's `challengeMode` flag at SETUP.
  const { hardMode } = useTheme()
  const [names, setNames] = useState<string[]>(() => Array(MIN_PLAYERS).fill(''))
  const [settingsOpen, setSettingsOpen] = useState(false)

  const trimmed = names.map((n) => n.trim())
  const allNamed = trimmed.every((n) => n.length > 0)
  const unique = new Set(trimmed).size === trimmed.length
  const canStart = allNamed && unique

  function setName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)))
  }

  function start() {
    dispatch({ type: 'SETUP', names: trimmed, seed: Date.now(), challengeMode: hardMode })
  }

  return (
    <div className="relative flex min-h-full animate-rise flex-col items-center gap-6 p-6 pt-20">
      <button
        type="button"
        aria-label={lex.setup.settings}
        onClick={() => setSettingsOpen(true)}
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-control border border-line bg-surface/80 text-muted transition duration-fast ease-theme hover:border-line-strong hover:text-ink active:scale-95"
      >
        {/* Gear icon — inline SVG so it inherits the theme's text color. */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5"
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

      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-ink">
          <span aria-hidden className="mr-2">
            {lex.app.icon}
          </span>
          {lex.app.name}
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-label text-faint">
          {lex.app.subtitle}
        </p>
        <p className="mt-3 max-w-xs text-sm italic text-muted">{lex.app.tagline}</p>
        <p className="mt-3 text-sm text-muted">
          {fmt(lex.setup.summary, { players: names.length, spies: spyCount(names.length) })}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {names.map((name, i) => (
          <input
            key={i}
            value={name}
            onChange={(e) => setName(i, e.target.value)}
            placeholder={fmt(lex.setup.playerPlaceholder, { n: i + 1 })}
            className="rounded-field border border-line bg-surface px-4 py-3 text-lg text-ink outline-none transition duration-fast ease-theme placeholder:text-faint focus:border-line-strong"
          />
        ))}
      </div>

      <div className="flex w-full max-w-sm items-center justify-center gap-3">
        <Button
          variant="neutral"
          aria-label={lex.setup.removePlayer}
          onClick={() => setNames((prev) => prev.slice(0, -1))}
          disabled={names.length <= MIN_PLAYERS}
          className="w-20 !py-3"
        >
          −
        </Button>
        <span className="w-28 text-center font-mono text-xs uppercase tracking-label text-faint">
          {fmt(lex.setup.playerCount, { count: names.length })}
        </span>
        <Button
          variant="neutral"
          aria-label={lex.setup.addPlayer}
          onClick={() => setNames((prev) => [...prev, ''])}
          disabled={names.length >= MAX_PLAYERS}
          className="w-20 !py-3"
        >
          +
        </Button>
      </div>

      <div className="mt-auto flex w-full max-w-sm flex-col gap-3">
        <Button onClick={start} disabled={!canStart}>
          {canStart ? lex.setup.start : !allNamed ? lex.setup.needNames : lex.setup.needUnique}
        </Button>
        {onHowToPlay && (
          <Button variant="neutral" onClick={onHowToPlay}>
            {lex.setup.howToPlay}
          </Button>
        )}
      </div>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
