// A standalone visual gallery: a sidebar of every screen + variant, each
// rendered in a device-sized frame from mock state. Not part of the game bundle —
// served at /storybook.html. Selecting a Pass & Play scenario mounts the real
// screen inside a non-persisting GameProvider seeded with that scenario's
// GameState. Party Mode scenarios go further: each seeds a live in-memory room
// (real PartyHost + PartyClients over the memory transport) so the big screen
// and phone frames are fully interactive with no backend. The whole gallery
// sits inside a non-persisting ThemeProvider (see ./main.tsx) so every frame
// renders with the real theme tokens.

import { useState } from 'react'
import { PauseOverlay } from '../components/PauseOverlay'
import { RulesOverlay } from '../components/RulesOverlay'
import { ScoreTrack } from '../components/ScoreTrack'
import { SettingsSheet } from '../components/SettingsSheet'
import { GameProvider } from '../state/GameContext'
import { Tutorial } from '../tutorial/Tutorial'
import { AiHarness, aiScenarios } from './aiFixtures'
import { scenarios } from './fixtures'
import { HostJoinStage, hostJoinScenarios } from './hostJoinFixtures'
import { PartyStage, partyScenarios } from './partyFixtures'

function SidebarSection({
  title,
  items,
  activeId,
  onSelect,
}: {
  title: string
  items: { id: string; label: string }[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <>
      <p className="px-2 pb-2 pt-4 font-mono text-xs font-bold uppercase tracking-label text-faint">
        {title}
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
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
    </>
  )
}

export function Storybook() {
  const [activeId, setActiveId] = useState(scenarios[0]!.id)
  // Bumped on EVERY selection — including re-selecting the active scenario — so
  // the live-room stages remount fresh. Otherwise a scenario keeps the state it
  // was mutated into, defeating "preview each phase without playing".
  const [selectNonce, setSelectNonce] = useState(0)
  const select = (id: string) => {
    setActiveId(id)
    setSelectNonce((n) => n + 1)
  }
  const active = scenarios.find((s) => s.id === activeId)
  const activeParty = partyScenarios.find((s) => s.id === activeId)
  const activeHostJoin = hostJoinScenarios.find((s) => s.id === activeId)
  const activeAi = aiScenarios.find((s) => s.id === activeId)
  const current = active ?? activeParty ?? activeHostJoin ?? activeAi ?? scenarios[0]!
  const Screen = active?.Screen

  return (
    <div className="flex h-screen bg-bg text-ink">
      <nav className="w-64 shrink-0 overflow-y-auto border-r border-line p-3">
        <p className="px-2 pb-1 font-mono text-xs font-bold uppercase tracking-label text-faint">
          Spies · Storybook
        </p>
        <SidebarSection
          title="Pass & Play"
          items={scenarios}
          activeId={activeId}
          onSelect={select}
        />
        <SidebarSection
          title="Party Mode"
          items={partyScenarios}
          activeId={activeId}
          onSelect={select}
        />
        <SidebarSection
          title="Host & Join"
          items={hostJoinScenarios}
          activeId={activeId}
          onSelect={select}
        />
        <SidebarSection
          title="AI Mode (dev)"
          items={aiScenarios}
          activeId={activeId}
          onSelect={select}
        />
      </nav>

      <main className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-8">
        <div className="text-center">
          <h1 className="text-lg font-bold">{current.label}</h1>
          {current.note && <p className="mt-1 text-xs text-muted">{current.note}</p>}
        </div>

        {activeAi ? (
          <AiHarness key={`${activeAi.id}:${selectNonce}`} scenarioId={activeAi.id} resetNonce={selectNonce} />
        ) : activeHostJoin ? (
          <HostJoinStage key={`${activeHostJoin.id}:${selectNonce}`} scenario={activeHostJoin} />
        ) : activeParty ? (
          <PartyStage key={`${activeParty.id}:${selectNonce}`} scenario={activeParty} />
        ) : active ? (
          /* Phone frame — mirrors the live app's root layout. `transform-gpu` for
             overlay scenarios makes the frame a containing block so PauseOverlay's
             `fixed inset-0` is scoped to the phone, not the whole gallery window. */
          <div
            key={`${active.id}:${selectNonce}`}
            className={`my-auto h-[780px] w-[380px] overflow-y-auto rounded-[2rem] border-4 border-line shadow-pop ${
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
              ) : active.overlay === 'tutorial' ? (
                <Tutorial onExit={() => {}} />
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
        ) : null}
      </main>
    </div>
  )
}
