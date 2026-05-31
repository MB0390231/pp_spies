# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is currently a **design spec only** — `README.md` (the northstar) and `.gitignore` are the only tracked files. No code, `package.json`, or build tooling exists yet. The README describes the intended app in full; building it means scaffolding from scratch to match that spec. The commands and structure below are the *target*, not yet present.

## What this is

**Spies — Pass & Play**: a single-device, pass-and-play hidden-role social deduction game (a *Resistance* clone). One phone is shared around 5–10 players. It is a **client-only SPA with no backend, no database, and no network calls** after load — secrecy comes from pass-the-phone handoff screens, not from the network.

## Intended stack & commands (target)

React + TypeScript + Vite + Tailwind, persisted to `localStorage`. Once scaffolded:

```bash
npm install
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # static output to dist/
npm run preview      # serve the production build

npm run lint         # ESLint
npm run type-check   # TypeScript (tsc --noEmit)
npm test             # engine unit tests
```

When adding the test runner, prefer Vitest (Vite-native). The single-test invocation depends on the runner chosen — with Vitest it is `npx vitest run <path>` or `npx vitest -t "<name>"`.

## Architecture

The core idea: the game rules are a body of **pure, deterministic functions** made trustworthy by tests rather than a server. Two layers must stay separated:

- **`src/engine/`** — the heart of the app. Framework-agnostic pure functions, **no React imports**. `(state, action) → nextState`. This is `rules.ts` (spy counts, team sizes, win conditions, the Round-4 rule), `reducer.ts` (the reducer), and `types.ts` (Game/Player/Round/Phase types). Keep this importable and unit-testable in isolation; this is where the most valuable tests live.
- **`src/state/`** — React context/provider wrapping the reducer + `localStorage` persistence. Persist the full game state after **every** action so a refresh or screen-lock resumes mid-game.
- **`src/screens/`** — one component per game phase, plus handoff interstitials.
- **`src/components/`** — shared UI, notably the reusable `PassPhoneGate`.

### Two invariants that are easy to get wrong

1. **Handoff gating for secrecy.** Every private view (role reveal, voting, mission card play) must render *behind* a `PassPhoneGate` — a "Pass the phone to [name]" screen that the named player taps to confirm. Nothing private should render until that confirmation. Public moments (team proposal, vote reveal, mission outcome, game over) are shown openly.
2. **Anonymous reveals.** Votes and mission cards must be **shuffled before display** so card/reveal order never leaks who played what.

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

**Round flow:** Team Proposal (public) → Vote (private per player → public one-by-one reveal; majority approve proceeds, reject rotates leader, 5 consecutive rejects = Spies win) → Mission (private per team member → shuffled public reveal; Resistance is locked to Succeed, Spies may Fail).

**State machine:** SETUP → ROLE REVEAL → loop[ TEAM PROPOSAL → VOTE → (approved → MISSION → check win) | (rejected → rotate leader) ] → GAME OVER.

## Build order (from the README roadmap)

Phase 1 MVP, in dependency order: (1) pure rules engine with full test coverage, (2) setup + role reveal + handoff flow, (3) proposal→vote→mission loop, (4) win conditions + game-over, (5) localStorage persistence/resume. Build and test the engine before the UI.
