// A static, scannable rules reference, opened mid-game from the top bar or the
// Pause screen. Unlike the guided Tutorial (src/tutorial/), this is a quick
// cheat-sheet that points at the things already on screen — the score track, the
// Approve/Reject buttons, the mission cards. It owns no game state and never
// dispatches: App passes a single onClose. The team-size / spy-count tables are
// rendered from the engine's pure data (TEAM_SIZES, SPY_COUNTS) so they can't
// drift from the real rules. Illustrations are plain styled divs (no live game
// components, no emoji).

import { SPY_COUNTS, TEAM_SIZES } from '../engine'

const PLAYER_COUNTS = [5, 6, 7, 8, 9, 10, 11, 12, 13] as const
const ROUNDS = [1, 2, 3, 4, 5] as const

/** One labeled section card — matches the tutorial CoachMark vocabulary. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/80 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-400">{title}</h2>
      {children}
    </section>
  )
}

/** A small colored chip that mirrors a real button without being one. */
function Chip({ tone, children }: { tone: 'success' | 'fail'; children: React.ReactNode }) {
  const color = tone === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
  return (
    <span className={`rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 ${color}`}>
      {children}
    </span>
  )
}

/** A static mirror of the score track: success / failed / upcoming / current. */
function FauxTrack() {
  const tones = ['bg-emerald-500', 'bg-rose-500', 'bg-slate-700', 'bg-slate-700', 'bg-slate-700']
  return (
    <div className="flex gap-2">
      {tones.map((color, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${color} ${i === 2 ? 'ring-2 ring-slate-400' : ''}`}
        />
      ))}
    </div>
  )
}

export function RulesOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game rules"
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900 text-slate-100"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Rules</h1>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-slate-400 transition hover:text-slate-100"
          >
            Close
          </button>
        </div>

        <Section title="The goal">
          <p className="text-sm leading-relaxed text-slate-300">
            Resistance wins by completing <strong>3 successful missions</strong>. Spies win with{' '}
            <strong>3 failed missions</strong> — or by getting <strong>5 teams rejected in a row</strong>.
            Some players are secretly Spies; everyone else is Resistance.
          </p>
        </Section>

        <Section title="The track (top of the screen)">
          <FauxTrack />
          <p className="text-sm leading-relaxed text-slate-300">
            The five bars across the top are the missions. They fill{' '}
            <span className="font-semibold text-emerald-400">green</span> for a success,{' '}
            <span className="font-semibold text-rose-400">red</span> for a failure, and the outlined one
            is the mission you're on. The <strong>Rejects N / 5</strong> counter beside it tracks teams
            voted down in a row — it turns red at 3, and hitting 5 hands the win to the Spies.
          </p>
        </Section>

        <Section title="Teams & rounds">
          <p className="text-sm leading-relaxed text-slate-300">
            Each round the leader picks who goes on the mission. The number needed grows in later rounds
            and depends on how many are playing. The leader passes to the next player every round — and
            every time a team is voted down — so everyone gets a turn.
          </p>
          <table className="w-full border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="font-medium">Players</th>
                {ROUNDS.map((r) => (
                  <th key={r} className="font-medium">
                    R{r}
                  </th>
                ))}
                <th className="font-medium">Spies</th>
              </tr>
            </thead>
            <tbody>
              {PLAYER_COUNTS.map((n) => (
                <tr key={n}>
                  <td className="rounded bg-slate-800 py-1 font-semibold text-slate-200">{n}</td>
                  {TEAM_SIZES[n]!.map((size, i) => (
                    <td key={i} className="rounded bg-slate-800 py-1 text-slate-300">
                      {size}
                    </td>
                  ))}
                  <td className="rounded bg-slate-800 py-1 font-semibold text-emerald-300">
                    {SPY_COUNTS[n]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400">Challenge mode: +1 player on missions 1 &amp; 2.</p>
        </Section>

        <Section title="Voting">
          <div className="flex gap-2">
            <Chip tone="success">Approve</Chip>
            <Chip tone="fail">Reject</Chip>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Every player votes to approve or reject the proposed team. Votes aren't secret — once
            everyone has voted they're revealed one by one, so you see exactly who approved and who
            rejected. A strict majority sends the team; a tie counts as a rejection and the next player
            becomes leader.
          </p>
        </Section>

        <Section title="Missions">
          <div className="flex gap-2">
            <Chip tone="success">Succeed</Chip>
            <Chip tone="fail">Fail</Chip>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Each team member secretly plays a card. Cards are shuffled before they're shown, so nobody
            knows who played what. Resistance can only <strong>Succeed</strong>; only Spies may{' '}
            <strong>Fail</strong>. A single fail card sinks the mission — except the{' '}
            <strong>4th mission with 7 or more players</strong>, which needs two.
          </p>
        </Section>
      </div>
    </div>
  )
}
