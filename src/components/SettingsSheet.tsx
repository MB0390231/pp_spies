// The Settings bottom sheet, opened from the gear on Setup. Hosts the theme
// picker (scales to N registered themes) and the Hard-mode toggle. Both values
// live in ThemeContext and persist to `spies:settings` — never the game blob.
// Theme previews are painted with inline styles from each theme's own tokens
// (not the active CSS variables), so every card shows its true colors.

import { useLexicon, useTheme } from '../theme'
import type { Theme } from '../theme'
import { Button } from './Button'

function ThemeCard({
  theme,
  active,
  onSelect,
}: {
  theme: Theme
  active: boolean
  onSelect: () => void
}) {
  const c = theme.tokens.colors
  const rgb = (triple: string) => `rgb(${triple})`
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full items-center gap-4 rounded-field border-2 p-3 text-left transition duration-fast ease-theme active:scale-[0.98] ${
        active ? 'border-accent bg-accent/10' : 'border-line bg-raised hover:border-line-strong'
      }`}
    >
      {/* Miniature of the theme: bg swatch with its two faction colors. */}
      <span
        aria-hidden
        className="flex h-14 w-14 shrink-0 flex-col justify-between rounded-chip border p-2"
        style={{
          backgroundColor: rgb(c.bg),
          backgroundImage: theme.tokens.decor.backdrop,
          borderColor: rgb(c.line),
        }}
      >
        <span className="block h-1.5 w-8 rounded-full" style={{ backgroundColor: rgb(c.ink) }} />
        <span className="flex gap-1">
          <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: rgb(c.accent) }} />
          <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: rgb(c.danger) }} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{theme.name}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{theme.blurb}</span>
      </span>
      <span
        aria-hidden
        className={`h-5 w-5 shrink-0 rounded-full border-2 transition duration-fast ease-theme ${
          active ? 'border-accent bg-accent' : 'border-line-strong'
        }`}
      />
    </button>
  )
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const lex = useLexicon()
  const { themes, themeId, setThemeId, hardMode, setHardMode } = useTheme()

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      {/* Scrim — tap to dismiss. */}
      <button
        type="button"
        aria-label={lex.settings.done}
        onClick={onClose}
        className="absolute inset-0 animate-fade cursor-default bg-bg/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lex.settings.title}
        className="relative w-full max-w-md animate-sheet-up rounded-t-card border border-b-0 border-line bg-surface p-6 pb-8 shadow-pop"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line-strong" aria-hidden />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-ink">{lex.settings.title}</h2>
          <Button variant="ghost" className="!px-3 !py-2 !text-sm" onClick={onClose}>
            {lex.settings.done}
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-label text-faint">
              {lex.settings.themeLabel}
            </h3>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {themes.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  active={t.id === themeId}
                  onSelect={() => setThemeId(t.id)}
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4 rounded-field border border-line bg-raised p-4">
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink">{lex.settings.hardModeLabel}</span>
                <span className="mt-0.5 text-sm leading-snug text-muted">
                  {lex.settings.hardModeBody}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={hardMode}
                aria-label={lex.settings.hardModeLabel}
                onClick={() => setHardMode(!hardMode)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition duration-base ease-theme ${
                  hardMode ? 'bg-accent' : 'bg-line'
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute top-1 h-6 w-6 rounded-full bg-ink shadow-card transition-all duration-base ease-spring ${
                    hardMode ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
            <p className="px-1 text-xs text-faint">{lex.settings.hardModeNote}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
