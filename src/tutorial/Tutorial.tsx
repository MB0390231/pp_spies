import { useState } from 'react'
import { Button } from '../components/Button'
import { PassPhoneGate } from '../components/PassPhoneGate'
import { mulberry32, shuffle } from '../engine'
import type { MissionCard } from '../engine'
import { fmt, useLexicon } from '../theme'
import { CoachMark } from './CoachMark'
import { FauxScoreTrack } from './FauxScoreTrack'
import { CAST_ROLES, SPY_COUNT, TEAM_SIZE, YOU_ID } from './script'

type SceneId =
  | 'intro'
  | 'role'
  | 'proposal'
  | 'proposalVote'
  | 'mission'
  | 'missionReveal'
  | 'outro'

const ORDER: SceneId[] = [
  'intro',
  'role',
  'proposal',
  'proposalVote',
  'mission',
  'missionReveal',
  'outro',
]

/**
 * A fully self-contained, scripted walkthrough of one round. It owns its own
 * scene state machine and renders faux versions of each screen from the shared
 * Button / PassPhoneGate primitives. It never imports the engine reducer or
 * useGame, never dispatches, and never writes localStorage — so a real saved
 * game is untouchable and the pure engine stays out of it entirely. Copy and
 * cast names come from the theme lexicon (lexicon.tutorial).
 */
