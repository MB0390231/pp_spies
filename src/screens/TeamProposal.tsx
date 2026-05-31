import { useState } from 'react'
import { Button } from '../components/Button'
import { currentLeaderId, currentTeamSize } from '../engine'
import { useGame } from '../state/GameContext'

/** Public screen: the leader selects exactly the required players for the mission. */
export function TeamProposal() {
  const { state, dispatch } = useGame()
  const [selected, setSelected] = useState<number[]>([])

  const leaderId = currentLeaderId(state)
  const leader = state.players.find((p) => p.id === leaderId)
  const required = currentTeamSize(state)

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < required
          ? [...prev, id]
          : prev,
    )
  }

  function propose() {
    dispatch({ type: 'PROPOSE_TEAM', team: selected })
    setSelected([])
  }

  return (
    <div className="flex min-h-full flex-col items-center gap-5 p-6">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-slate-400">Leader</p>
        <h2 className="text-3xl font-bold">{leader?.name}</h2>
        <p className="mt-1 text-slate-400">
          Pick {required} for the mission ({selected.length}/{required})
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {state.players.map((p) => {
          const on = selected.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`rounded-xl border-2 px-4 py-4 text-lg font-semibold transition active:scale-95 ${
                on
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-200'
              } ${p.id === leaderId ? 'ring-1 ring-slate-500' : ''}`}
            >
              {p.name}
              {p.id === leaderId && <span className="ml-1 text-xs text-slate-400">★</span>}
            </button>
          )
        })}
      </div>

      <Button
        onClick={propose}
        disabled={selected.length !== required}
        className="w-full max-w-sm"
      >
        Propose team
      </Button>
    </div>
  )
}
