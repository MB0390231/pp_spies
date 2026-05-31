import { Button } from '../components/Button'
import { failsToFail, mulberry32, shuffle } from '../engine'
import type { MissionCard } from '../engine'
import { useGame } from '../state/GameContext'

/** Public screen: mission cards revealed anonymously (shuffled), then the outcome. */
export function MissionReveal() {
  const { state, dispatch } = useGame()
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

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <h2 className="text-2xl font-bold">Mission {lastMission.round}</h2>

      <div className="flex flex-wrap justify-center gap-3">
        {display.map((card, i) => (
          <div
            key={i}
            className={`flex h-20 w-14 items-center justify-center rounded-lg text-2xl font-bold ${
              card === 'fail'
                ? 'bg-rose-500 text-slate-900'
                : 'bg-emerald-500 text-slate-900'
            }`}
          >
            {card === 'fail' ? '✘' : '✔'}
          </div>
        ))}
      </div>

      <p
        className={`text-3xl font-extrabold ${lastMission.success ? 'text-emerald-400' : 'text-rose-400'}`}
      >
        {lastMission.success ? 'MISSION SUCCEEDED' : 'MISSION FAILED'}
      </p>
      <p className="text-slate-400">
        {lastMission.failCount} fail card{lastMission.failCount === 1 ? '' : 's'}
        {needed > 1 && ` · needed ${needed} to fail this round`}
      </p>

      <Button onClick={() => dispatch({ type: 'CONFIRM_MISSION' })}>Continue</Button>
    </div>
  )
}
