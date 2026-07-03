import { useState } from 'react'
import { SettingsSheet } from '../components/SettingsSheet'
import { useLexicon } from '../theme'

function ModeCard({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-card border border-line bg-surface p-6 text-left shadow-card transition duration-fast ease-theme hover:border-line-strong active:scale-[0.98]"
    >
      <p className="font-display text-2xl font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
    </button>
  )
}

/** The landing screen: pick Pass & Play (single device), Party Mode (big screen
 *  + phones) or Host & Join (phones only). */
export function MainMenu({
  onPassPlay,
  onParty,
  onHostJoin,
}: {
  onPassPlay: () => void
  onParty: () => void
  onHostJoin: () => void
}) {
  const lex = useLexicon()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="relative flex min-h-full w-full animate-rise flex-col items-center gap-8 p-6 pt-24">
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
        <h1 className="font-display text-5xl font-bold text-ink">
          <span aria-hidden className="mr-2">
            {lex.app.icon}
          </span>
          {lex.app.name}
        </h1>
        <p className="mt-4 max-w-xs text-sm italic text-muted">{lex.app.tagline}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <ModeCard title={lex.menu.passPlay.title} body={lex.menu.passPlay.body} onClick={onPassPlay} />
        <ModeCard title={lex.menu.party.title} body={lex.menu.party.body} onClick={onParty} />
        <ModeCard title={lex.menu.hostJoin.title} body={lex.menu.hostJoin.body} onClick={onHostJoin} />
      </div>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
