import { useState } from 'react'
import { Button } from '../components/Button'
import { PassPhoneGate } from '../components/PassPhoneGate'
import { mulberry32, shuffle } from '../engine'
import type { MissionCard } from '../engine'
import { CoachMark } from './CoachMark'
import { FauxScoreTrack } from './FauxScoreTrack'
import { BOT_VOTES, CAST, COACH, playerName, SPY_COUNT, TEAM_SIZE, YOU_ID } from './script'

type SceneId =
  | 'intro'
  | 'role'
  | 'proposal'
  | 'vote'
  | 'voteReveal'
  | 'mission'
  | 'missionReveal'
  | 'outro'

const ORDER: SceneId[] = [
  'intro',
  'role',
  'proposal',
  'vote',
  'voteReveal',
  'mission',
  'missionReveal',
  'outro',
]

/**
 * A fully self-contained, scripted walkthrough of one round. It owns its own
 * scene state machine and renders faux versions of each screen from the shared
 * Button / PassPhoneGate primitives. It never imports the engine reducer or
 * useGame, never dispatches, and never writes localStorage — so a real saved
 * game is untouchable and the pure engine stays out of it entirely.
 */
export function Tutorial({ onExit }: { onExit: () => void }) {
  const [scene, setScene] = useState<SceneId>('intro')
  const [selected, setSelected] = useState<number[]>([])
  const [voteNudge, setVoteNudge] = useState(false)

  // The proposed team — the player's pick once it's 2, otherwise a sensible
  // default so downstream scenes still work if a section is skipped.
  const team = selected.length === TEAM_SIZE ? selected : [YOU_ID, 1]
  const youOnTeam = team.includes(YOU_ID)

  const sceneIndex = ORDER.indexOf(scene)
  const hasPrev = sceneIndex > 0
  const hasNext = sceneIndex < ORDER.length - 1

  function goPrev() {
    const prev = ORDER[sceneIndex - 1]
    if (prev) setScene(prev)
  }

  function goNext() {
    const next = ORDER[sceneIndex + 1]
    if (next) setScene(next)
  }

  function replay() {
    setSelected([])
    setVoteNudge(false)
    setScene('intro')
  }

  function toggleSelect(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < TEAM_SIZE ? [...prev, id] : prev,
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900 text-slate-100">
      <button
        onClick={onExit}
        aria-label="Back to main menu"
        className="absolute left-3 top-3 z-10 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:text-slate-100"
      >
        ◂ Back
      </button>
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Previous section"
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-600 disabled:opacity-40"
        >
          ◂
        </button>
        <button
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Next section"
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-600 disabled:opacity-40"
        >
          ▸
        </button>
      </div>
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">{renderScene()}</div>
    </div>
  )

  function renderScene() {
    switch (scene) {
      case 'intro':
        return (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
            <div>
              <h1 className="text-3xl font-bold">🕵️ Spies</h1>
              <p className="mt-1 text-slate-400">
                {CAST.length} players · {SPY_COUNT} spies
              </p>
            </div>
            <ul className="flex flex-wrap justify-center gap-2">
              {CAST.map((p) => (
                <li
                  key={p.id}
                  className={`rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold ${
                    p.id === YOU_ID ? 'text-emerald-300' : 'text-slate-200'
                  }`}
                >
                  {p.name}
                </li>
              ))}
            </ul>
            <CoachMark title={COACH.intro.title} cta={COACH.intro.cta} onCta={() => setScene('role')}>
              {COACH.intro.body}
            </CoachMark>
          </div>
        )

      case 'role':
        return (
          <PassPhoneGate key="role" name="You">
            <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
              <p className="text-sm uppercase tracking-widest text-slate-400">You are</p>
              <h2 className="text-5xl font-extrabold text-emerald-400">RESISTANCE</h2>
              <p className="max-w-xs text-slate-300">Make missions succeed. Find the spies before they win.</p>
              <CoachMark title={COACH.role.title} cta={COACH.role.cta} onCta={() => setScene('proposal')}>
                {COACH.role.body}
              </CoachMark>
            </div>
          </PassPhoneGate>
        )

      case 'proposal':
        return (
          <div className="flex min-h-full flex-col items-center gap-5 pb-6">
            <FauxScoreTrack round={1} results={[]} rejects={0} />
            <div className="text-center">
              <p className="text-sm uppercase tracking-widest text-slate-400">Leader</p>
              <h2 className="text-3xl font-bold">You</h2>
              <p className="mt-1 text-slate-400">
                Pick {TEAM_SIZE} for the mission ({selected.length}/{TEAM_SIZE})
              </p>
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3 px-6">
              {CAST.map((p) => {
                const on = selected.includes(p.id)
                const isLeader = p.id === YOU_ID
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={`rounded-xl border-2 px-4 py-4 text-lg font-semibold transition active:scale-95 ${
                      on
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-700 bg-slate-800 text-slate-200'
                    } ${isLeader ? 'ring-1 ring-slate-500' : ''}`}
                  >
                    {p.name}
                    {isLeader && <span className="ml-1 text-xs text-slate-400">★</span>}
                  </button>
                )
              })}
            </div>
            <div className="px-6">
              <CoachMark
                title={COACH.proposal.title}
                cta={COACH.proposal.cta}
                ctaDisabled={selected.length !== TEAM_SIZE}
                onCta={() => setScene('vote')}
              >
                {COACH.proposal.body}
              </CoachMark>
            </div>
          </div>
        )

      case 'vote': {
        // Voting is public — no handoff gate — to make clear votes aren't secret.
        const names = team.map((id) => playerName(id))
        return (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-400">Proposed team</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">{names.join(', ')}</p>
            </div>
            <p className="text-slate-300">Send this team on the mission?</p>
            <div className="flex w-full max-w-sm gap-3">
              <Button className="flex-1" onClick={() => setScene('voteReveal')}>
                Approve
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => setVoteNudge(true)}>
                Reject
              </Button>
            </div>
            {voteNudge && (
              <p className="text-xs text-rose-300">
                In a real game you could reject — but tap Approve to send this team and keep learning.
              </p>
            )}
            <CoachMark title={COACH.vote.title}>{COACH.vote.body}</CoachMark>
          </div>
        )
      }

      case 'voteReveal': {
        // Hard-coded outcome: You + 3 bots approve, 1 bot rejects → APPROVED.
        const votes = CAST.map((p) => ({
          name: p.name,
          vote: p.id === YOU_ID ? ('approve' as const) : BOT_VOTES[p.id],
        }))
        const approve = votes.filter((v) => v.vote === 'approve').length
        const reject = votes.length - approve
        return (
          <div className="flex min-h-full flex-col items-center gap-5 p-6">
            <h2 className="text-2xl font-bold">The vote</h2>
            <ul className="flex w-full max-w-sm flex-col gap-2">
              {votes.map((v) => (
                <li
                  key={v.name}
                  className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
                >
                  <span className="font-semibold">{v.name}</span>
                  <span className={v.vote === 'approve' ? 'text-emerald-400' : 'text-rose-400'}>
                    {v.vote === 'approve' ? '✔ Approve' : '✘ Reject'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-3xl font-extrabold text-emerald-400">APPROVED</p>
            <p className="text-slate-400">
              {approve} approve · {reject} reject
            </p>
            <CoachMark
              title={COACH.voteReveal.title}
              cta={COACH.voteReveal.cta}
              onCta={() => setScene('mission')}
            >
              {COACH.voteReveal.body}
            </CoachMark>
          </div>
        )
      }

      case 'mission':
        // Mission cards ARE secret, so this stays behind a handoff — but only if
        // you're actually on the team. Otherwise your teammates play in private.
        return youOnTeam ? (
          <PassPhoneGate key="mission" name="You">
            <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
              <p className="text-slate-300">Play your mission card.</p>
              <div className="flex w-full max-w-sm flex-col gap-3">
                <Button onClick={() => setScene('missionReveal')}>Succeed</Button>
                <Button variant="danger" disabled>
                  Fail (sabotage)
                </Button>
                <p className="text-xs text-slate-500">
                  Resistance can only succeed — make this mission count.
                </p>
              </div>
              <CoachMark title={COACH.mission.title}>{COACH.mission.body}</CoachMark>
            </div>
          </PassPhoneGate>
        ) : (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
            <p className="text-slate-300">
              You sent {team.map((id) => playerName(id)).join(' and ')} — you’re not on this mission, so
              they play their cards in secret.
            </p>
            <Button onClick={() => setScene('missionReveal')}>See the result</Button>
            <CoachMark title={COACH.mission.title}>{COACH.mission.body}</CoachMark>
          </div>
        )

      case 'missionReveal': {
        // Both team members succeeded. Shuffle for anonymity (cosmetic here since
        // both are ✔) to mirror the real reveal's mechanism.
        const cards: MissionCard[] = ['success', 'success']
        const display = shuffle(cards, mulberry32(7))
        return (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
            <h2 className="text-2xl font-bold">Mission 1</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {display.map((card, i) => (
                <div
                  key={i}
                  className="flex h-20 w-14 items-center justify-center rounded-lg bg-emerald-500 text-2xl font-bold text-slate-900"
                >
                  {card === 'success' ? '✔' : '✘'}
                </div>
              ))}
            </div>
            <p className="text-3xl font-extrabold text-emerald-400">MISSION SUCCEEDED</p>
            <p className="text-slate-400">0 fail cards</p>
            <CoachMark
              title={COACH.missionReveal.title}
              cta={COACH.missionReveal.cta}
              onCta={() => setScene('outro')}
            >
              {COACH.missionReveal.body}
            </CoachMark>
          </div>
        )
      }

      case 'outro':
        return (
          <div className="flex min-h-full flex-col items-center gap-5 pb-6">
            <FauxScoreTrack round={2} results={['success']} rejects={0} />
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
              <p className="text-2xl font-bold text-emerald-400">1 / 3 missions complete</p>
              <CoachMark title={COACH.outro.title} cta={COACH.outro.cta} onCta={onExit}>
                {COACH.outro.body}
              </CoachMark>
              <Button variant="neutral" className="w-full max-w-sm" onClick={replay}>
                Replay tutorial
              </Button>
            </div>
          </div>
        )
    }
  }
}
