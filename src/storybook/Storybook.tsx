// A standalone visual gallery: a sidebar of every screen + variant, each
// rendered in a phone-sized frame from mock state. Not part of the game bundle —
// served at /storybook.html. Selecting a scenario mounts the real screen inside
// a non-persisting GameProvider seeded with that scenario's GameState. The whole
// gallery sits inside a non-persisting ThemeProvider (see ./main.tsx) so every
// frame renders with the real theme tokens.

import { useState } from 'react'
import { PauseOverlay } from '../components/PauseOverlay'
import { RulesOverlay } from '../components/RulesOverlay'
import { ScoreTrack } from '../components/ScoreTrack'
import { SettingsSheet } from '../components/SettingsSheet'
import { GameProvider } from '../state/GameContext'
import { scenarios } from './fixtures'

export function Storybook() {
  const [activeId, setActiveId] = useState(scenarios[0]!.id)
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0]!
  const Screen = active.Screen

  return (
    <div className="flex h-screen bg-bg text-ink">
      <nav className="w-64 shrink-0 overflow-y-auto border-r border-line p-3">
        <p className="px-2 pb-3 font-mono text-xs font-bold uppercase tracking-label text-faint">
          Spies · Storybook
        </p>
        <ul className="flex flex-col gap-1">
          {scenarios.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`w-full rounded-chip px-3 py-2 text-left text-sm transition ${
                  s.id === activeId
                    ? 'bg-accent/20 font-semibold text-accent'
                    : 'text-muted hover:bg-surface'
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-8">
        <div className="text-center">
          <h1 className="text-lg font-bold">{active.label}</h1>
          {active.note && <p className="mt-1 text-xs text-muted">{active.note}</p>}
        </div>

        {/* Phone frame — mirrors the live app's root layout. `transform-gpu` for
            overlay scenarios makes the frame a containing block so PauseOverlay's
            `fixed inset-0` is scoped to the phone, not the whole gallery window. */}
        <div
          className={`h-[780px] w-[380px] overflow-y-auto rounded-[2rem] border-4 border-line shadow-pop ${
            active.overlay ? 'transform-gpu' : ''
          }`}
        >
          <div className="bg-backdrop flex min-h-full flex-col items-center text-ink">
            {active.showScore && <ScoreTrack state={active.state} />}
            {active.overlay === 'pause' ? (
              <PauseOverlay onResume={() => {}} onQuit={() => {}} onViewRules={() => {}} />
            ) : active.overlay === 'rules' ? (
              <RulesOverlay onClose={() => {}} />
            ) : active.overlay === 'settings' ? (
              <SettingsSheet onClose={() => {}} />
            ) : (
              Screen && (
                <div className="flex w-full max-w-md flex-1 flex-col">
                  <GameProvider key={active.id} initialState={active.state} persist={false}>
                    <Screen />
                  </GameProvider>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
