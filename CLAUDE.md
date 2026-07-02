# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Phase 1 MVP is **playable end-to-end**. The pure engine (`src/engine/`, 89 passing tests), the `localStorage`-backed context (`src/state/`), all seven phase screens (`src/screens/`), shared components (`src/components/` — `PassPhoneGate`, `Button`, `ScoreTrack`), and the phase-router `App.tsx` are built. `npm run dev`, `build`, `type-check`, and `test` all pass. Remaining work is Phase 2/3 polish from the README roadmap (animations, tutorial, a11y, PWA, stats, house rules).

## What this is

**Spies — Pass & Play**: a single-device, pass-and-play hidden-role social deduction game (a *Resistance* clone). One phone is shared around 5–10 players. It is a **client-only SPA with no backend, no database, and no network calls** after load — secrecy comes from pass-the-phone handoff screens, not from the network.

## Stack & commands

React + TypeScript + Vite + Tailwind, persisted to `localStorage`. Test runner is Vitest (Vite-native).

```bash
npm install
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # tsc --noEmit && vite build → dist/
npm run preview      # serve the production build

npm run lint         # ESLint (flat config)
npm run type-check   # tsc --noEmit
npm test             # Vitest, run once
npm run test:watch   # Vitest watch mode
```

Run a single test file or name: `npx vitest run src/engine/rules.test.ts` or `npx vitest run -t "Round 4"`.

## Architecture

The core idea: the game rules are a body of **pure, deterministic functions** made trustworthy by tests rather than a server. Two layers must stay separated:

- **`src/engine/`** — the heart of the app. Framework-agnostic pure functions, **no React imports**. `(state, action) → nextState`. This is `rules.ts` (spy counts, team sizes, win conditions, the Round-4 rule), `reducer.ts` (the reducer), `types.ts` (Game/Player/Round/Phase types), and `random.ts` (seeded PRNG + shuffle). `index.ts` is the barrel. Keep this importable and unit-testable in isolation; this is where the most valuable tests live.
  - **Randomness stays out of the reducer.** The reducer never calls `Math.random()` — it would break determinism. Randomness enters *only* via the `seed` on the `SETUP` action (used for role assignment and first-leader choice). Generate the seed at the call site (`Date.now()` in `App.tsx`) and pass it in. This is what makes the whole engine replayable and testable.
  - **The reducer is a strict state machine.** Each action is a no-op unless `state.phase` matches. The proposal outcome is a single public step: after `PROPOSE_TEAM`, one `RESOLVE_PROPOSAL` (`{ approved }`) records the table's show-of-hands vote and either starts the mission (approved) or rotates the leader (rejected; 5 consecutive rejects = Spies win). The mission flow is two-step: `PLAY_CARD` accumulates private cards and auto-transitions to `missionReveal` once everyone has acted; a follow-up `CONFIRM_MISSION` applies the outcome and advances. Resistance fail cards are coerced to success inside `PLAY_CARD`.
- **`src/state/`** — React context/provider wrapping the reducer + `localStorage` persistence. Persist the full game state after **every** action so a refresh or screen-lock resumes mid-game.
- **`src/screens/`** — one component per game phase (Setup, RoleReveal, TeamProposal, ProposalVote, Mission, MissionReveal, GameOver). Screens are dumb: they read `state` and `dispatch` actions; the engine owns all transitions. `App.tsx` maps `state.phase → screen`.
  - **Per-player private screens derive "whose turn" from state, not local counters.** Mission finds the next actor as the first player not yet in `state.missionCards`, and remounts `PassPhoneGate` with `key={player.id}` so the handoff resets between players. RoleReveal is the exception — roles aren't stored per-action, so it keeps a local `index`. ProposalVote is public (no handoff): one person taps Passed/Failed, dispatching a single `RESOLVE_PROPOSAL`.
- **`src/components/`** — shared UI: `PassPhoneGate` (the secrecy primitive — never renders children until the named player taps), `Button`, `ScoreTrack`.

### Two invariants that are easy to get wrong

1. **Handoff gating for secrecy.** Every private view (role reveal, mission card play) must render *behind* a `PassPhoneGate` — a "Pass the phone to [name]" screen that the named player taps to confirm. Nothing private should render until that confirmation. Public moments (team proposal, the proposal vote, mission outcome, game over) are shown openly.
2. **Anonymous reveals.** Mission cards must be **shuffled before display** so reveal order never leaks who played what.

## Game rules (the spec to encode in `engine/`)

These exact numbers are the source of truth — get them into `rules.ts` and cover them with tests.

**Spy count by player count:** 5→2, 6→2, 7→3, 8→3, 9→3, 10→4.

**Team size by round** (rows = player count, cols = R1–R5):
- 5: 2,3,2,3,3
- 6: 2,3,4,3,4
- 7: 2,3,3,4,4
- 8: 3,4,4,5,5
- 9: 3,4,4,5,5
- 10: 3,4,4,5,5

**Round-4 special rule:** with **7+ players**, mission R4 requires **2 fail cards** to fail (all other missions need just 1).

**Win conditions:**
- Resistance wins after **3 successful missions**.
- Spies win after **3 failed missions**, *or* after **5 consecutive rejected team proposals**.

**Round flow:** Team Proposal (public) → Proposal Vote (public: the table votes out loud by show of hands and one person taps Passed/Failed; passed proceeds, failed rotates leader, 5 consecutive rejects = Spies win) → Mission (private per team member → shuffled public reveal; Resistance is locked to Succeed, Spies may Fail).

**State machine:** SETUP → ROLE REVEAL → loop[ TEAM PROPOSAL → PROPOSAL VOTE → (passed → MISSION → check win) | (failed → rotate leader) ] → GAME OVER.

## Build order (from the README roadmap)

Phase 1 MVP, in dependency order: (1) pure rules engine with full test coverage, (2) setup + role reveal + handoff flow, (3) proposal→vote→mission loop, (4) win conditions + game-over, (5) localStorage persistence/resume. Build and test the engine before the UI.
