import { useState } from 'react'
import { Button } from '../components/Button'
import { currentLeaderId, currentTeamSize } from '../engine'
import { useGame } from '../state/GameContext'
import { fmt, useLexicon } from '../theme'

/** Public screen: the leader selects exactly the required players for the mission. */
export function TeamProposal() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()
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
    <div className="flex min-h-full animate-rise flex-col items-center gap-5 p-6">
      <div className="text-center">
        <p className="font-mono text-sm uppercase tracking-label text-faint">
          {lex.proposal.eyebrow}
        </p>
        <h2 className="font-display text-3xl font-bold text-ink">{leader?.name}</h2>
        <p className="mt-2 text-muted">{fmt(lex.proposal.instruction, { count: required })}</p>
        <p className="mt-1 font-mono text-xs uppercase tracking-label text-faint">
          {fmt(lex.proposal.counter, { selected: selected.length, count: required })}
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {state.players.map((p) => {
          const on = selected.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={`relative rounded-field border-2 px-4 py-4 text-lg font-semibold transition duration-fast ease-theme active:scale-[0.97] ${
                on
                  ? 'border-accent bg-accent/15 text-accent shadow-glow-accent'
                  : 'border-line bg-surface text-ink hover:border-line-strong'
              }`}
            >
              {p.name}
              {p.id === leaderId && (
                <span className="absolute -top-2 right-2 rounded-chip border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-muted">
                  {lex.proposal.leaderBadge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Button
        onClick={propose}
        disabled={selected.length !== required}
        className="mt-auto w-full max-w-sm"
      >
        {lex.proposal.cta}
      </Button>
    </div>
  )
}
