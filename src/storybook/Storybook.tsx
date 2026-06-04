// A standalone visual gallery: a sidebar of every screen + variant, each
// rendered in a phone-sized frame from mock state. Not part of the game bundle —
// served at /storybook.html. Selecting a scenario mounts the real screen inside
// a non-persisting GameProvider seeded with that scenario's GameState.

import { useState } from 'react'
import { ScoreTrack } from '../components/ScoreTrack'
import { GameProvider } from '../state/GameContext'
import { scenarios } from './fixtures'

export function Storybook() {
  const [activeId, setActiveId] = useState(scenarios[0]!.id)
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0]!
  const Screen = active.Screen

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <nav className="w-64 shrink-0 overflow-y-auto border-r border-slate-800 p-3">
        <p className="px-2 pb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
          Spies · Storybook
        </p>
        <ul className="flex flex-col gap-1">
          {scenarios.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setActiveId(s.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  s.id === activeId
                    ? 'bg-emerald-500/20 font-semibold text-emerald-300'
                    : 'text-slate-300 hover:bg-slate-800'
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
          {active.note && <p className="mt-1 text-xs text-slate-400">{active.note}</p>}
        </div>

        {/* Phone frame — mirrors the live app's root layout. */}
        <div className="h-[780px] w-[380px] overflow-y-auto rounded-[2rem] border-4 border-slate-700 shadow-2xl">
          <div className="flex min-h-full flex-col items-center bg-slate-900 text-slate-100">
            {active.showScore && <ScoreTrack state={active.state} />}
            <div className="flex w-full max-w-md flex-1 flex-col">
              <GameProvider key={active.id} initialState={active.state} persist={false}>
                <Screen />
              </GameProvider>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
