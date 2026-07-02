import { Button } from '../components/Button'
import { failsToFail, mulberry32, shuffle } from '../engine'
import type { MissionCard } from '../engine'
import { useGame } from '../state/GameContext'
import { fmt, useLexicon } from '../theme'

/** Public screen: mission cards revealed anonymously (shuffled), then the outcome. */
export function MissionReveal() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()
  const lastMission = state.lastMission
  if (!lastMission) return null

  const total = lastMission.team.length
  const cards: MissionCard[] = [
    ...Array<MissionCard>(lastMission.failCount).fill('fail'),
    ...Array<MissionCard>(total - lastMission.failCount).fill('success'),
  ]
  // Shuffle for anonymity — order must never reveal who played what. Seeded off
  // the round + fail count so the layout is stable across re-renders.
  const display = shuffle(cards, mulberry32(lastMission.round * 31 + lastMission.failCount + 1))

  const needed = failsToFail(state.players.length, lastMission.round)
  const failsLine =
    lastMission.failCount === 1
      ? lex.missionReveal.failsOne
      : fmt(lex.missionReveal.failsMany, { count: lastMission.failCount })

  return (
    <div className="flex min-h-full animate-rise flex-col items-center justify-center gap-6 p-6 text-center">
      <h2 className="font-display text-3xl font-bold text-ink">
        {fmt(lex.missionReveal.title, { round: lastMission.round })}
      </h2>

      <div className="flex flex-wrap justify-center gap-3">
        {display.map((card, i) => (
          <div
            key={i}
            className={`flex h-20 w-14 animate-pop items-center justify-center rounded-field text-2xl font-bold ${
              card === 'fail'
                ? 'bg-danger text-danger-ink shadow-glow-danger'
                : 'bg-accent text-accent-ink shadow-glow-accent'
            }`}
            style={{ animationDelay: `calc(${i} * var(--m-fast))` }}
          >
            {card === 'fail' ? '✘' : '✔'}
          </div>
        ))}
      </div>

      <p
        className={`animate-pop font-display text-4xl font-extrabold uppercase ${
          lastMission.success ? 'text-accent' : 'text-danger'
        }`}
      >
        {lastMission.success ? lex.missionReveal.success : lex.missionReveal.failure}
      </p>
      <p className="font-mono text-xs uppercase tracking-label text-faint">
        {failsLine}
        {needed > 1 && ` · ${fmt(lex.missionReveal.neededNote, { needed })}`}
      </p>

      <Button className="w-full max-w-sm" onClick={() => dispatch({ type: 'CONFIRM_MISSION' })}>
        {lex.missionReveal.continue}
      </Button>
    </div>
  )
}
