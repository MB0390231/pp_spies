// A static, scannable rules reference, opened mid-game from the top bar or the
// Pause screen. Unlike the guided Tutorial (src/tutorial/), this is a quick
// cheat-sheet that points at the things already on screen — the score track, the
// Approve/Reject buttons, the mission cards. It owns no game state and never
// dispatches: App passes a single onClose. The team-size / spy-count tables are
// rendered from the engine's pure data (TEAM_SIZES, SPY_COUNTS) so they can't
// drift from the real rules. All copy comes from the theme lexicon; section
// bodies support **bold** spans.

import { SPY_COUNTS, TEAM_SIZES } from '../engine'
import { fmt, useLexicon } from '../theme'

const PLAYER_COUNTS = [5, 6, 7, 8, 9, 10, 11, 12, 13] as const
const ROUNDS = [1, 2, 3, 4, 5] as const

/** Renders a lexicon body string, turning `**bold**` spans into <strong>. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <p className="text-sm leading-relaxed text-muted">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-ink">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </p>
  )
}

/** One labeled section card — matches the tutorial CoachMark vocabulary. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface/80 p-4 shadow-card">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-label text-accent">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** A small colored chip that mirrors a real button without being one. */
function Chip({ tone, children }: { tone: 'success' | 'fail'; children: React.ReactNode }) {
  const color = tone === 'success' ? 'bg-accent text-accent-ink' : 'bg-danger text-danger-ink'
  return (
    <span className={`rounded-chip px-4 py-2 text-sm font-semibold ${color}`}>{children}</span>
  )
}

/** A static mirror of the score track: success / failed / upcoming / current. */
function FauxTrack() {
  const tones = ['bg-accent', 'bg-danger', 'bg-raised', 'bg-raised', 'bg-raised']
  return (
    <div className="flex gap-2">
      {tones.map((color, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${color} ${i === 2 ? 'ring-2 ring-line-strong' : ''}`}
        />
      ))}
    </div>
  )
}

export function RulesOverlay({ onClose }: { onClose: () => void }) {
  const lex = useLexicon()
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lex.rules.title}
      className="bg-backdrop fixed inset-0 z-[60] animate-fade overflow-y-auto text-ink"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">{lex.rules.title}</h1>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-3 py-2 font-mono text-xs uppercase tracking-label text-muted transition duration-fast ease-theme hover:text-ink"
          >
            {lex.rules.close}
          </button>
        </div>

        <Section title={lex.rules.goal.title}>
          <Rich text={lex.rules.goal.body} />
        </Section>

        <Section title={lex.rules.track.title}>
          <FauxTrack />
          <Rich text={lex.rules.track.body} />
        </Section>

        <Section title={lex.rules.teams.title}>
          <Rich text={lex.rules.teams.body} />
          <table className="w-full border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr className="font-mono text-faint">
                <th className="font-medium">{lex.rules.playersCol}</th>
                {ROUNDS.map((r) => (
                  <th key={r} className="font-medium">
                    {fmt(lex.rules.roundCol, { n: r })}
                  </th>
                ))}
                <th className="font-medium">{lex.rules.spiesCol}</th>
              </tr>
            </thead>
            <tbody>
              {PLAYER_COUNTS.map((n) => (
                <tr key={n}>
                  <td className="rounded-chip bg-raised py-1 font-semibold text-ink">{n}</td>
                  {TEAM_SIZES[n]!.map((size, i) => (
                    <td key={i} className="rounded-chip bg-raised py-1 text-muted">
                      {size}
                    </td>
                  ))}
                  <td className="rounded-chip bg-raised py-1 font-semibold text-accent">
                    {SPY_COUNTS[n]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-faint">{lex.rules.hardModeNote}</p>
        </Section>

        <Section title={lex.rules.voting.title}>
          <div className="flex gap-2">
            <Chip tone="success">{lex.rules.chips.approve}</Chip>
            <Chip tone="fail">{lex.rules.chips.reject}</Chip>
          </div>
          <Rich text={lex.rules.voting.body} />
        </Section>

        <Section title={lex.rules.missions.title}>
          <div className="flex gap-2">
            <Chip tone="success">{lex.rules.chips.succeed}</Chip>
            <Chip tone="fail">{lex.rules.chips.fail}</Chip>
          </div>
          <Rich text={lex.rules.missions.body} />
        </Section>
      </div>
    </div>
  )
}
