import { Button } from '../components/Button'
import { useGame } from '../state/GameContext'

/** Public screen: announce the winner, reveal all roles, offer a rematch. */
export function GameOver() {
  const { state, dispatch } = useGame()
  const resistanceWon = state.winner === 'resistance'

  return (
    <div className="flex min-h-full flex-col items-center gap-6 p-6 text-center">
      <p className="text-sm uppercase tracking-widest text-slate-400">Game over</p>
      <h2 className={`text-4xl font-extrabold ${resistanceWon ? 'text-emerald-400' : 'text-rose-400'}`}>
        {resistanceWon ? 'Resistance wins!' : 'Spies win!'}
      </h2>
      <p className="text-slate-400">
        {state.successes} success{state.successes === 1 ? '' : 'es'} · {state.fails} fail
        {state.fails === 1 ? '' : 's'}
      </p>

      <div className="w-full max-w-sm">
        <p className="mb-2 text-sm uppercase tracking-widest text-slate-500">The roles were</p>
        <ul className="flex flex-col gap-2">
          {state.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
            >
              <span className="font-semibold">{p.name}</span>
              <span className={p.role === 'spy' ? 'text-rose-400' : 'text-emerald-400'}>
                {p.role === 'spy' ? 'Spy' : 'Resistance'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button onClick={() => dispatch({ type: 'RESET' })} className="w-full max-w-sm">
        Play again
      </Button>
    </div>
  )
}