export function Tutorial({ onExit }: { onExit: () => void }) {
  const lex = useLexicon()
  const [scene, setScene] = useState<SceneId>('intro')
  const [selected, setSelected] = useState<number[]>([])
  const [voteNudge, setVoteNudge] = useState(false)

  const coach = lex.tutorial.coach
  // Seat 0 is the learner; the four bot names come from the active theme.
  const cast = CAST_ROLES.map((role, id) => ({
    id,
    role,
    name: id === YOU_ID ? lex.tutorial.you : lex.tutorial.botNames[id - 1]!,
  }))
  const playerName = (id: number) => cast.find((p) => p.id === id)?.name ?? ''

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
    <div className="bg-backdrop fixed inset-0 z-50 animate-fade overflow-y-auto text-ink">
      <button
        type="button"
        onClick={onExit}
        aria-label={lex.tutorial.back}
        className="absolute left-3 top-3 z-10 rounded-control px-3 py-2 font-mono text-xs uppercase tracking-label text-muted transition duration-fast ease-theme hover:text-ink"
      >
        ◂ {lex.tutorial.back}
      </button>
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label={lex.tutorial.prev}
          className="rounded-control border border-line bg-raised px-3 py-2 text-sm text-ink transition duration-fast ease-theme hover:border-line-strong disabled:opacity-40"
        >
          ◂
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!hasNext}
          aria-label={lex.tutorial.next}
          className="rounded-control border border-line bg-raised px-3 py-2 text-sm text-ink transition duration-fast ease-theme hover:border-line-strong disabled:opacity-40"
        >
          ▸
        </button>
      </div>
      {/* pt-14 clears the fixed Back / prev / next controls above. */}
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col pt-14">{renderScene()}</div>
    </div>
  )

  function renderScene() {
    switch (scene) {
      case 'intro':
        return (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
            <div>
              <h1 className="font-display text-4xl font-bold text-ink">
                <span aria-hidden className="mr-2">
                  {lex.app.icon}
                </span>
                {lex.app.name}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {fmt(lex.setup.summary, { players: cast.length, spies: SPY_COUNT })}
              </p>
            </div>
            <ul className="flex flex-wrap justify-center gap-2">
              {cast.map((p) => (
                <li
                  key={p.id}
                  className={`rounded-chip border px-3 py-2 text-sm font-semibold ${
                    p.id === YOU_ID
                      ? 'border-accent/60 bg-accent/10 text-accent'
                      : 'border-line bg-surface text-ink'
                  }`}
                >
                  {p.name}
                </li>
              ))}
            </ul>
            <CoachMark title={coach.intro.title} cta={coach.intro.cta} onCta={() => setScene('role')}>
              {coach.intro.body}
            </CoachMark>
          </div>
        )

      case 'role':
        return (
          <PassPhoneGate key="role" name={lex.tutorial.you}>
            <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
              <p className="font-mono text-sm uppercase tracking-label text-faint">
                {lex.roleReveal.eyebrow}
              </p>
              <h2 className="font-display text-5xl font-extrabold uppercase text-accent">
                {lex.roleReveal.goodTitle}
              </h2>
              <p className="max-w-xs leading-relaxed text-muted">{lex.roleReveal.goodBody}</p>
              <CoachMark title={coach.role.title} cta={coach.role.cta} onCta={() => setScene('proposal')}>
                {coach.role.body}
              </CoachMark>
            </div>
          </PassPhoneGate>
        )

      case 'proposal':
        return (
          <div className="flex min-h-full flex-col items-center gap-5 pb-6">
            <FauxScoreTrack round={1} results={[]} rejects={0} />
            <div className="text-center">
              <p className="font-mono text-sm uppercase tracking-label text-faint">
                {lex.proposal.eyebrow}
              </p>
              <h2 className="font-display text-3xl font-bold text-ink">{lex.tutorial.you}</h2>
              <p className="mt-2 text-muted">
                {fmt(lex.proposal.instruction, { count: TEAM_SIZE })}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-label text-faint">
                {fmt(lex.proposal.counter, { selected: selected.length, count: TEAM_SIZE })}
              </p>
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3 px-6">
              {cast.map((p) => {
                const on = selected.includes(p.id)
                const isLeader = p.id === YOU_ID
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSelect(p.id)}
                    className={`relative rounded-field border-2 px-4 py-4 text-lg font-semibold transition duration-fast ease-theme active:scale-[0.97] ${
                      on
                        ? 'border-accent bg-accent/15 text-accent shadow-glow-accent'
                        : 'border-line bg-surface text-ink hover:border-line-strong'
                    }`}
                  >
                    {p.name}
                    {isLeader && (
                      <span className="absolute -top-2 right-2 rounded-chip border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-muted">
                        {lex.proposal.leaderBadge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="px-6">
              <CoachMark
                title={coach.proposal.title}
                cta={coach.proposal.cta}
                ctaDisabled={selected.length !== TEAM_SIZE}
                onCta={() => setScene('proposalVote')}
              >
                {coach.proposal.body}
              </CoachMark>
            </div>
          </div>
        )

      case 'proposalVote': {
        // One public scene mirrors the real ProposalVote screen: the table votes
        // out loud (show of hands) and one person records the outcome — the
        // phone is never passed around for voting. "Passed" advances to the
        // mission; "Failed" just nudges, since this scripted round must go on.
        const names = team.map((id) => playerName(id))
        return (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
            <h2 className="font-display text-3xl font-bold text-ink">{lex.proposalVote.title}</h2>
            <div className="w-full max-w-sm rounded-card border border-line bg-surface/80 p-5 shadow-card">
              <p className="font-mono text-xs uppercase tracking-label text-faint">
                {lex.proposalVote.teamLabel}
              </p>
              <p className="mt-2 text-xl font-semibold text-ink">{names.join(', ')}</p>
            </div>
            <p className="max-w-sm text-muted">{lex.proposalVote.instruction}</p>
            <div className="flex w-full max-w-sm flex-col gap-3">
              <Button onClick={() => setScene('mission')}>{lex.proposalVote.passed}</Button>
              <Button variant="danger" onClick={() => setVoteNudge(true)}>
                {lex.proposalVote.failed}
              </Button>
            </div>
            {voteNudge && <p className="max-w-sm text-xs text-danger">{lex.tutorial.voteNudge}</p>}
            <CoachMark title={coach.proposalVote.title}>{coach.proposalVote.body}</CoachMark>
          </div>
        )
      }

      case 'mission':
        // Mission cards ARE secret, so this stays behind a handoff — but only if
        // you're actually on the team. Otherwise your teammates play in private.
        return youOnTeam ? (
          <PassPhoneGate key="mission" name={lex.tutorial.you}>
            <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
              <p className="text-lg text-muted">{lex.mission.prompt}</p>
              <div className="flex w-full max-w-sm flex-col gap-3">
                <Button onClick={() => setScene('missionReveal')}>{lex.mission.succeed}</Button>
                <Button variant="danger" disabled>
                  {lex.mission.fail}
                </Button>
                <p className="text-xs leading-relaxed text-faint">{lex.mission.lockedHint}</p>
              </div>
              <CoachMark title={coach.mission.title}>{coach.mission.body}</CoachMark>
            </div>
          </PassPhoneGate>
        ) : (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
            <p className="max-w-sm leading-relaxed text-muted">
              {fmt(lex.tutorial.notOnTeam, { a: playerName(team[0]!), b: playerName(team[1]!) })}
            </p>
            <Button onClick={() => setScene('missionReveal')}>{lex.tutorial.seeResult}</Button>
            <CoachMark title={coach.mission.title}>{coach.mission.body}</CoachMark>
          </div>
        )

      case 'missionReveal': {
        // Both team members succeeded. Shuffle for anonymity (cosmetic here since
        // both are ✔) to mirror the real reveal's mechanism.
        const cards: MissionCard[] = ['success', 'success']
        const display = shuffle(cards, mulberry32(7))
        return (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
            <h2 className="font-display text-3xl font-bold text-ink">
              {fmt(lex.missionReveal.title, { round: 1 })}
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {display.map((card, i) => (
                <div
                  key={i}
                  className="flex h-20 w-14 items-center justify-center rounded-field bg-accent text-2xl font-bold text-accent-ink shadow-glow-accent"
                >
                  {card === 'success' ? '✔' : '✘'}
                </div>
              ))}
            </div>
            <p className="font-display text-4xl font-extrabold uppercase text-accent">
              {lex.missionReveal.success}
            </p>
            <p className="font-mono text-xs uppercase tracking-label text-faint">
              {fmt(lex.missionReveal.failsMany, { count: 0 })}
            </p>
            <CoachMark
              title={coach.missionReveal.title}
              cta={coach.missionReveal.cta}
              onCta={() => setScene('outro')}
            >
              {coach.missionReveal.body}
            </CoachMark>
          </div>
        )
      }

      case 'outro':
        return (
          <div className="flex min-h-full flex-col items-center gap-5 pb-6">
            <FauxScoreTrack round={2} results={['success']} rejects={0} />
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
              <p className="font-display text-2xl font-bold text-accent">
                {lex.tutorial.outroProgress}
              </p>
              <CoachMark title={coach.outro.title} cta={coach.outro.cta} onCta={onExit}>
                {coach.outro.body}
              </CoachMark>
              <Button variant="neutral" className="w-full max-w-sm" onClick={replay}>
                {lex.tutorial.replay}
              </Button>
            </div>
          </div>
        )
    }
  }
}
